'use strict';

const meta = require('../meta');
const emailer = require('../emailer');
const user = require('../user');
const db = require('../database');
const winston = require('winston');

// Config — adjust to taste
const DEFAULT_HOUR_UTC = 13; // 13:00 UTC ~ 9:00 AM New York (EST/EDT varies)
const BATCH = 500;           // process users in chunks

let intervalHandle;

async function init() {
  // Tick every minute; run specific tasks when their minute rolls around
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = setInterval(tick, 60 * 1000);
  winston.info('[digest] scheduler started (1m cadence)');
}

async function tick() {
  try {
    const now = new Date();
    const minute = now.getUTCMinutes();
    const hour = now.getUTCHours();

    // Always show a heartbeat
    winston.info(`[digest] tick fired: ${hour}:${minute.toString().padStart(2, '0')} UTC`);

    // NodeBB ACP uses a "Disable email digests" checkbox. Treat "unchecked" as enabled.
    const digestsDisabled =
      meta.config.disableEmailDigests === true ||
      meta.config.disableEmailDigests === '1' ||
      meta.config.disableEmailDigests === 1;

    if (digestsDisabled) {
      winston.info('[digest] disabled via ACP (Disable email digests is ON); skipping run');
      return;
    }

    // NodeBB ACP "Digest Hour" — try common keys, fall back to your default
    const targetHour = Number(
      meta.config.digestHour ??            // many installs
      meta.config.emailDigestHour ??       // some themes/plugins
      meta.config.dailyDigestHourUtc ??    // your earlier custom
      DEFAULT_HOUR_UTC
    );

    if (minute !== 0 || hour !== targetHour) {
      winston.info(`[digest] not scheduled to run (targetHour=${targetHour})`);
      return;
    }

    await runForFrequency('daily',   true);                // every day at targetHour
    await runForFrequency('weekly',  now.getUTCDay() === 1);   // Monday
    await runForFrequency('monthly', now.getUTCDate() === 1);  // 1st of month
  } catch (err) {
    winston.error(`[digest] tick error: ${err.stack}`);
  }
}


function shouldRunDaily(/*now*/) {
  return true; // every day at targetHour
}
function shouldRunWeekly(now, weekday0Mon = 1) {
  // JS getUTCDay(): 0=Sun, 1=Mon,...
  return now.getUTCDay() === weekday0Mon;
}
function shouldRunMonthly(now) {
  return now.getUTCDate() === 1;
}

async function runForFrequency(freq, shouldRun) {
  if (!shouldRun) return;
  winston.info(`[digest] running ${freq} job`);

  // Iterate users in batches from the main index
  let start = 0;
  while (true) {
    // Pull UIDs by join date to cover all users without loading all at once
    const uids = await db.getSortedSetRange('users:joindate', start, start + BATCH - 1);
    if (!uids || !uids.length) break;
    await processBatch(uids.map(String), freq);
    start += BATCH;
  }
}

async function processBatch(uids, freq) {
  // Fetch the settings we need
  const settingsByUid = await user.getMultipleUserSettings(uids);
  const fields = await user.getUsersFields(uids, ['email', 'username', 'uid', 'digest:lastSentAt', 'digest:lastSentFreq']);

  // Build worklist
  const work = [];
  for (let i = 0; i < uids.length; i += 1) {
    const uid = uids[i];
    const s = settingsByUid[uid] || {};
    const f = fields[i] || {};
    const chosen = (s['digest.frequency'] || 'off').toLowerCase();
    if (chosen !== freq) continue;            // only this frequency
    if (!f.email) continue;                   // no email, skip
    if (!needsSendNow(f, freq)) continue;     // already sent recently
    work.push({ uid, email: f.email, username: f.username });
  }

  // Send (sequentially or with small concurrency)
  for (const item of work) {
    await sendDigest(item.uid, item.email, item.username, freq).catch(err => {
      winston.warn(`[digest] send failed uid=${item.uid}: ${err.message}`);
    });
  }
}

function needsSendNow(userFields, freq) {
  const lastFreq = userFields['digest:lastSentFreq'];
  const lastAt = Number(userFields['digest:lastSentAt'] || 0);
  const now = Date.now();

  if (!lastAt) return true;
  const day = 24 * 60 * 60 * 1000;

  if (freq === 'daily') {
    return now - lastAt >= day - 30 * 1000; // ~24h guard
  }
  if (freq === 'weekly') {
    return now - lastAt >= 7 * day - 30 * 1000;
  }
  if (freq === 'monthly') {
    // crude month fence: 28 days minimum; good enough for a starter
    return now - lastAt >= 28 * day - 30 * 1000;
  }
  return false;
}

async function sendDigest(uid, email, username, freq) {
  // 1) Compose your digest content (threads, new topics, notifications, etc.)
  const { subject, html, plaintext } = await buildDigest(uid, username, freq);

  // 2) Send
  await emailer.send('digest', uid, {
    to: email,
    subject,
    html,
    plaintext,
  });

  // 3) Mark as sent
  await user.setUserFields(uid, {
    'digest:lastSentAt': Date.now(),
    'digest:lastSentFreq': freq,
  });

  winston.verbose(`[digest] sent ${freq} to uid=${uid}`);
}

// Dummy content — replace with real aggregation
async function buildDigest(uid, username, freq) {
  const subject = `[${freq.toUpperCase()}] Your forum digest`;
  const plaintext = `Hi ${username},\n\nHere is your ${freq} digest.\n\n– The Team`;
  const html = `<p>Hi ${username},</p><p>Here is your <strong>${freq}</strong> digest.</p><p>– The Team</p>`;
  return { subject, html, plaintext };
}

module.exports = { init };

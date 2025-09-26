'use strict';

const meta = require.main.require('./src/meta');
const db = require.main.require('./src/database');
const plugin = {};

plugin.init = async function () {
  console.log('[Anonymous Button] plugin initialized');
};

plugin.addComposerButton = function (payload, callback) {
  payload.options.push({
    name: 'AnonButton',
    className: 'fa fa-user-secret',
    title: 'Anonymous'
  });
  callback(null, payload);
};

plugin.populatePostData = function (postData, callback) {
    try {
        // If is_anonymous hasn't been set yet
        if (typeof postData.is_anonymous === 'undefined') {
            // Try reading from composer DOM if available
            const composer = postData.composer; 
            if (composer && composer.find) {
                const $hidden = composer.find('input[name="is_anonymous"]');
                if ($hidden.length) {
                    postData.is_anonymous = $hidden.val() === 'true';
                    console.log('[Anonymous Button] populatePostData is_anonymous =', postData.is_anonymous);
                }
            } else if (postData.data && typeof postData.data.is_anonymous !== 'undefined') {
                // fallback for tests or API calls
                postData.is_anonymous = postData.data.is_anonymous === 'true';
            }
        }
    } catch (err) {
        console.warn('[Anonymous Button] failed to populate postData', err);
    }

    callback(null, postData); // always call callback
};

plugin.addAnonymousFlag = async function (postData) {
  const isAnon = postData.is_anonymous === true || postData.is_anonymous === 'true';
  
  await db.setObjectField(`post:${postData.post.pid}`, 'is_anonymous', isAnon);
  
  postData.post.is_anonymous = isAnon;

  console.log(`[Anonymous] Post ${postData.post.pid}: is_anonymous = ${isAnon}`);
  return postData;
};

plugin.addConfig = async function (config) {
  let allow = await meta.settings.getOne('nodebb-plugin-anonymous-button', 'allow_anonymous');
  config.allow_anonymous = allow === '1' || allow === 'true' || allow === true;
  return config;
};

module.exports = plugin;














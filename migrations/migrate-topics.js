'use strict';

const Redis = require('ioredis');
const config = require('../config.json'); // load config dynamically

const redis = new Redis(config.redis);

async function migrateTopics(limit = null) {
	try {
		// Get all topic IDs
		const tids = await redis.zrange('topics:tid', 0, -1);
		const slice = limit ? tids.slice(0, limit) : tids;
		console.log(`Found ${tids.length} topics. Migrating ${slice.length}...`);

		// Prepare all updates as promises
		const updates = slice.map(async (tid) => {
			const key = `topic:${tid}`;
			const topic = await redis.hgetall(key);

			const changes = {};

			// Add or fix allow_anonymous
			if (!('allow_anonymous' in topic)) {
				changes['allow_anonymous'] = true; // default true
			} else if (topic.allow_anonymous !== 'true' && topic.allow_anonymous !== 'false') {
				changes['allow_anonymous'] = topic.allow_anonymous === true ? true : false;
			}

			// Add or fix is_anonymous
			if (!('is_anonymous' in topic)) {
				changes['is_anonymous'] = false; // default false
			} else if (topic.is_anonymous !== 'true' && topic.is_anonymous !== 'false') {
				changes['is_anonymous'] = topic.is_anonymous === true ? true : false;
			}

			if (Object.keys(changes).length > 0) {
				await redis.hset(key, changes);
				return 1;
			}
			return 0;
		});

		const results = await Promise.all(updates);
		const updatedCount = results.reduce((acc, val) => acc + val, 0);

		console.log(`Migration complete. Updated ${updatedCount} topics.`);
		await redis.disconnect();
	} catch (err) {
		console.error('Migration failed:', err);
		await redis.disconnect();
	}
}

// Remove the argument to migrate all topics
migrateTopics();



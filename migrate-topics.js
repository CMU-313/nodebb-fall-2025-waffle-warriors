'use strict';

const Redis = require('ioredis');

// Connect to NodeBB Redis
const redis = new Redis({
	host: '127.0.0.1',
	port: 6379,
	db: 0, 
	password: '',
});

async function migrateTopics(limit = null) {
	try {
		// Get all topic IDs
		const tids = await redis.zrange('topics:tid', 0, -1);
		const slice = limit ? tids.slice(0, limit) : tids;
		console.log(`Found ${tids.length} topics. Migrating ${slice.length}...`);

		let updatedCount = 0;

		for (const tid of slice) {
			const key = `topic:${tid}`;
			const topic = await redis.hgetall(key);

			if (!('allow_anonymous' in topic)) {
				await redis.hset(key, 'allow_anonymous', true); // default true
				updatedCount += 1;
			}
		}

		console.log(`Migration complete. Updated ${updatedCount} topics.`);
		await redis.disconnect();
	} catch (err) {
		console.error('Migration failed:', err);
		await redis.disconnect();
	}
}

// Remove the argument to migrate all topics
migrateTopics();

'use strict';

const Redis = require('ioredis');

const redis = new Redis({ 
	host: '127.0.0.1',
	port: 6379,
	db: 0,
	password: '',
});

async function migrateAnonymousFields(limit = null) {
	try {
		const pids = await redis.zrange('posts:pid', 0, -1);
		const slice = limit ? pids.slice(0, limit) : pids;
		console.log(`Found ${pids.length} posts. Migrating ${slice.length}...`);

		let updatedCount = 0;

		for (const pid of slice) {
			const key = `post:${pid}`;
			const post = await redis.hgetall(key);

			// Migrate is_anonymous
			if (!post.hasOwnProperty('is_anonymous')) {
				await redis.hset(key, 'is_anonymous', '0'); // default false
				updatedCount = updatedCount + 1;
			} else {
				const boolVal = post.is_anonymous === '1' || post.is_anonymous === 'true';
				const currentVal = boolVal ? '1' : '0';
				if (post.is_anonymous !== currentVal) {
					await redis.hset(key, 'is_anonymous', currentVal);
					updatedCount = updatedCount + 1;
				}
			}

			// Optional: only migrate allow_anonymous for topics, not posts
		}

		console.log(`Migration complete. Updated ${updatedCount} fields in ${slice.length} posts.`);
	} catch (err) {
		console.error('Migration failed:', err);
	} finally {
		await redis.disconnect();
	}
}

migrateAnonymousFields();


'use strict';

const Redis = require('ioredis');
const config = require('../config.json');

const redis = new Redis(config.redis);

async function migrateAnonymousFields(limit = null) {
    try {
        const tids = await redis.zrange('topics:tid', 0, -1);
        const slice = limit ? tids.slice(0, limit) : tids;
        console.log(`Found ${tids.length} topics. Migrating ${slice.length}...`);

        let updatedCount = 0;

        for (const tid of slice) {
            const topicKey = `topic:${tid}`;
            const topic = await redis.hgetall(topicKey);
            if (!topic) continue;

            // Normalize is_anonymous to boolean
            const isAnonymous = topic.is_anonymous === 'true' || topic.is_anonymous === true;

            // Update topic
            await redis.hset(topicKey, 'is_anonymous', isAnonymous ? 'true' : 'false');
            await redis.hdel(topicKey, 'allow_anonymous');
            updatedCount++;

            // Update all posts under this topic
            const postPids = await redis.zrange(`tid:${tid}:posts`, 0, -1);
            // Include mainPid if it exists and not in zrange
            if (topic.mainPid && !postPids.includes(topic.mainPid)) {
                postPids.unshift(topic.mainPid);
            }

            for (const pid of postPids) {
                const postKey = `post:${pid}`;
                const post = await redis.hgetall(postKey);
                if (!post) continue;

                await redis.hset(postKey, 'is_anonymous', isAnonymous ? 'true' : 'false');
                await redis.hdel(postKey, 'allow_anonymous');
                updatedCount++;
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} fields in ${slice.length} topics and their posts.`);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        redis.disconnect();
    }
}

migrateAnonymousFields();




'use strict';

const Redis = require('ioredis');
const config = require('../config.json'); // load config dynamically

const redis = new Redis(config.redis);

function migrateAnonymousFields(limit = null) {
    redis.zrange('posts:pid', 0, -1)
        .then((pids) => {
            const slice = limit ? pids.slice(0, limit) : pids;
            console.log(`Found ${pids.length} posts. Migrating ${slice.length}...`);

            const promises = slice.map((pid) => {
                const key = `post:${pid}`;
                return redis.hgetall(key).then((post) => {
                    if (!post.hasOwnProperty('is_anonymous')) {
                        return redis.hset(key, 'is_anonymous', false).then(() => 1);
                    }

                    const boolVal = post.is_anonymous === '1' || post.is_anonymous === 'true' || post.is_anonymous === true;
                    if (post.is_anonymous !== boolVal) {
                        return redis.hset(key, 'is_anonymous', boolVal).then(() => 1);
                    }

                    return 0;
                });
            });

            return Promise.all(promises).then((results) => {
                const updatedCount = results.reduce((acc, val) => acc + val, 0);
                console.log(`Migration complete. Updated ${updatedCount} fields in ${slice.length} posts.`);
            });
        })
        .catch((err) => {
            console.error('Migration failed:', err);
        })
        .finally(() => {
            redis.disconnect();
        });
}

migrateAnonymousFields();



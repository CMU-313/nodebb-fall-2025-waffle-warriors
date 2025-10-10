// testing file written by ChatGPT based on the requirements provided
'use strict';

const assert = require('assert');

const db = require.main.require('./src/database');
const Topics = require.main.require('./src/topics');
const groups = require.main.require('./src/groups');
const user = require.main.require('./src/user');
const categories = require.main.require('./src/categories');

describe('Anonymous Topic Feature', function () {
	this.timeout(60000); // Increase timeout for NodeBB operations

	let adminUid;
	let userUid;
	let cid;
	let tid;

	before(async () => {
		[adminUid, userUid] = await Promise.all([
			user.create({ username: 'test-admin' }),
			user.create({ username: 'test-user' }),
		]);
		await groups.join('administrators', adminUid);
		const categoryData = await categories.create({ name: 'Test Category', description: 'For testing' });
		cid = categoryData.cid;
	});

	afterEach(async () => {
		if (tid) {
			await Topics.purge(tid, adminUid);
			tid = null;
		}
	});

	describe('Permissions & Validation', () => {
		it('should allow an administrator to create a new anonymous topic', async () => {
			const topicData = await Topics.post({
				uid: adminUid,
				cid: cid,
				title: 'Admin Anonymous Topic',
				content: 'Content Content',
				tags: ['anonymous'],
			});
			tid = topicData.topicData.tid;
			assert.ok(tid);

			const topic = await Topics.getTopicData(tid);
			assert.strictEqual(topic.is_anonymous, true);
		});

		it('should PREVENT a regular user from creating a new anonymous topic', async () => {
			await assert.rejects(
				Topics.post({
					uid: userUid,
					cid: cid,
					title: 'User Anonymous Topic',
					content: 'Content Content',
					tags: ['anonymous'],
				}),
				{ message: '[[error:no-privileges]]' }
			);
		});

		it('should block invalid tag variations like "anon" or "anonymous-1"', async () => {
			await assert.rejects(
				Topics.post({ uid: adminUid, cid, title: 'Invalid Tag Topic 1', content: 'Content', tags: ['anon'] }),
				{ message: '[[error:invalid-tag, anon]]' }
			);

			await assert.rejects(
				Topics.post({ uid: adminUid, cid, title: 'Invalid Tag Topic 2', content: 'Content', tags: ['anonymous-1'] }),
				{ message: '[[error:invalid-tag, anonymous-1]]' }
			);
		});
	});

	describe('Display Logic', () => {
		it('should display unique anonymous names for different users in a topic', async () => {
			const topicData = await Topics.post({ uid: adminUid, cid, title: 'Unique Names Test', content: 'Test Post 1', tags: ['anonymous'] });
			tid = topicData.topicData.tid;

			await Topics.reply({ uid: userUid, tid, content: 'Test Post 2' });
			await Topics.reply({ uid: adminUid, tid, content: 'Test Post 3' });

			const topicWithPosts = await Topics.getTopicWithPosts(
				await Topics.getTopicData(tid),
				`tid:${tid}:posts`,
				adminUid,
				0, -1, false
			);
			const posts = topicWithPosts.posts;

			assert.strictEqual(posts.length, 3);
			assert.strictEqual(posts[0].user.username, 'anon_person');
			assert.strictEqual(posts[1].user.username, 'anon_person_1');
			assert.strictEqual(posts[2].user.username, 'anon_person');
		});

		it('should display topic starter as "anon_person" and a different post author as "anon_person_1"', async () => {
			const topicData = await Topics.post({ uid: adminUid, cid, title: 'Teaser Test', content: 'Test Post 1', tags: ['anonymous'] });
			tid = topicData.topicData.tid;

			await Topics.reply({ uid: userUid, tid, content: 'Post 2 is the new reply' });

			const topicWithPosts = await Topics.getTopicWithPosts(
				await Topics.getTopicData(tid),
				`tid:${tid}:posts`,
				adminUid,
				0, -1, false
			);
			const posts = topicWithPosts.posts;

			assert.strictEqual(posts.length, 2);
			assert.strictEqual(posts[0].user.username, 'anon_person');
			assert.strictEqual(posts[1].user.username, 'anon_person_1');
		});
	});

	describe('State Reversion', () => {
		it('should revert to real user identities after the "anonymous" tag is removed', async () => {
			const topicData = await Topics.post({ uid: adminUid, cid, title: 'Reversion Test', content: 'Content Content', tags: ['anonymous'] });
			tid = topicData.topicData.tid;

			let topics = await Topics.getTopicsByTids([tid], adminUid);
			assert.strictEqual(topics[0].user.username, 'anon_person');

			await Topics.updateTopicTags(tid, []);

			topics = await Topics.getTopicsByTids([tid], adminUid);
			assert.strictEqual(topics[0].user.username, 'test-admin');
			assert.strictEqual(topics[0].is_anonymous, false);
		});
	});

	after(async () => {
		try {
			if (cid) await categories.purge(cid);
			await Promise.allSettled([
				adminUid ? user.delete(adminUid) : null,
				userUid ? user.delete(userUid) : null,
			]);
		} catch (err) {
			console.error('Cleanup failed:', err);
		}
	});
});

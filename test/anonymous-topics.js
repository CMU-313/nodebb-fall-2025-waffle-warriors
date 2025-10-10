// testing file written by ChatGPT based on the requirements provided
const assert = require('assert');
const should = require('should');

const db = require.main.require('./src/database');
const Topics = require.main.require('./src/topics');
const groups = require.main.require('./src/groups');
const user = require.main.require('./src/user');
const categories = require.main.require('./src/categories');

describe('Anonymous Topic Feature', () => {
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
			should.exist(tid);
			const topic = await Topics.getTopicData(tid);
			topic.is_anonymous.should.be.true();
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
				Topics.post({
					uid: adminUid,
					cid: cid,
					title: 'Invalid Tag Topic 1',
					content: 'Content Content',
					tags: ['anon'],
				}),
				{ message: '[[error:invalid-tag, anon]]' }
			);

			await assert.rejects(
				Topics.post({
					uid: adminUid,
					cid: cid,
					title: 'Invalid Tag Topic 2',
					content: 'Content Content',
					tags: ['anonymous-1'],
				}),
				{ message: '[[error:invalid-tag, anonymous-1]]' }
			);
		});
	});

	describe('Display Logic', () => {
		it('should display unique anonymous names for different users in a topic', async () => {
			const topicData = await Topics.post({
				uid: adminUid,
				cid: cid,
				title: 'Unique Names Test',
				content: 'Test Post 1',
				tags: ['anonymous'],
			});
			tid = topicData.topicData.tid;

			// Create replies
			await Topics.reply({ uid: userUid, tid: tid, content: 'Test Post 2' });
			await Topics.reply({ uid: adminUid, tid: tid, content: 'Test Post 3' });

			// Fetch topic with posts
			const fullTopicData = await Topics.getTopicData(tid);
			const topicWithPosts = await Topics.getTopicWithPosts(fullTopicData, `tid:${tid}:posts`, adminUid, 0, -1, false);
			const loadedPosts = topicWithPosts.posts;

			loadedPosts.should.have.length(3);
			loadedPosts[0].user.username.should.equal('anon_person'); // topic starter
			loadedPosts[1].user.username.should.equal('anon_person_1'); // first reply by different user
			loadedPosts[2].user.username.should.equal('anon_person'); // reply by original topic starter
		});

		it('should display the topic starter as "anon_person" and a different post author as "anon_person_1"', async () => {
			const topicData = await Topics.post({
				uid: adminUid,
				cid: cid,
				title: 'Teaser Test',
				content: 'Test Post 1',
				tags: ['anonymous'],
			});
			tid = topicData.topicData.tid;

			// Create a reply
			await Topics.reply({
				uid: userUid,
				tid: tid,
				content: 'Post 2 is the new reply',
			});

			// Fetch topic with posts
			const fullTopicData = await Topics.getTopicData(tid);
			const topicWithPosts = await Topics.getTopicWithPosts(fullTopicData, `tid:${tid}:posts`, adminUid, 0, -1, false);
			const loadedPosts = topicWithPosts.posts;

			loadedPosts.should.have.length(2); // main post + reply
			loadedPosts[0].user.username.should.equal('anon_person'); // topic starter
			loadedPosts[1].user.username.should.equal('anon_person_1'); // reply by second user
		});
	});


	describe('State Reversion', () => {
		it('should revert to real user identities after the "anonymous" tag is removed', async () => {
			// 1. Create an anonymous topic
			const topicData = await Topics.post({ uid: adminUid, cid: cid, title: 'Reversion Test', content: 'Content Content', tags: ['anonymous'] });
			tid = topicData.topicData.tid;

			// 2. Verify it's anonymous on the topic list
			let topics = await Topics.getTopicsByTids([tid], adminUid);
			topics[0].user.username.should.equal('anon_person');

			// 3. Remove the anonymous tag
			await Topics.updateTopicTags(tid, []);

			// 4. Fetch the topic list again and verify it has reverted
			topics = await Topics.getTopicsByTids([tid], adminUid);
			topics[0].user.username.should.equal('test-admin');
			topics[0].is_anonymous.should.be.false();
		});
	});

	after(async () => {
		try {
			if (cid) {
				await categories.purge(cid);
			}

			// Clean up users only if they exist and aren’t already being deleted
			await Promise.allSettled([
				adminUid ? user.delete(adminUid) : null,
				userUid ? user.delete(userUid) : null,
			]);
		} catch (err) {
			console.error('Cleanup failed:', err);
		}
	});

});
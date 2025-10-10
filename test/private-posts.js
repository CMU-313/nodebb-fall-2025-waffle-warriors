'use strict';

const assert = require('assert');
const db = require('./mocks/databasemock');
const topics = require('../src/topics');
const categories = require('../src/categories');
const privileges = require('../src/privileges');
const user = require('../src/user');
const groups = require('../src/groups');

describe('Private Posts Feature Tests', () => {
	describe('Private Topic Creation', () => {
		let privateTopicId;
		let publicTopicId;
		let regularUserId;
		let adminUserId;
		let categoryId;

		before(async () => {
			// Create test users
			regularUserId = await user.create({ username: 'regularuser', password: 'password' });
			adminUserId = await user.create({ username: 'adminuser', password: 'password' });

			// Make admin user an administrator
			await groups.join('administrators', adminUserId);

			// Create test category
			categoryId = await categories.create({
				name: 'Test Category for Private Posts',
				description: 'Category for testing private post functionality',
			});
		});

		it('should create a private topic with isPrivate=1', async () => {
			const topicData = {
				uid: regularUserId,
				cid: categoryId,
				title: 'Private Topic Test',
				content: 'This is a private topic',
				tags: ['private', 'test'],
				isPrivate: 1,
			};

			privateTopicId = await topics.create(topicData);
			assert.ok(privateTopicId, 'Private topic should be created successfully');

			// Verify the topic is marked as private
			const topic = await topics.getTopicData(privateTopicId);
			// Redis stores numeric values as numbers
			assert.strictEqual(topic.isPrivate, 1, 'Topic should be marked as private as number');
		});

		it('should create a public topic with isPrivate=0', async () => {
			const topicData = {
				uid: regularUserId,
				cid: categoryId,
				title: 'Public Topic Test',
				content: 'This is a public topic',
				tags: ['public', 'test'],
				isPrivate: 0,
			};

			publicTopicId = await topics.create(topicData);
			assert.ok(publicTopicId, 'Public topic should be created successfully');

			// Verify the topic is marked as public
			const topic = await topics.getTopicData(publicTopicId);
			// Redis stores numeric values as numbers
			assert.strictEqual(topic.isPrivate, 0, 'Topic should be marked as public as number');
		});

		it('should handle string isPrivate values correctly', async () => {
			const topicData = {
				uid: regularUserId,
				cid: categoryId,
				title: 'String Private Topic Test',
				content: 'This topic uses string value for isPrivate',
				isPrivate: '1',
			};

			const stringPrivateTopicId = await topics.create(topicData);
			assert.ok(stringPrivateTopicId, 'String private topic should be created successfully');

			const topic = await topics.getTopicData(stringPrivateTopicId);
			// Redis converts string numbers to actual numbers, so we expect 1
			assert.strictEqual(topic.isPrivate, 1, 'Topic should store string isPrivate value as number 1');
		});
	});

	describe('Private Topic Access Control', () => {
		let privateTopicId;
		let publicTopicId;
		let ownerUserId;
		let regularUserId;
		let adminUserId;
		let categoryId;

		before(async () => {
			// Create test users
			ownerUserId = await user.create({ username: 'topicowner', password: 'password' });
			regularUserId = await user.create({ username: 'regularuser2', password: 'password' });
			adminUserId = await user.create({ username: 'adminuser2', password: 'password' });

			// Make admin user an administrator
			await groups.join('administrators', adminUserId);

			// Create test category
			categoryId = await categories.create({
				name: 'Test Category for Access Control',
				description: 'Category for testing access control',
			});

			// Create private topic
			privateTopicId = await topics.create({
				uid: ownerUserId,
				cid: categoryId,
				title: 'Private Topic Access Test',
				content: 'This is a private topic for access testing',
				isPrivate: 1,
			});

			// Create public topic
			publicTopicId = await topics.create({
				uid: ownerUserId,
				cid: categoryId,
				title: 'Public Topic Access Test',
				content: 'This is a public topic for access testing',
				isPrivate: 0,
			});
		});

		it('should allow topic owner to read private topic', async () => {
			const topicData = await topics.getTopicFields(privateTopicId, ['tid', 'cid', 'isPrivate', 'uid']);
			const canRead = await privileges.topics.canViewPrivate(topicData, ownerUserId);
			assert.strictEqual(canRead, true, 'Topic owner should be able to read private topic');
		});

		it('should allow admin to read private topic', async () => {
			const topicData = await topics.getTopicFields(privateTopicId, ['tid', 'cid', 'isPrivate', 'uid']);
			const canRead = await privileges.topics.canViewPrivate(topicData, adminUserId);
			assert.strictEqual(canRead, true, 'Admin should be able to read private topic');
		});

		it('should not allow regular user to read private topic', async () => {
			const topicData = await topics.getTopicFields(privateTopicId, ['tid', 'cid', 'isPrivate', 'uid']);
			const canRead = await privileges.topics.canViewPrivate(topicData, regularUserId);
			assert.strictEqual(canRead, false, 'Regular user should not be able to read private topic');
		});

		it('should not allow guest to read private topic', async () => {
			const topicData = await topics.getTopicFields(privateTopicId, ['tid', 'cid', 'isPrivate', 'uid']);
			const canRead = await privileges.topics.canViewPrivate(topicData, 0);
			assert.strictEqual(canRead, false, 'Guest should not be able to read private topic');
		});

		it('should allow everyone to view public topic using canViewPrivate', async () => {
			const publicTopicData = await topics.getTopicFields(publicTopicId, ['tid', 'cid', 'isPrivate', 'uid']);

			const ownerCanView = await privileges.topics.canViewPrivate(publicTopicData, ownerUserId);
			const regularCanView = await privileges.topics.canViewPrivate(publicTopicData, regularUserId);
			const adminCanView = await privileges.topics.canViewPrivate(publicTopicData, adminUserId);
			const guestCanView = await privileges.topics.canViewPrivate(publicTopicData, 0);

			assert.strictEqual(ownerCanView, true, 'Owner should be able to view public topic');
			assert.strictEqual(regularCanView, true, 'Regular user should be able to view public topic');
			assert.strictEqual(adminCanView, true, 'Admin should be able to view public topic');
			assert.strictEqual(guestCanView, true, 'Guest should be able to view public topic');
		});
	});

	describe('Private Topic Edge Cases', () => {
		let categoryId;

		before(async () => {
			// Create test category
			categoryId = await categories.create({
				name: 'Test Category for Edge Cases',
				description: 'Category for testing edge cases',
			});
		});

		it('should handle undefined isPrivate as false', async () => {
			const userId = await user.create({ username: 'edgeuser1', password: 'password' });

			const topicData = {
				uid: userId,
				cid: categoryId,
				title: 'Edge Case Undefined Test',
				content: 'This topic has undefined isPrivate',
				// isPrivate is undefined
			};

			const topicId = await topics.create(topicData);
			const topic = await topics.getTopicData(topicId);

			assert.strictEqual(topic.isPrivate, 0, 'Undefined isPrivate should be treated as false');
		});

		it('should handle null isPrivate as false', async () => {
			const userId = await user.create({ username: 'edgeuser2', password: 'password' });

			const topicData = {
				uid: userId,
				cid: categoryId,
				title: 'Edge Case Null Test',
				content: 'This topic has null isPrivate',
				isPrivate: null,
			};

			const topicId = await topics.create(topicData);
			const topic = await topics.getTopicData(topicId);

			assert.strictEqual(topic.isPrivate, 0, 'Null isPrivate should be treated as false');
		});

		it('should handle empty string isPrivate as false', async () => {
			const userId = await user.create({ username: 'edgeuser3', password: 'password' });

			const topicData = {
				uid: userId,
				cid: categoryId,
				title: 'Edge Case Empty String Test',
				content: 'This topic has empty string isPrivate',
				isPrivate: '',
			};

			const topicId = await topics.create(topicData);
			const topic = await topics.getTopicData(topicId);

			assert.strictEqual(topic.isPrivate, 0, 'Empty string isPrivate should be treated as false');
		});

		it('should handle boolean true isPrivate correctly', async () => {
			const userId = await user.create({ username: 'edgeuser4', password: 'password' });

			const topicData = {
				uid: userId,
				cid: categoryId,
				title: 'Edge Case Boolean True Test',
				content: 'This topic has boolean true isPrivate',
				isPrivate: true,
			};

			const topicId = await topics.create(topicData);
			const topic = await topics.getTopicData(topicId);

			assert.strictEqual(topic.isPrivate, 1, 'Boolean true isPrivate should be treated as true');
		});

		it('should handle boolean false isPrivate correctly', async () => {
			const userId = await user.create({ username: 'edgeuser5', password: 'password' });

			const topicData = {
				uid: userId,
				cid: categoryId,
				title: 'Edge Case Boolean False Test',
				content: 'This topic has boolean false isPrivate',
				isPrivate: false,
			};

			const topicId = await topics.create(topicData);
			const topic = await topics.getTopicData(topicId);

			assert.strictEqual(topic.isPrivate, 0, 'Boolean false isPrivate should be treated as false');
		});
	});

	describe('Private Topic Database Integration', () => {
		let categoryId;

		before(async () => {
			// Create test category
			categoryId = await categories.create({
				name: 'Test Category for DB Integration',
				description: 'Category for testing database integration',
			});
		});

		it('should store isPrivate field in database correctly', async () => {
			const userId = await user.create({ username: 'dbtestuser', password: 'password' });
			const topicId = await topics.create({
				uid: userId,
				cid: categoryId,
				title: 'DB Test Topic',
				content: 'Testing database storage',
				isPrivate: 1,
			});

			const topicData = await db.getObject(`topic:${topicId}`);
			// Redis stores values as strings in the raw database
			assert.strictEqual(topicData.isPrivate, '1', 'isPrivate should be stored as string "1" in database');
		});

		it('should not add private topics to public sorted sets', async () => {
			const userId = await user.create({ username: 'dbtestuser2', password: 'password' });
			const topicId = await topics.create({
				uid: userId,
				cid: categoryId,
				title: 'Sorted Set Test Topic',
				content: 'Testing sorted sets',
				isPrivate: 1,
			});

			// Check if private topic is in the public recent sorted set
			const isPrivateInRecentSet = await db.isSortedSetMember(`cid:${categoryId}:tids`, topicId);
			assert.strictEqual(isPrivateInRecentSet, false, 'Private topic should not be in public recent sorted set');
		});

		it('should not add private topics to vote sorted sets', async () => {
			const userId = await user.create({ username: 'dbtestuser3', password: 'password' });
			const topicId = await topics.create({
				uid: userId,
				cid: categoryId,
				title: 'Vote Set Test Topic',
				content: 'Testing vote sorted sets',
				isPrivate: 1,
			});

			// Check if private topic is in the public vote sorted set
			const isPrivateInVoteSet = await db.isSortedSetMember(`cid:${categoryId}:tids:votes`, topicId);
			assert.strictEqual(isPrivateInVoteSet, false, 'Private topic should not be in public vote sorted set');
		});
	});
});
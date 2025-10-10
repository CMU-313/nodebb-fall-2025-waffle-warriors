'use strict';

const db = require('../database');
const user = require('../user');

const Polls = module.exports;

Polls.create = async function (data) {
	const pollId = await db.incrObjectField('global', 'nextPollId');
	const timestamp = Date.now();
	
	const pollData = {
		pollId: pollId,
		title: data.title,
		description: data.description || '',
		uid: data.uid,
		timestamp: timestamp,
		multipleChoice: false,
		anonymous: false,
		status: 'active',
	};
	
	await db.setObject(`poll:${pollId}`, pollData);
	await db.sortedSetAdd('polls:created', timestamp, pollId);
	await db.sortedSetAdd(`uid:${data.uid}:polls`, timestamp, pollId);
	
	// Add poll options
	if (data.options && Array.isArray(data.options)) {
		const optionPromises = data.options.map(async (optionText, i) => {
			const optionData = {
				optionId: i,
				text: optionText,
				votes: 0,
			};
			await db.setObject(`poll:${pollId}:option:${i}`, optionData);
			await db.listAppend(`poll:${pollId}:options`, i);
		});
		await Promise.all(optionPromises);
	}
	
	return pollId;
};

Polls.get = async function (pollId) {
	const pollData = await db.getObject(`poll:${pollId}`);
	if (!pollData) {
		throw new Error('[[error:no-poll]]');
	}
	
	const optionIds = await db.getListRange(`poll:${pollId}:options`, 0, -1);
	const optionsPromises = optionIds.map(optionId => db.getObject(`poll:${pollId}:option:${optionId}`));
	const optionObjects = await Promise.all(optionsPromises);
	const options = optionObjects.filter(option => option);
	
	pollData.options = options;
	pollData.totalVotes = options.reduce((sum, option) => sum + parseInt(option.votes || 0, 10), 0);
	
	return pollData;
};

Polls.vote = async function (pollId, uid, optionIds) {
	if (!Array.isArray(optionIds)) {
		optionIds = [optionIds];
	}
	
	const pollData = await Polls.get(pollId);
	if (!pollData) {
		throw new Error('[[error:no-poll]]');
	}
	
	if (pollData.status !== 'active') {
		throw new Error('[[error:poll-not-active]]');
	}

	if (pollData.endTime > 0 && Date.now() > pollData.endTime) {
		throw new Error('[[error:poll-ended]]');
	}
	
	// Check if user already voted
	const hasVoted = await db.isSortedSetMember(`poll:${pollId}:voters`, uid);
	if (hasVoted) {
		throw new Error('[[error:already-voted]]');
	}
	
	// Validate options
	if (!pollData.multipleChoice && optionIds.length > 1) {
		throw new Error('[[error:multiple-choice-not-allowed]]');
	}
	
	// Record vote
	await db.sortedSetAdd(`poll:${pollId}:voters`, Date.now(), uid);
	
	// Update vote counts
	const votePromises = optionIds.map(optionId => Promise.all([
		db.incrObjectField(`poll:${pollId}:option:${optionId}`, 'votes'),
		db.sortedSetAdd(`poll:${pollId}:option:${optionId}:voters`, Date.now(), uid),
	]));
	await Promise.all(votePromises);
	
	return true;
};

Polls.hasVoted = async function (pollId, uid) {
	return await db.isSortedSetMember(`poll:${pollId}:voters`, uid);
};

Polls.getPolls = async function (start, stop) {
	const pollIds = await db.getSortedSetRevRange('polls:created', start, stop);
	const pollsPromises = pollIds.map(async (pollId) => {
		const poll = await Polls.get(pollId);
		if (poll) {
			const userData = await user.getUserFields(poll.uid, ['username', 'picture']);
			poll.user = userData;
			return poll;
		}
		return null;
	});

	const polls = await Promise.all(pollsPromises);
	return polls.filter(poll => poll);
};

Polls.getCount = async function () {
	return await db.sortedSetCard('polls:created');
};

Polls.delete = async function (pollId, uid) {
	const pollData = await db.getObject(`poll:${pollId}`);
	if (!pollData) {
		throw new Error('[[error:no-poll]]');
	}
	
	// Check permissions
	const canDelete = pollData.uid == uid || await user.isAdministrator(uid);
	if (!canDelete) {
		throw new Error('[[error:no-privileges]]');
	}
	
	// Delete poll data
	await db.delete(`poll:${pollId}`);
	await db.sortedSetRemove('polls:created', pollId);
	await db.sortedSetRemove(`uid:${pollData.uid}:polls`, pollId);
	
	// Delete options and votes
	const optionIds = await db.getListRange(`poll:${pollId}:options`, 0, -1);
	const optionDeletionPromises = optionIds.map(optionId => Promise.all([
		db.delete(`poll:${pollId}:option:${optionId}`),
		db.delete(`poll:${pollId}:option:${optionId}:voters`),
	]));
	await Promise.all(optionDeletionPromises);
	await db.delete(`poll:${pollId}:options`);
	await db.delete(`poll:${pollId}:voters`);
	
	return true;
};

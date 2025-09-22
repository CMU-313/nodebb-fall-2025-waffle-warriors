'use strict';

const polls = require('../../polls');
const user = require('../../user');
const helpers = require('../helpers');

const apiController = module.exports;

apiController.create = async function (req, res) {
	if (!req.uid) {
		return helpers.formatApiResponse(400, res, new Error('[[error:not-logged-in]]'));
	}

	try {
		const data = {
			title: req.body.title,
			description: req.body.description,
			options: req.body.options,
			uid: req.uid,
			multipleChoice: req.body.multipleChoice === 'true',
			anonymous: req.body.anonymous === 'true',
			endTime: req.body.endTime ? parseInt(req.body.endTime, 10) : 0
		};

		// Validate input
		if (!data.title || !data.title.trim()) {
			return helpers.formatApiResponse(400, res, new Error('[[error:poll-title-required]]'));
		}

		if (!data.options || !Array.isArray(data.options) || data.options.length < 2) {
			return helpers.formatApiResponse(400, res, new Error('[[error:poll-options-required]]'));
		}

		// Filter out empty options
		data.options = data.options.filter(option => option && option.trim()).slice(0, 10);

		if (data.options.length < 2) {
			return helpers.formatApiResponse(400, res, new Error('[[error:poll-options-minimum]]'));
		}

		const pollId = await polls.create(data);
		helpers.formatApiResponse(200, res, { pollId: pollId });
	} catch (err) {
		helpers.formatApiResponse(500, res, err);
	}
};

apiController.vote = async function (req, res) {
	if (!req.uid) {
		return helpers.formatApiResponse(400, res, new Error('[[error:not-logged-in]]'));
	}

	try {
		const pollId = req.params.poll_id;
		const optionIds = Array.isArray(req.body.options) ? req.body.options : [req.body.options];

		// Validate option IDs
		const validOptionIds = optionIds.filter(id => !isNaN(parseInt(id, 10))).map(id => parseInt(id, 10));

		if (validOptionIds.length === 0) {
			return helpers.formatApiResponse(400, res, new Error('[[error:invalid-options]]'));
		}

		await polls.vote(pollId, req.uid, validOptionIds);
		
		// Return updated poll data
		const pollData = await polls.get(pollId);
		pollData.options.forEach(option => {
			option.percentage = pollData.totalVotes > 0 ? 
				Math.round((option.votes / pollData.totalVotes) * 100) : 0;
		});

		helpers.formatApiResponse(200, res, { poll: pollData });
	} catch (err) {
		helpers.formatApiResponse(500, res, err);
	}
};

apiController.delete = async function (req, res) {
	if (!req.uid) {
		return helpers.formatApiResponse(400, res, new Error('[[error:not-logged-in]]'));
	}

	try {
		const pollId = req.params.poll_id;
		await polls.delete(pollId, req.uid);
		helpers.formatApiResponse(200, res, { success: true });
	} catch (err) {
		helpers.formatApiResponse(500, res, err);
	}
};

apiController.get = async function (req, res) {
	try {
		const pollId = req.params.poll_id;
		const [pollData, hasVoted] = await Promise.all([
			polls.get(pollId),
			req.uid ? polls.hasVoted(pollId, req.uid) : false
		]);

		if (!pollData) {
			return helpers.formatApiResponse(404, res, new Error('[[error:no-poll]]'));
		}

		// Calculate percentages
		pollData.options.forEach(option => {
			option.percentage = pollData.totalVotes > 0 ? 
				Math.round((option.votes / pollData.totalVotes) * 100) : 0;
		});

		pollData.hasVoted = hasVoted;
		pollData.canVote = req.uid && !hasVoted && pollData.status === 'active';

		helpers.formatApiResponse(200, res, { poll: pollData });
	} catch (err) {
		helpers.formatApiResponse(500, res, err);
	}
};

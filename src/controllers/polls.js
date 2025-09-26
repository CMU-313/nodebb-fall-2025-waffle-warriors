'use strict';

const polls = require('../polls');
const user = require('../user');
const helpers = require('./helpers');
const pagination = require('../pagination');

const pollsController = module.exports;

pollsController.list = async function (req, res) {
	const page = parseInt(req.query.page, 10) || 1;
	const itemsPerPage = 20;
	const start = (page - 1) * itemsPerPage;
	const stop = start + itemsPerPage - 1;

	const [pollsData, pollCount] = await Promise.all([
		polls.getPolls(start, stop),
		polls.getCount ? polls.getCount() : 0,
	]);

	const pageCount = Math.ceil(pollCount / itemsPerPage);

	res.render('polls/list', {
		polls: pollsData,
		pagination: pagination.create(page, pageCount, req.query),
		title: 'Polls',
	});
};

pollsController.get = async function (req, res, next) {
	const pollId = req.params.poll_id;
	
	try {
		const [pollData, hasVoted] = await Promise.all([
			polls.get(pollId),
			req.uid ? polls.hasVoted(pollId, req.uid) : false,
		]);

		if (!pollData) {
			return next();
		}

		// Calculate percentages
		pollData.options.forEach((option) => {
			option.percentage = pollData.totalVotes > 0 ? 
				Math.round((option.votes / pollData.totalVotes) * 100) : 0;
		});

		pollData.hasVoted = hasVoted;
		pollData.canVote = req.uid && !hasVoted && pollData.status === 'active';
		pollData.timeRemaining = pollData.endTime ? Math.max(0, pollData.endTime - Date.now()) : 0;

		res.render('polls/poll', {
			poll: pollData,
			title: pollData.title,
		});
	} catch (err) {
		next(err);
	}
};

pollsController.create = async function (req, res) {
	if (!req.uid) {
		return helpers.notAllowed(req, res);
	}

	res.render('polls/create', {
		title: 'Create Poll',
	});
};

pollsController.edit = async function (req, res, next) {
	const pollId = req.params.poll_id;
	
	try {
		const pollData = await polls.get(pollId);
		
		if (!pollData) {
			return next();
		}

		// Check if user can edit
		const canEdit = pollData.uid == req.uid || await user.isAdministrator(req.uid);
		if (!canEdit) {
			return helpers.notAllowed(req, res);
		}

		res.render('polls/edit', {
			poll: pollData,
			title: 'Edit Poll',
		});
	} catch (err) {
		next(err);
	}
};

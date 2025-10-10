'use strict';

const nconf = require('nconf');

const user = require('../user');
const plugins = require('../plugins');
const topics = require('../topics');
const posts = require('../posts');
const helpers = require('./helpers');
const polls = require('../polls');

exports.get = async function (req, res, callback) {
	res.locals.metaTags = {
		...res.locals.metaTags,
		name: 'robots',
		content: 'noindex',
	};

	const data = await plugins.hooks.fire('filter:composer.build', {
		req: req,
		res: res,
		next: callback,
		templateData: {},
	});

	if (res.headersSent) {
		return;
	}
	if (!data || !data.templateData) {
		return callback(new Error('[[error:invalid-data]]'));
	}

	// Inject poll creation form HTML
	if (!data.templateData.disabled) {
		data.templateData.pollForm = `
		<div class="mt-4">
			<div class="form-check mb-3">
				<input class="form-check-input" type="checkbox" id="include-poll" name="include_poll">
				<label class="form-check-label" for="include-poll">
					<strong>Include a Poll in this topic</strong>
				</label>
			</div>
			<div id="poll-form-container" style="display: none;">
				<div class="card border-info">
					<div class="card-header bg-light">
						<h6 class="mb-0">Poll Settings</h6>
					</div>
					<div class="card-body">
						<div class="mb-3">
							<label for="poll-question" class="form-label">Poll Question</label>
							<input type="text" class="form-control" id="poll-question" name="poll[question]"
								   placeholder="What would you like to ask?">
							<div class="form-text">Leave empty to use topic title</div>
						</div>

						<div class="mb-3">
							<label class="form-label">Poll Options</label>
							<div id="poll-options-composer">
								<div class="input-group mb-2">
									<input type="text" class="form-control poll-option-composer"
										   name="poll[options][]" placeholder="Option 1" maxlength="255">
									<button type="button" class="btn btn-outline-danger remove-poll-option-composer" disabled>
										<i class="fa fa-times"></i>
									</button>
								</div>
								<div class="input-group mb-2">
									<input type="text" class="form-control poll-option-composer"
										   name="poll[options][]" placeholder="Option 2" maxlength="255">
									<button type="button" class="btn btn-outline-danger remove-poll-option-composer">
										<i class="fa fa-times"></i>
									</button>
								</div>
							</div>
							<button type="button" id="add-poll-option-composer" class="btn btn-outline-primary btn-sm">
								<i class="fa fa-plus"></i> Add Option
							</button>
						</div>

						<div class="row mb-3">
							<div class="col-md-6">
								<div class="form-check">
									<input class="form-check-input" type="checkbox" id="poll-multiple"
										   name="poll[multiple]" value="on">
									<label class="form-check-label" for="poll-multiple">
										Allow multiple selections
									</label>
								</div>
							</div>
							<div class="col-md-6">
								<div class="form-check">
									<input class="form-check-input" type="checkbox" id="poll-anonymous"
										   name="poll[anonymous]" value="on">
									<label class="form-check-label" for="poll-anonymous">
										Anonymous voting
									</label>
								</div>
							</div>
						</div>

						<div class="mb-3">
							<label for="poll-end-time" class="form-label">End Time (Optional)</label>
							<input type="datetime-local" class="form-control" id="poll-end-time" name="poll[endTime]">
							<div class="form-text">Leave empty for no expiration</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		`;
	}

	if (data.templateData.disabled) {
		res.render('', {
			title: '[[modules:composer.compose]]',
		});
	} else {
		data.templateData.title = '[[modules:composer.compose]]';
		res.render('compose', data.templateData);
	}
};

exports.post = async function (req, res) {
	const { body } = req;
	const data = {
		uid: req.uid,
		req: req,
		timestamp: Date.now(),
		content: body.content,
		handle: body.handle,
		fromQueue: false,
	};
	req.body.noscript = 'true';

	if (!data.content) {
		return helpers.noScriptErrors(req, res, '[[error:invalid-data]]', 400);
	}
	async function queueOrPost(postFn, data) {
		const shouldQueue = await posts.shouldQueue(req.uid, data);
		if (shouldQueue) {
			delete data.req;
			return await posts.addToQueue(data);
		}
		return await postFn(data);
	}

	try {
		let result;
		if (body.tid) {
			data.tid = body.tid;
			result = await queueOrPost(topics.reply, data);
		} else if (body.cid) {
			data.cid = body.cid;
			data.title = body.title;
			data.tags = [];
			data.thumb = '';

			// Check if poll data is included
			if (body.poll && (body.poll.options || body.poll.question)) {
				data.poll = {
					title: body.poll.question || data.title,
					description: body.poll.description || '',
					options: body.poll.options || [],
					multipleChoice: body.poll.multiple || false,
					anonymous: body.poll.anonymous || false,
					endTime: body.poll.endTime ? new Date(body.poll.endTime).getTime() : 0,
				};
			}

			result = await queueOrPost(topics.post, data);

			// If poll data was provided, create the poll and link it to the topic
			if (result.topicData && result.topicData.tid && data.poll) {
				try {
					const pollData = {
						title: data.poll.question || data.title,
						description: data.poll.description || '',
						options: Array.isArray(data.poll.options) ? data.poll.options : [data.poll.options].filter(Boolean),
						multipleChoice: data.poll.multiple === 'on' || data.poll.multiple === true,
						anonymous: data.poll.anonymous === 'on' || data.poll.anonymous === true,
						endTime: data.poll.endTime ? new Date(data.poll.endTime).getTime() : 0,
						topicId: result.topicData.tid,
						uid: req.uid,
					};
					const pollId = await polls.create(pollData);
					console.log('Poll created for topic', result.topicData.tid, 'poll ID:', pollId);
				} catch (pollErr) {
					console.error('Failed to create poll for topic:', result.topicData.tid, pollErr);
					// Don't fail the entire topic creation if poll creation fails
				}
			}
		} else {
			throw new Error('[[error:invalid-data]]');
		}
		if (!result) {
			throw new Error('[[error:invalid-data]]');
		}
		if (result.queued) {
			return res.redirect(`${nconf.get('relative_path') || '/'}?noScriptMessage=[[success:post-queued]]`);
		}
		user.updateOnlineUsers(req.uid);
		let path = nconf.get('relative_path');
		if (result.pid) {
			path += `/post/${result.pid}`;
		} else if (result.topicData) {
			path += `/topic/${result.topicData.slug}`;
		}
		res.redirect(path);
	} catch (err) {
		helpers.noScriptErrors(req, res, err.message, 400);
	}
};

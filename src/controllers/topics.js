'use strict';

const nconf = require('nconf');
const qs = require('querystring');
const validator = require('validator');

const user = require('../user');
const meta = require('../meta');
const topics = require('../topics');
const categories = require('../categories');
const posts = require('../posts');
const privileges = require('../privileges');
const helpers = require('./helpers');
const pagination = require('../pagination');
const utils = require('../utils');
const analytics = require('../analytics');
const polls = require('../polls');

const topicsController = module.exports;

const url = nconf.get('url');
const relative_path = nconf.get('relative_path');
const upload_url = nconf.get('upload_url');
const validSorts = ['oldest_to_newest', 'newest_to_oldest', 'most_votes'];

topicsController.get = async function getTopic(req, res, next) {
	const tid = req.params.topic_id;
	if (
		(req.params.post_index && !utils.isNumber(req.params.post_index) && req.params.post_index !== 'unread') ||
		(!utils.isNumber(tid) && !validator.isUUID(tid))
	) {
		return next();
	}
	let postIndex = parseInt(req.params.post_index, 10) || 1;
	const topicData = await topics.getTopicData(tid);
	if (!topicData) {
		return next();
	}
	const [
		userPrivileges,
		settings,
		rssToken,
	] = await Promise.all([
		privileges.topics.get(tid, req.uid),
		user.getSettings(req.uid),
		user.auth.getFeedToken(req.uid),
	]);

	let currentPage = parseInt(req.query.page, 10) || 1;
	const pageCount = Math.max(1, Math.ceil((topicData && topicData.postcount) / settings.postsPerPage));
	const invalidPagination = (settings.usePagination && (currentPage < 1 || currentPage > pageCount));
	if (
		userPrivileges.disabled ||
		invalidPagination ||
		(topicData.scheduled && !userPrivileges.view_scheduled)
	) {
		return next();
	}

	if (!userPrivileges['topics:read'] || (!topicData.scheduled && topicData.deleted && !userPrivileges.view_deleted)) {
		return helpers.notAllowed(req, res);
	}

	if (req.params.post_index === 'unread') {
		postIndex = await topics.getUserBookmark(tid, req.uid);
	}

	if (!res.locals.isAPI && (!req.params.slug || topicData.slug !== `${tid}/${req.params.slug}`) && (topicData.slug && topicData.slug !== `${tid}/`)) {
		return helpers.redirect(res, `/topic/${topicData.slug}${postIndex ? `/${postIndex}` : ''}${generateQueryString(req.query)}`, true);
	}

	if (utils.isNumber(postIndex) && topicData.postcount > 0 && (postIndex < 1 || postIndex > topicData.postcount)) {
		return helpers.redirect(res, `/topic/${tid}/${req.params.slug}${postIndex > topicData.postcount ? `/${topicData.postcount}` : ''}${generateQueryString(req.query)}`);
	}
	postIndex = Math.max(1, postIndex);
	const sort = validSorts.includes(req.query.sort) ? req.query.sort : settings.topicPostSort;
	const set = sort === 'most_votes' ? `tid:${tid}:posts:votes` : `tid:${tid}:posts`;
	const reverse = sort === 'newest_to_oldest' || sort === 'most_votes';

	if (!req.query.page) {
		currentPage = calculatePageFromIndex(postIndex, settings);
	}
	if (settings.usePagination && req.query.page) {
		const top = ((currentPage - 1) * settings.postsPerPage) + 1;
		const bottom = top + settings.postsPerPage;
		if (!req.params.post_index || (postIndex < top || postIndex > bottom)) {
			postIndex = top;
		}
	}
	const { start, stop } = calculateStartStop(currentPage, postIndex, settings);

	await topics.getTopicWithPosts(topicData, set, req.uid, start, stop, reverse);

	topics.modifyPostsByPrivilege(topicData, userPrivileges);
	topicData.tagWhitelist = categories.filterTagWhitelist(topicData.tagWhitelist, userPrivileges.isAdminOrMod);

	topicData.privileges = userPrivileges;
	topicData.topicStaleDays = meta.config.topicStaleDays;
	topicData['reputation:disabled'] = meta.config['reputation:disabled'];
	topicData['downvote:disabled'] = meta.config['downvote:disabled'];
	topicData.upvoteVisibility = meta.config.upvoteVisibility;
	topicData.downvoteVisibility = meta.config.downvoteVisibility;
	topicData['feeds:disableRSS'] = meta.config['feeds:disableRSS'] || 0;
	topicData['signatures:hideDuplicates'] = meta.config['signatures:hideDuplicates'];
	topicData.bookmarkThreshold = meta.config.bookmarkThreshold;
	topicData.necroThreshold = meta.config.necroThreshold;
	topicData.postEditDuration = meta.config.postEditDuration;
	topicData.postDeleteDuration = meta.config.postDeleteDuration;
	topicData.scrollToMyPost = settings.scrollToMyPost;
	topicData.updateUrlWithPostIndex = settings.updateUrlWithPostIndex;
	topicData.allowMultipleBadges = meta.config.allowMultipleBadges === 1;
	topicData.privateUploads = meta.config.privateUploads === 1;
	topicData.showPostPreviewsOnHover = meta.config.showPostPreviewsOnHover === 1;
	topicData.sortOptionLabel = `[[topic:${validator.escape(String(sort)).replace(/_/g, '-')}]]`;
	if (!meta.config['feeds:disableRSS']) {
		topicData.rssFeedUrl = `${relative_path}/topic/${topicData.tid}.rss`;
		if (req.loggedIn) {
			topicData.rssFeedUrl += `?uid=${req.uid}&token=${rssToken}`;
		}
	}

	topicData.postIndex = postIndex;
	const postAtIndex = topicData.posts.find(
		p => parseInt(p.index, 10) === parseInt(Math.max(0, postIndex - 1), 10)
	);

	const [author, topicPoll] = await Promise.all([
		user.getUserFields(topicData.uid, ['username', 'userslug']),
		polls.getPollByTopicId(tid), // Try to load poll for this topic
		buildBreadcrumbs(topicData),
		addOldCategory(topicData, userPrivileges),
		addTags(topicData, req, res, currentPage, postAtIndex),
		topics.increaseViewCount(req, tid),
		markAsRead(req, tid),
		analytics.increment([`pageviews:byCid:${topicData.category.cid}`]),
	]);

	// Include poll HTML if a poll exists for this topic
	if (topicPoll) {
		try {
			// Calculate percentages and Voting status
			topicPoll.options.forEach((option) => {
				option.percentage = topicPoll.totalVotes > 0 ?
					Math.round((option.votes / topicPoll.totalVotes) * 100) : 0;
			});

			topicPoll.hasVoted = req.uid ? await polls.hasVoted(topicPoll.pollId, req.uid) : false;
			topicPoll.canVote = req.uid && !topicPoll.hasVoted && topicPoll.status === 'active';
			topicPoll.canEdit = req.uid && (topicPoll.uid == req.uid || req.loggedInUserIsAdmin);
			topicPoll.endTimeISO = topicPoll.endTime ? new Date(topicPoll.endTime).toISOString().slice(0, 16) : null;

			// Generate poll HTML for embedding in topic
			let pollHtml = `
			<div class="poll-container card mb-3" data-poll-id="${topicPoll.pollId}">
				<div class="card-body">
					<h6 class="card-title mb-3">${topicPoll.title}</h6>`;

			if (topicPoll.description) {
				pollHtml += `<p class="text-muted mb-3">${topicPoll.description}</p>`;
			}

			if (topicPoll.canVote) {
				// Voting form
				pollHtml += `
				<form id="poll-vote-form-${topicPoll.pollId}" class="poll-form">
					<div class="poll-options mb-3">`;
				topicPoll.options.forEach((option, index) => {
					pollHtml += `
					<div class="form-check mb-2">
						<input class="form-check-input poll-option" type="${topicPoll.multipleChoice ? 'checkbox' : 'radio'}"
							   name="poll-option" id="option-${topicPoll.pollId}-${index}" value="${option.optionId}">
						<label class="form-check-label d-flex justify-content-between" for="option-${topicPoll.pollId}-${index}">
							<span>${option.text}</span>
							<span class="text-muted small">${option.votes} votes</span>
						</label>
					</div>`;
				});
				pollHtml += `
					</div>
					<button type="submit" class="btn btn-primary btn-sm">
						<i class="fa fa-check"></i> Submit Vote
					</button>
				</form>`;
			} else {
				// Results view
				topicPoll.options.forEach((option, index) => {
					pollHtml += `
					<div class="poll-option-result mb-3">
						<div class="d-flex justify-content-between align-items-center mb-1">
							<span class="fw-medium">${option.text}</span>
							<span class="text-muted small">${option.votes} votes (${option.percentage}%)</span>
						</div>
						<div class="progress" style="height: 20px;">
							<div class="progress-bar" role="progressbar" style="width: ${option.percentage}%"
								 aria-valuenow="${option.percentage}" aria-valuemin="0" aria-valuemax="100">
								${option.percentage}%
							</div>
						</div>
					</div>`;
				});
			}

			pollHtml += `
				<div class="poll-meta mt-3 pt-3 border-top">
					<div class="row text-muted small">
						<div class="col-md-6">
							<div class="mb-1">
								<i class="fa fa-chart-bar"></i> Total votes: <strong>${topicPoll.totalVotes}</strong>
							</div>
							<div class="mb-1">
								<i class="fa fa-user"></i> Created by: <strong>${topicPoll.user ? topicPoll.user.username : 'Anonymous'}</strong>
							</div>
						</div>
						<div class="col-md-6">
							${topicPoll.endTime ? `<div class="mb-1">
								<i class="fa fa-clock"></i> Ends: <span class="timeago" title="${topicPoll.endTimeISO}">${new Date(topicPoll.endTime).toLocaleString()}</span>
							</div>` : ''}
							<div class="mb-1">
								<span class="badge bg-${topicPoll.status === 'active' ? 'success' : 'secondary'}">${topicPoll.status}</span>
								${topicPoll.anonymous ? '<span class="badge bg-secondary ms-1">Anonymous</span>' : ''}
								${topicPoll.multipleChoice ? '<span class="badge bg-primary ms-1">Multiple Choice</span>' : '<span class="badge bg-info ms-1">Single Choice</span>'}
							</div>
						</div>
					</div>
					${topicPoll.canEdit ? `<a href="${nconf.get('relative_path')}/polls/${topicPoll.pollId}/edit" class="btn btn-sm btn-outline-secondary mt-2">
						<i class="fa fa-edit"></i> Edit Poll
					</a>` : ''}
					${topicPoll.hasVoted ? '<div class="alert alert-info mt-3 mb-0">You have already voted in this poll.</div>' : ''}
				</div>
				</div>
			</div>`;

			topicData.pollEmbed = pollHtml;
			topicData.poll = topicPoll; // Keep structured data for API access
		} catch (pollErr) {
			console.error('Error generating poll HTML for topic:', topicData.tid, pollErr);
		}
	}

	topicData.author = author;
	topicData.pagination = pagination.create(currentPage, pageCount, req.query);
	topicData.pagination.rel.forEach((rel) => {
		rel.href = `${url}/topic/${topicData.slug}${rel.href}`;
		res.locals.linkTags.push(rel);
	});

	if (meta.config.activitypubEnabled && postAtIndex) {
		// Include link header for richer parsing
		const { pid } = postAtIndex;
		const href = utils.isNumber(pid) ? `${nconf.get('url')}/post/${pid}` : pid;
		res.set('Link', `<${href}>; rel="alternate"; type="application/activity+json"`);
	}

	res.render('topic', topicData);
};

function generateQueryString(query) {
	const qString = qs.stringify(query);
	return qString.length ? `?${qString}` : '';
}

function calculatePageFromIndex(postIndex, settings) {
	return 1 + Math.floor((postIndex - 1) / settings.postsPerPage);
}

function calculateStartStop(page, postIndex, settings) {
	let startSkip = 0;

	if (!settings.usePagination) {
		if (postIndex > 1) {
			page = 1;
		}
		startSkip = Math.max(0, postIndex - Math.ceil(settings.postsPerPage / 2));
	}

	const start = ((page - 1) * settings.postsPerPage) + startSkip;
	const stop = start + settings.postsPerPage - 1;
	return { start: Math.max(0, start), stop: Math.max(0, stop) };
}

async function markAsRead(req, tid) {
	if (req.loggedIn) {
		const markedRead = await topics.markAsRead([tid], req.uid);
		const promises = [topics.markTopicNotificationsRead([tid], req.uid)];
		if (markedRead) {
			promises.push(topics.pushUnreadCount(req.uid));
		}
		await Promise.all(promises);
	}
}

async function buildBreadcrumbs(topicData) {
	const breadcrumbs = [
		{
			text: topicData.category.name,
			url: `${url}/category/${topicData.category.slug}`,
			cid: topicData.category.cid,
		},
		{
			text: topicData.title,
		},
	];
	const parentCrumbs = await helpers.buildCategoryBreadcrumbs(topicData.category.parentCid);
	topicData.breadcrumbs = parentCrumbs.concat(breadcrumbs);
}

async function addOldCategory(topicData, userPrivileges) {
	if (userPrivileges.isAdminOrMod && topicData.oldCid) {
		topicData.oldCategory = await categories.getCategoryFields(
			topicData.oldCid, ['cid', 'name', 'icon', 'bgColor', 'color', 'slug']
		);
	}
}

async function addTags(topicData, req, res, currentPage, postAtIndex) {
	let description = '';
	if (postAtIndex && postAtIndex.content) {
		description = utils.stripHTMLTags(utils.decodeHTMLEntities(postAtIndex.content)).trim();
	}

	if (description.length > 160) {
		description = `${description.slice(0, 157)}...`;
	}
	description = description.replace(/\n/g, ' ').trim();

	let mainPost = topicData.posts.find(p => parseInt(p.index, 10) === 0);
	if (!mainPost) {
		mainPost = await posts.getPostData(topicData.mainPid);
	}

	res.locals.metaTags = [
		{
			name: 'title',
			content: topicData.titleRaw,
		},
		{
			property: 'og:title',
			content: topicData.titleRaw,
		},
		{
			property: 'og:type',
			content: 'article',
		},
		{
			property: 'article:published_time',
			content: utils.toISOString(topicData.timestamp),
		},
		{
			property: 'article:modified_time',
			content: utils.toISOString(Math.max(topicData.lastposttime, mainPost && mainPost.edited)),
		},
		{
			property: 'article:section',
			content: topicData.category ? topicData.category.name : '',
		},
	];

	if (description && description.length) {
		res.locals.metaTags.push(
			{
				name: 'description',
				content: description,
			},
			{
				property: 'og:description',
				content: description,
			},
		);
	}

	await addOGImageTags(res, topicData, postAtIndex);

	const page = currentPage > 1 ? `?page=${currentPage}` : '';
	res.locals.linkTags = [
		{
			rel: 'canonical',
			href: `${url}/topic/${topicData.slug}${page}`,
			noEscape: true,
		},
	];

	if (!topicData['feeds:disableRSS']) {
		res.locals.linkTags.push({
			rel: 'alternate',
			type: 'application/rss+xml',
			href: topicData.rssFeedUrl,
		});
	}

	if (topicData.category) {
		res.locals.linkTags.push({
			rel: 'up',
			href: `${url}/category/${topicData.category.slug}`,
		});
	}

	if (postAtIndex) {
		res.locals.linkTags.push({
			rel: 'author',
			href: `${url}/user/${postAtIndex.user.userslug}`,
		});
	}

	if (meta.config.activitypubEnabled && postAtIndex) {
		const { pid } = postAtIndex;
		res.locals.linkTags.push({
			rel: 'alternate',
			type: 'application/activity+json',
			href: utils.isNumber(pid) ? `${nconf.get('url')}/post/${pid}` : pid,
		});
	}
}

async function addOGImageTags(res, topicData, postAtIndex) {
	const uploads = postAtIndex ? await posts.uploads.listWithSizes(postAtIndex.pid) : [];
	const images = uploads.map((upload) => {
		upload.name = `${url + upload_url}/${upload.name}`;
		return upload;
	});
	if (topicData.thumbs) {
		const path = require('path');
		const thumbs = topicData.thumbs.filter(
			t => t && images.every(img => path.normalize(img.name) !== path.normalize(url + t.url))
		);
		images.push(...thumbs.map(thumbObj => ({ name: url + thumbObj.url })));
	}
	if (topicData.category.backgroundImage && (!postAtIndex || !postAtIndex.index)) {
		images.push(topicData.category.backgroundImage);
	}
	if (postAtIndex && postAtIndex.user && postAtIndex.user.picture) {
		images.push(postAtIndex.user.picture);
	}
	images.forEach(path => addOGImageTag(res, path));
}

function addOGImageTag(res, image) {
	let imageUrl;
	if (typeof image === 'string' && !image.startsWith('http')) {
		imageUrl = url + image.replace(new RegExp(`^${relative_path}`), '');
	} else if (typeof image === 'object') {
		imageUrl = image.name;
	} else {
		imageUrl = image;
	}

	res.locals.metaTags.push({
		property: 'og:image',
		content: imageUrl,
		noEscape: true,
	}, {
		property: 'og:image:url',
		content: imageUrl,
		noEscape: true,
	});

	if (typeof image === 'object' && image.width && image.height) {
		res.locals.metaTags.push({
			property: 'og:image:width',
			content: String(image.width),
		}, {
			property: 'og:image:height',
			content: String(image.height),
		});
	}
}

topicsController.teaser = async function (req, res, next) {
	const tid = req.params.topic_id;
	if (!utils.isNumber(tid)) {
		return next();
	}
	const canRead = await privileges.topics.can('topics:read', tid, req.uid);
	if (!canRead) {
		return res.status(403).json('[[error:no-privileges]]');
	}
	const pid = await topics.getLatestUndeletedPid(tid);
	if (!pid) {
		return res.status(404).json('not-found');
	}
	const postData = await posts.getPostSummaryByPids([pid], req.uid, { stripTags: false });
	if (!postData.length) {
		return res.status(404).json('not-found');
	}
	res.json(postData[0]);
};

topicsController.pagination = async function (req, res, next) {
	const tid = req.params.topic_id;
	const currentPage = parseInt(req.query.page, 10) || 1;

	if (!utils.isNumber(tid)) {
		return next();
	}
	const topic = await topics.getTopicData(tid);
	if (!topic) {
		return next();
	}
	const [userPrivileges, settings] = await Promise.all([
		privileges.topics.get(tid, req.uid),
		user.getSettings(req.uid),
	]);

	if (!userPrivileges.read || !privileges.topics.canViewDeletedScheduled(topic, userPrivileges)) {
		return helpers.notAllowed(req, res);
	}

	const postCount = topic.postcount;
	const pageCount = Math.max(1, Math.ceil(postCount / settings.postsPerPage));

	const paginationData = pagination.create(currentPage, pageCount);
	paginationData.rel.forEach((rel) => {
		rel.href = `${url}/topic/${topic.slug}${rel.href}`;
	});

	res.json({ pagination: paginationData });
};

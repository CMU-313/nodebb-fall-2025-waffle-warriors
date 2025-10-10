<!-- IMPORT partials/breadcrumbs.tpl -->

<div data-widget-area="header">
	{{{each widgets.header}}}
	{{widgets.header.html}}
	{{{end}}}
</div>

<div class="row">
	<div class="col-lg-9">
		<div class="card">
			<div class="card-header d-flex justify-content-between align-items-center">
				<h1 class="h4 mb-0">{poll.title}</h1>
				<div>
					{{{ if poll.status }}}
					<span class="badge bg-success me-2">
						{poll.status}
					</span>

					{{{ end }}}
					{{{ if poll.canEdit }}}
					<a href="{config.relative_path}/polls/{poll.pollId}/edit" class="btn btn-sm btn-outline-secondary">
						<i class="fa fa-edit"></i> Edit
					</a>
					{{{ end }}}
				</div>
			</div>
			<div class="card-body">
				{{{ if poll.description }}}
				<p class="text-muted mb-4">{poll.description}</p>
				{{{ end }}}

				{{{ if poll.canVote }}}
				<form id="poll-vote-form">
					<div class="poll-options mb-3" data-poll-id="{poll.pollId}">
					{{{ each poll.options }}}
					<div class="form-check mb-3">
						<input class="form-check-input" type="radio"
							   name="poll-option" id="option-{./optionId}" value="{./optionId}">
						<label class="form-check-label w-100" for="option-{./optionId}">
							<div class="d-flex justify-content-between align-items-center">
								<span>{./text}</span>
								<span class="text-muted small">{./votes} votes</span>
							</div>
						</label>
					</div>
					{{{ end }}}
					</div>
					<button type="submit" class="btn btn-primary">
						<i class="fa fa-check"></i> Submit Vote
					</button>
				</form>
				{{{ else }}}
				<!-- Results view -->
				{{{ each poll.options }}}
				<div class="poll-option-result mb-3">
					<div class="d-flex justify-content-between align-items-center mb-1">
						<span class="fw-medium">{./text}</span>
						<span class="text-muted small">{./votes} votes</span>
					</div>
				</div>
				{{{ end }}}
				{{{ end }}}

				<div class="poll-meta mt-4 pt-3 border-top">
					<div class="row text-muted small">
						<div class="col-md-6">
							<div class="mb-2">
								<i class="fa fa-chart-bar"></i> Total votes: <strong class="total-votes">{poll.totalVotes}</strong>
							</div>
							<div class="mb-2">
								<i class="fa fa-user"></i> Created by: <strong>{poll.user.username}</strong>
							</div>
						</div>
						<div class="col-md-6">
							<div class="mb-2">
								<i class="fa fa-clock"></i> Created: <span class="timeago" title="{poll.timestampISO}">{poll.timestamp}</span>
							</div>
							{{{ if poll.endTime }}}
							<div class="mb-2">
								<i class="fa fa-hourglass-end"></i> Ends: <span class="timeago" title="{poll.endTimeISO}">{poll.endTime}</span>
							</div>
							{{{ end }}}
						</div>
					</div>
					{{{ if poll.hasVoted }}}
					<div class="alert alert-info mt-3">
						<i class="fa fa-info-circle"></i> You have already voted in this poll.
					</div>
					{{{ end }}}
				</div>
			</div>
		</div>
	</div>

	<div class="col-lg-3">
		<div data-widget-area="sidebar">
			{{{each widgets.sidebar}}}
			{{widgets.sidebar.html}}
			{{{end}}}
		</div>
	</div>
</div>

<div data-widget-area="footer">
	{{{each widgets.footer}}}
	{{widgets.footer.html}}
	{{{end}}}
</div>

<script>
// Immediately attach form handler
(function() {
	console.log('Poll script executing');
	const form = document.getElementById('poll-vote-form');

	if (!form) {
		console.log('poll-vote-form not found, retrying...');
		// Retry after a short delay in case DOM isn't ready
		setTimeout(function() {
			const retryForm = document.getElementById('poll-vote-form');
			if (retryForm) initForm(retryForm);
		}, 100);
	} else {
		initForm(form);
	}

	function initForm(form) {
		console.log('Poll page loaded, initializing form');

		console.log('Found poll-vote-form, attaching submit handler');
		form.addEventListener('submit', function(e) {
			console.log('Form submitted, preventing default');
			e.preventDefault();

			const formData = new FormData(form);
			const options = formData.getAll('poll-option');
			console.log('Selected options:', options);

			if (options.length === 0) {
				console.log('No options selected');
				return;
			}

			const pollId = document.querySelector('.poll-options').dataset.pollId;
			console.log('Poll ID:', pollId);

			console.log('Sending POST request to:', config.relative_path + '/api/polls/' + pollId + '/vote');
			fetch(config.relative_path + '/api/polls/' + pollId + '/vote', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-Token': config.csrf_token
				},
				body: JSON.stringify({ options: options })
			})
			.then(response => {
				console.log('Response received, status:', response.status);
				if (response.status === 200) {
					console.log('Vote recorded successfully (status 200), forcing results view');
					location.reload();
				} else {
					return response.json().then(data => {
						console.log('Vote failed with status', response.status, '- data:', data);
					});
				}
			})
			.catch(error => {
				console.log('Network or parse error:', error);
			});
		});
	}
})();
</script>

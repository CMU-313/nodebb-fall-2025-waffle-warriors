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

				<div class="poll-options" data-poll-id="{poll.pollId}">
					{{{ if poll.canVote }}}
					<form id="poll-vote-form">
						{{{ each poll.options }}}
						<div class="form-check mb-3">
							<input class="form-check-input" type="{{{ if ../poll.multipleChoice }}}checkbox{{{ else }}}radio{{{ end }}}" 
								   name="poll-option" id="option-{./optionId}" value="{./optionId}">
							<label class="form-check-label w-100" for="option-{./optionId}">
								<div class="d-flex justify-content-between align-items-center">
									<span>{./text}</span>
									<span class="text-muted small">{./votes} votes</span>
								</div>
							</label>
						</div>
						{{{ end }}}
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
							<span class="text-muted small">{./votes} votes ({./percentage}%)</span>
						</div>
						<div class="progress" style="height: 20px;">
							<div class="progress-bar" role="progressbar" style="width: {./percentage}%" 
								 aria-valuenow="{./percentage}" aria-valuemin="0" aria-valuemax="100">
								{./percentage}%
							</div>
						</div>
					</div>
					{{{ end }}}
					{{{ end }}}
				</div>

				<div class="poll-meta mt-4 pt-3 border-top">
					<div class="row text-muted small">
						<div class="col-md-6">
							<div class="mb-2">
								<i class="fa fa-chart-bar"></i> Total votes: <strong>{poll.totalVotes}</strong>
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
		<div class="card">
			<div class="card-header">
				<h5 class="card-title mb-0">Poll Information</h5>
			</div>
			<div class="card-body">
				<div class="mb-3">
					<strong>Type:</strong><br>
					{{{ if poll.multipleChoice }}}
					<span class="badge bg-info">Multiple Choice</span>
					{{{ else }}}
					<span class="badge bg-primary">Single Choice</span>
					{{{ end }}}
				</div>
				{{{ if poll.anonymous }}}
				<div class="mb-3">
					<span class="badge bg-secondary">Anonymous</span>
				</div>
				{{{ end }}}
				<div class="mb-3">
					<strong>Options:</strong> {poll.options.length}
				</div>
				<div class="mb-3">
					<strong>Status:</strong><br>
					
					<span class="badge bg-success">active</span>
		
		


				</div>
			</div>
		</div>

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
document.addEventListener('DOMContentLoaded', function() {
	const form = document.getElementById('poll-vote-form');
	if (form) {
		form.addEventListener('submit', function(e) {
			e.preventDefault();

			const formData = new FormData(form);
			const options = formData.getAll('poll-option');

			if (options.length === 0) {
				app.require(['alerts'], function(alerts) {
					alerts.error('Please select at least one option');
				});
				return;
			}

			const pollId = document.querySelector('.poll-options').dataset.pollId;

			fetch(config.relative_path + '/api/polls/' + pollId + '/vote', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-Token': config.csrf_token
				},
				body: JSON.stringify({ options: options })
			})
			.then(response => response.json())
			.then(data => {
				if (data.status && data.status.code === 'ok') {
					location.reload();
				} else {
					app.require(['alerts'], function(alerts) {
						alerts.error(data.status && data.status.message ? data.status.message : 'Error submitting vote');
					});
				}
			})
			.catch(error => {
				app.require(['alerts'], function(alerts) {
					alerts.error('Error submitting vote');
				});
				console.error('Error:', error);
			});
		});
	}
});
</script>

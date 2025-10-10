<!-- IMPORT partials/breadcrumbs.tpl -->

<div data-widget-area="header">
	{{{each widgets.header}}}
	{{widgets.header.html}}
	{{{end}}}
</div>

<div class="row">
	<div class="col-lg-9">
		<div class="card">
			<div class="card-header">
				<h1 class="h4 mb-0">Edit Poll</h1>
			</div>
			<div class="card-body">
				<form id="poll-edit-form">
					<div class="mb-3">
						<label for="poll-title" class="form-label">Poll Title <span class="text-danger">*</span></label>
						<input type="text" class="form-control" id="poll-title" name="title" required maxlength="255"
							   value="{poll.title}" placeholder="Enter your poll question">
						<div class="form-text">Ask a clear, concise question</div>
					</div>

					<div class="mb-3">
						<label for="poll-description" class="form-label">Description (Optional)</label>
						<textarea class="form-control" id="poll-description" name="description" rows="3"
								  placeholder="Provide additional context or instructions">{{poll.description}}</textarea>
					</div>

					<div class="mb-3">
						<label class="form-label">Poll Options <span class="text-danger">*</span></label>
						<div id="poll-options">
							{{{each poll.options}}}
							<div class="input-group mb-2">
								<input type="text" class="form-control poll-option" name="options[]"
									   value="{{{../text}}}" required maxlength="255">
								{{{if @index}}}
								<button type="button" class="btn btn-outline-danger remove-option">
									<i class="fa fa-times"></i>
								</button>
								{{{else}}}
								<button type="button" class="btn btn-outline-danger remove-option" disabled>
									<i class="fa fa-times"></i>
								</button>
								{{{end}}}
							</div>
							{{{end}}}
						</div>
						<button type="button" id="add-option" class="btn btn-outline-primary btn-sm">
							<i class="fa fa-plus"></i> Add Option
						</button>
						<div class="form-text">Add 2-10 options for users to choose from</div>
					</div>

					<div class="row mb-3">
						<div class="col-md-6">
							<div class="form-check">
								<input class="form-check-input" type="checkbox" id="multiple-choice" name="multipleChoice" {{{if poll.multipleChoice}}}checked{{{end}}}>
								<label class="form-check-label" for="multiple-choice">
									Allow multiple selections
								</label>
								<div class="form-text">Users can select more than one option</div>
							</div>
						</div>
						<div class="col-md-6">
							<div class="form-check">
								<input class="form-check-input" type="checkbox" id="anonymous" name="anonymous" {{{if poll.anonymous}}}checked{{{end}}}>
								<label class="form-check-label" for="anonymous">
									Anonymous voting
								</label>
								<div class="form-text">Hide voter identities</div>
							</div>
						</div>
					</div>

					<div class="mb-3">
						<label for="end-time" class="form-label">End Time (Optional)</label>
						{{{if poll.endTime}}}
						<input type="datetime-local" class="form-control" id="end-time" name="endTime" value="{{poll.endTimeISO}}">
						{{{else}}}
						<input type="datetime-local" class="form-control" id="end-time" name="endTime">
						{{{end}}}
						<div class="form-text">Leave empty for no expiration</div>
					</div>

					<div class="d-flex gap-2">
						<button type="submit" class="btn btn-primary">
							<i class="fa fa-check"></i> Update Poll
						</button>
						<a href="{config.relative_path}/polls/{poll.pollId}" class="btn btn-secondary">
							<i class="fa fa-times"></i> Cancel
						</a>
					</div>
				</form>
			</div>
		</div>
	</div>

	<div class="col-lg-3">
		<div class="card">
			<div class="card-header">
				<h5 class="card-title mb-0">Tips</h5>
			</div>
			<div class="card-body">
				<ul class="list-unstyled">
					<li class="mb-2">
						<i class="fa fa-lightbulb text-warning"></i>
						Keep your question clear and specific
					</li>
					<li class="mb-2">
						<i class="fa fa-list text-info"></i>
						Provide balanced and comprehensive options
					</li>
					<li class="mb-2">
						<i class="fa fa-users text-success"></i>
						Consider your audience when writing options
					</li>
					<li class="mb-2">
						<i class="fa fa-clock text-primary"></i>
						Set an end time for time-sensitive polls
					</li>
				</ul>
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
	const form = document.getElementById('poll-edit-form');
	const optionsContainer = document.getElementById('poll-options');
	const addOptionBtn = document.getElementById('add-option');
	let optionCount = document.querySelectorAll('.poll-option').length;

	// Add option functionality
	addOptionBtn.addEventListener('click', function() {
		if (optionCount >= 10) {
			app.alertError('Maximum 10 options allowed');
			return;
		}

		optionCount++;
		const optionDiv = document.createElement('div');
		optionDiv.className = 'input-group mb-2';
		optionDiv.innerHTML = `
			<input type="text" class="form-control poll-option" name="options[]"
				   placeholder="Option ${optionCount}" required maxlength="255">
			<button type="button" class="btn btn-outline-danger remove-option">
				<i class="fa fa-times"></i>
			</button>
		`;
		optionsContainer.appendChild(optionDiv);
		updateRemoveButtons();
	});

	// Remove option functionality
	document.addEventListener('click', function(e) {
		if (e.target.closest('.remove-option')) {
			const optionDiv = e.target.closest('.input-group');
			optionDiv.remove();
			optionCount--;
			updateRemoveButtons();
			updatePlaceholders();
		}
	});

	function updateRemoveButtons() {
		const removeButtons = optionsContainer.querySelectorAll('.remove-option');
		removeButtons.forEach((btn, index) => {
			btn.disabled = removeButtons.length <= 2;
		});
	}

	function updatePlaceholders() {
		const inputs = optionsContainer.querySelectorAll('.poll-option');
		inputs.forEach((input, index) => {
			if (!input.value.trim()) {
				input.placeholder = `Option ${index + 1}`;
			}
		});
	}

	// Form submission
	form.addEventListener('submit', function(e) {
		e.preventDefault();

		const formData = new FormData(form);
		const options = formData.getAll('options[]').filter(option => option.trim());

		if (options.length < 2) {
			app.alertError('Please provide at least 2 options');
			return;
		}

		const data = {
			title: formData.get('title'),
			description: formData.get('description'),
			options: options,
			multipleChoice: formData.get('multipleChoice') === 'on',
			anonymous: formData.get('anonymous') === 'on',
			endTime: formData.get('endTime') ? new Date(formData.get('endTime')).getTime() : 0
		};

		fetch(config.relative_path + '/api/polls/{poll.pollId}', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-Token': config.csrf_token
			},
			body: JSON.stringify(data)
		})
		.then(response => response.json())
		.then(data => {
			if (data.status.code === 'ok') {
				app.alertSuccess('Poll updated successfully!');
				setTimeout(() => {
					window.location.href = config.relative_path + '/polls/{poll.pollId}';
				}, 1000);
			} else {
				app.alertError(data.status.message);
			}
		})
		.catch(error => {
			app.alertError('Error updating poll');
			console.error('Error:', error);
		});
	});
});
</script>

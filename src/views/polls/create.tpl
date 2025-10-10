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
				<h1 class="h4 mb-0">Create New Poll</h1>
			</div>
			<div class="card-body">
				<form id="poll-create-form">
					<div class="mb-3">
						<label for="poll-title" class="form-label">Poll Title <span class="text-danger">*</span></label>
						<input type="text" class="form-control" id="poll-title" name="title" required maxlength="255" 
							   placeholder="Enter your poll question">
						<div class="form-text">Ask a clear, concise question</div>
					</div>

					<div class="mb-3">
						<label for="poll-description" class="form-label">Description (Optional)</label>
						<textarea class="form-control" id="poll-description" name="description" rows="3" 
								  placeholder="Provide additional context or instructions"></textarea>
					</div>

					<div class="mb-3">
						<label class="form-label">Poll Options <span class="text-danger">*</span></label>
						<div id="poll-options">
							<div class="input-group mb-2">
								<input type="text" class="form-control poll-option" name="options[]" 
									   placeholder="Option 1" required maxlength="255">
								<button type="button" class="btn btn-outline-danger remove-option" disabled>
									<i class="fa fa-times"></i>
								</button>
							</div>
							<div class="input-group mb-2">
								<input type="text" class="form-control poll-option" name="options[]" 
									   placeholder="Option 2" required maxlength="255">
								<button type="button" class="btn btn-outline-danger remove-option">
									<i class="fa fa-times"></i>
								</button>
							</div>
						</div>
						<button type="button" id="add-option" class="btn btn-outline-primary btn-sm">
							<i class="fa fa-plus"></i> Add Option
						</button>
						<div class="form-text">Add 2-10 options for users to choose from</div>
					</div>

					<div class="row mb-3">
						<div class="col-md-6">
							<div class="form-check">
								<input class="form-check-input" type="checkbox" id="multiple-choice" name="multipleChoice">
								<label class="form-check-label" for="multiple-choice">
									Allow multiple selections
								</label>
								<div class="form-text">Users can select more than one option</div>
							</div>
						</div>
						<div class="col-md-6">
							<div class="form-check">
								<input class="form-check-input" type="checkbox" id="anonymous" name="anonymous">
								<label class="form-check-label" for="anonymous">
									Anonymous voting
								</label>
								<div class="form-text">Hide voter identities</div>
							</div>
						</div>
					</div>

					<div class="mb-3">
						<label for="end-time" class="form-label">End Time (Optional)</label>
						<input type="datetime-local" class="form-control" id="end-time" name="endTime">
						<div class="form-text">Leave empty for no expiration</div>
					</div>

					<div class="d-flex gap-2">
						<button type="submit" class="btn btn-primary">
							<i class="fa fa-check"></i> Create Poll
						</button>
						<a href="{config.relative_path}/polls" class="btn btn-secondary">
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
// Immediately attach form handler
(function() {
	console.log('Poll create script executing');
	const form = document.getElementById('poll-create-form');

	if (!form) {
		console.log('poll-create-form not found, retrying...');
		// Retry after a short delay in case DOM isn't ready
		setTimeout(function() {
			const retryForm = document.getElementById('poll-create-form');
			if (retryForm) initForm(retryForm);
		}, 100);
	} else {
		initForm(form);
	}

	function initForm(form) {
		console.log('Poll create page loaded, initializing form');
		const optionsContainer = document.getElementById('poll-options');
		const addOptionBtn = document.getElementById('add-option');
		let optionCount = 2;

		console.log('Found poll-create-form');

		// Add option functionality
		addOptionBtn.addEventListener('click', function() {
			console.log('Adding new option');
			if (optionCount >= 10) {
				alert('Maximum 10 options allowed');
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
		optionsContainer.addEventListener('click', function(e) {
			if (e.target.closest('.remove-option')) {
				console.log('Removing option');
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
				input.placeholder = `Option ${index + 1}`;
			});
		}

		// Form submission
		form.addEventListener('submit', function(e) {
			console.log('Poll create form submitted');
			e.preventDefault();

			const formData = new FormData(form);
			const options = formData.getAll('options[]').filter(option => option.trim());
			console.log('Filtered options:', options);

			if (options.length < 2) {
				console.log('Not enough options');
				alert('Please provide at least 2 options');
				return;
			}

			if (!formData.get('title') || !formData.get('title').trim()) {
				console.log('No title');
				alert('Please provide a title');
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

			console.log('Sending data:', data);
			console.log('CSRF token:', config.csrf_token);

			fetch(config.relative_path + '/api/polls', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-Token': config.csrf_token
				},
				body: JSON.stringify(data)
			})
			.then(response => {
				console.log('Response status:', response.status);
				return response.json();
			})
			.then(data => {
				console.log('Response data:', data);
				if (data.status.code === 'ok') {
					console.log('Poll created successfully - redirecting');
					window.location.href = config.relative_path + '/polls';
				} else {
					console.log('Poll creation failed:', data.status.message);
					alert('Error: ' + (data.status.message || 'Failed to create poll'));
				}
			})
			.catch(error => {
				console.log('Network error:', error);
				alert('Error creating poll');
			});
		});
	}
})();
</script>

// Client-side voting for polls embedded in topic pages
'use strict';

define('polls/topic-vote', [], function() {
	function attachTopicVoteHandlers() {
		$(document).on('submit', '.poll-container form.poll-form', function(e) {
			e.preventDefault();

			const form = $(this);
			const pollContainer = form.closest('.poll-container');
			const pollId = pollContainer.data('poll-id');

			if (!pollId) {
				console.error('Poll ID not found');
				return;
			}

			// Get selected options
			const options = [];
			form.find('input[name="poll-option"]:checked').each(function() {
				options.push(parseInt($(this).val(), 10));
			});

			if (options.length === 0) {
				console.log('No options selected - silently do nothing');
				return;
			}

			console.log('Submitting vote for poll', pollId, 'options:', options);

			// Submit vote via AJAX
			fetch(`${config.relative_path}/api/polls/${pollId}/vote`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-csrf-token': config.csrf_token,
				},
				body: JSON.stringify({ options: options }),
			})
				.then(function(response) {
					console.log('Vote response status:', response.status);
					if (response.status === 200) {
						console.log('Vote recorded successfully - reloading to show results');
						// Reload the topic page to show updated results
						location.reload();
					} else {
						return response.json().then(function(data) {
							console.error('Vote failed:', data);
							// Show user-friendly error if needed
							const errorMsg = data.status && data.status.message ? data.status.message : 'Error submitting vote';
							if (errorMsg) {
								alert(errorMsg);
							}
						});
					}
				})
				.catch(function(error) {
					console.error('Vote submission error:', error);
					alert('Network error - please try again.');
				});
		});
	}

	function init() {
		console.log('Topic vote handler initialized');
		attachTopicVoteHandlers();
	}

	return {
		init: init,
	};
});

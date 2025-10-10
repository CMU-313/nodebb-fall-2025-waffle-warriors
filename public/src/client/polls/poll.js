'use strict';

define('forum/polls/poll', ['api'], function (api) {
	const Poll = {};

	Poll.init = function () {
		console.log('Poll page initialized');
		Poll.bindVotingEvents();
	};

	Poll.bindVotingEvents = function () {
		const voteButtons = document.querySelectorAll('[data-poll-vote]');
		voteButtons.forEach(button => {
			button.addEventListener('click', Poll.handleVote);
		});
	};

	Poll.handleVote = async function (e) {
		e.preventDefault();

		const button = e.target;
		const pollId = button.dataset.pollId;
		const optionId = button.dataset.pollVote;

		if (!pollId || !optionId) {
			console.error('Missing poll or option ID');
			return;
		}

		try {
			button.disabled = true;
			button.innerText = 'Voting...';

			const response = await api.post(`/polls/${pollId}/vote`, {
				options: optionId,
			});

			if (response.poll) {
				Poll.updatePollDisplay(response.poll);
			}

			button.innerText = 'Vote cast!';
			setTimeout(() => {
				button.disabled = false;
				button.innerText = 'Vote';
			}, 2000);

		} catch (error) {
			console.error('Voting failed:', error);
			button.disabled = false;
			button.innerText = 'Vote failed';

			if (error.message === '[[error:not-logged-in]]') {
				alert('You must be logged in to vote.');
			} else {
				alert('Failed to cast vote. Please try again.');
			}
		}
	};

	Poll.updatePollDisplay = function (pollData) {
		// Update vote counts for each option
		pollData.options.forEach((option, index) => {
			const optionEl = document.querySelector(`[data-option-id="${option.optionId || index}"]`);
			if (optionEl) {
				// Update vote count
				const voteCountEl = optionEl.querySelector('.vote-count');
				if (voteCountEl) {
					voteCountEl.textContent = `${option.votes} vote${option.votes !== 1 ? 's' : ''}`;
				}

				// Update percentage bar
				const progressEl = optionEl.querySelector('.progress-bar');
				if (progressEl) {
					progressEl.style.width = `${option.percentage}%`;
					progressEl.setAttribute('aria-valuenow', option.percentage);

					// Update the percentage text
					const percentageEl = optionEl.querySelector('.percentage-text');
					if (percentageEl) {
						percentageEl.textContent = `${option.percentage}%`;
					}
				}

				// If user has already voted, disable voting buttons
				if (pollData.hasVoted) {
					const voteButton = optionEl.querySelector('[data-poll-vote]');
					if (voteButton) {
						voteButton.disabled = true;
						voteButton.innerText = 'Voted';
					}
				}
			}
		});

		// Update total votes
		const totalVotesEl = document.querySelector('.total-votes');
		if (totalVotesEl) {
			totalVotesEl.textContent = `${pollData.totalVotes} total vote${pollData.totalVotes !== 1 ? 's' : ''}`;
		}
	};

	return Poll;
});

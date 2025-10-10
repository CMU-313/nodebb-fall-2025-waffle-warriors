// Client-side poll creation in composer
'use strict';

define('polls/composer', [], function() {
	function init() {
		// Toggle poll form visibility
		$(document).on('change', '#include-poll', function() {
			const isChecked = $(this).is(':checked');
			const pollContainer = $('#poll-form-container');

			if (isChecked) {
				pollContainer.slideDown();
			} else {
				pollContainer.slideUp();
			}
		});

		// Add new poll option
		$(document).on('click', '#add-poll-option-composer', function() {
			const optionsContainer = $('#poll-options-composer');
			const existingOptions = optionsContainer.find('.poll-option-composer').length;

			if (existingOptions >= 10) {
				alert('Maximum 10 poll options allowed');
				return;
			}

			const optionNumber = existingOptions + 1;
			const optionHtml = `
				<div class="input-group mb-2">
					<input type="text" class="form-control poll-option-composer"
						   name="poll[options][]" placeholder="Option ${optionNumber}" maxlength="255" required>
					<button type="button" class="btn btn-outline-danger remove-poll-option-composer">
						<i class="fa fa-times"></i>
					</button>
				</div>`;

			optionsContainer.append(optionHtml);

			// Update remove button states
			updateComposerRemoveButtons();

			// Update placeholders
			updateComposerPlaceholders();
		});

		// Remove poll option
		$(document).on('click', '.remove-poll-option-composer', function() {
			const optionsContainer = $('#poll-options-composer');
			const existingOptions = optionsContainer.find('.poll-option-composer').length;

			if (existingOptions <= 2) {
				alert('Poll must have at least 2 options');
				return;
			}

			$(this).closest('.input-group').remove();

			// Update remove button states and placeholders
			updateComposerRemoveButtons();
			updateComposerPlaceholders();
		});
	}

	function updateComposerRemoveButtons() {
		const options = $('#poll-options-composer .poll-option-composer');
		const removeButtons = $('#poll-options-composer .remove-poll-option-composer');

		removeButtons.prop('disabled', options.length <= 2);
	}

	function updateComposerPlaceholders() {
		$('#poll-options-composer .poll-option-composer').each(function(index) {
			$(this).attr('placeholder', `Option ${index + 1}`);
		});
	}

	return {
		init: init,
	};
});

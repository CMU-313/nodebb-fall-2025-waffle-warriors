'use strict';

$(document).ready(function () {
	console.log('Private posts script loaded');
    
	// Initialize private posts functionality
	initPrivatePosts();
});

function initPrivatePosts() {
	console.log('🔧 Initializing private posts functionality');
    
	// Hook into ajaxify events for SPA navigation
	$(window).on('action:ajaxify.end', function (ev, data) {
		console.log('🔄 Ajaxify end event:', data);
		setTimeout(addPrivatePostCheckbox, 300);
	});
    
	// Hook into composer events
	$(window).on('action:composer.loaded', function (ev, data) {
		console.log('📝 Composer loaded event:', data);
		setTimeout(addPrivatePostCheckbox, 200);
	});
    
	// Also trigger immediately
	setTimeout(addPrivatePostCheckbox, 1000);
    
	console.log('✅ Private posts initialization complete');
}

function addPrivatePostCheckbox() {
	console.log('=== PRIVATE POST CHECKBOX ===');
    
	// Check conditions
	const params = new URLSearchParams(window.location.search);
	const hasComposer = $('.composer').length > 0 || $('[component="composer"]').length > 0;
	const isNewTopic = params.has('cid') && !params.has('tid') && !params.has('pid');
	const isCategoryPage = window.location.pathname.includes('/category/');
    
	console.log('hasComposer:', hasComposer);
	console.log('isNewTopic:', isNewTopic);
	console.log('isCategoryPage:', isCategoryPage);
	console.log('URL:', window.location.href);
    
	// Skip if checkbox already exists
	if ($('.private-post-option').length > 0) {
		console.log('❌ Checkbox already exists');
		return;
	}
    
	// Only proceed if we have a composer and are creating a new topic
	if (hasComposer && (isNewTopic || isCategoryPage)) {
		console.log('Conditions met, looking for insertion point...');
        
		let insertionPoint = null;
		let insertionMethod = '';
        
		// Try multiple insertion strategies
		const strategies = [
			{
				name: 'After title container',
				selector: () => $('.composer .title-container, .composer .composer-title').last(),
				method: 'after',
			},
			{
				name: 'After title input group',
				selector: () => $('[component="composer/title"]').closest('.form-group, .mb-3, .row, div').last(),
				method: 'after',
			},
			{
				name: 'After first input group',
				selector: () => $('.composer input').first().closest('.form-group, .mb-3, .row, div'),
				method: 'after',
			},
			{
				name: 'Before submit button (using before)',
				selector: () => $('.composer .composer-submit'),
				method: 'before',
			},
			{
				name: 'Before submit button (using closest)',
				selector: () => $('.composer .composer-submit').closest('.form-group, .btn-toolbar, .composer-submit-container, div'),
				method: 'before',
			},
			{
				name: 'In composer body',
				selector: () => $('.composer .composer-body, .composer .write-container').first(),
				method: 'prepend',
			},
		];
        
		// Try each strategy until we find a good insertion point
		for (const strategy of strategies) {
			const element = strategy.selector();
			if (element && element.length > 0) {
				insertionPoint = element;
				insertionMethod = strategy.name;
				console.log('Insertion method:', insertionMethod);
				console.log('Insertion point:', insertionPoint);
				break;
			}
		}
        
		if (insertionPoint && insertionPoint.length > 0) {
			const checkboxHtml = `
                <div class="form-group mb-3 private-post-option">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="privatePostCheckbox" name="isPrivate">
                        <label class="form-check-label" for="privatePostCheckbox">
                            <i class="fa fa-lock text-warning me-1"></i>
                            <span class="fw-semibold">Make this post visible only to instructors</span>
                        </label>
                        <small class="form-text text-muted d-block mt-1">Private posts can only be viewed by the author and instructors</small>
                    </div>
                </div>
            `;
            
			// Apply the appropriate insertion method
			if (insertionMethod.includes('before')) {
				insertionPoint.before(checkboxHtml);
			} else if (insertionMethod.includes('prepend')) {
				insertionPoint.prepend(checkboxHtml);
			} else {
				insertionPoint.after(checkboxHtml);
			}
            
			console.log('✅ Checkbox added with method:', insertionMethod);
            
			// Scroll to make the checkbox visible
			setTimeout(() => {
				const checkbox = $('.private-post-option');
				if (checkbox.length > 0) {
					checkbox[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
					console.log('📍 Scrolled to checkbox');
				}
			}, 100);
            
			// Hook into form submission
			setupFormSubmissionHandler();
            
		} else {
			console.log('❌ No suitable insertion point found');
		}
	} else {
		console.log('❌ Conditions not met');
	}
}

function setupFormSubmissionHandler() {
	const composerForm = $('.composer').find('form');
	if (composerForm.length) {
		// Remove any existing handlers to avoid duplicates
		composerForm.off('submit.privatePost');
        
		composerForm.on('submit.privatePost', function () {
			console.log('🚀 Form submitted');
			const checkbox = $('#privatePostCheckbox');
			if (checkbox.length && checkbox.is(':checked')) {
				console.log('🔒 Private post checkbox is checked');
				// Add hidden field to form if not already present
				if (!composerForm.find('input[name="isPrivate"]').length) {
					composerForm.append('<input type="hidden" name="isPrivate" value="1">');
					console.log('✅ Added hidden isPrivate field');
				}
			}
		});
        
		console.log('✅ Form submission handler attached');
	}
}
'use strict';

$(document).ready(function() {
    initPrivatePosts();
});

function initPrivatePosts() {
    // Clean up any existing indicators when navigating
    $(window).on('action:ajaxify.start', function() {
        $('.private-post-banner, .private-post-badge').remove();
        $('.private-topic, .private-topic-listing').removeClass('private-topic private-topic-listing');
    });
    
    // Hook into ajaxify events for SPA navigation
    $(window).on('action:ajaxify.end', function(ev, data) {
        setTimeout(addPrivatePostCheckbox, 500);
        setTimeout(addPrivatePostIndicators, 800);
    });
    
    // Hook into composer events
    $(window).on('action:composer.loaded', function(ev, data) {
        setTimeout(addPrivatePostCheckbox, 300);
    });
    
    // Initialize with delay
    setTimeout(addPrivatePostCheckbox, 1500);
    setTimeout(addPrivatePostIndicators, 2000);
}

function addPrivatePostCheckbox() {
    // Check conditions
    const params = new URLSearchParams(window.location.search);
    const hasComposer = $('.composer').length > 0 || $('[component="composer"]').length > 0;
    const isNewTopic = params.has('cid') && !params.has('tid') && !params.has('pid');
    const isCategoryPage = window.location.pathname.includes('/category/');
    
    // Skip if checkbox already exists
    if ($('.private-post-option').length > 0) {
        return;
    }
    
    // Only proceed if we have a composer and are creating a new topic
    if (hasComposer && (isNewTopic || isCategoryPage)) {
        let insertionPoint = null;
        
        // Try multiple insertion strategies
        const strategies = [
            () => $('.composer .title-container, .composer .composer-title').last(),
            () => $('[component="composer/title"]').closest('.form-group, .mb-3, .row, div').last(),
            () => $('.composer input').first().closest('.form-group, .mb-3, .row, div'),
            () => $('.composer .composer-submit').closest('.form-group, .btn-toolbar, .composer-submit-container, div'),
            () => $('.composer .composer-body, .composer .write-container').first()
        ];
        
        // Try each strategy until we find a good insertion point
        for (const strategy of strategies) {
            const element = strategy();
            if (element && element.length > 0) {
                insertionPoint = element;
                break;
            }
        }
        
        if (insertionPoint && insertionPoint.length > 0) {
            const checkboxHtml = `
                <div class="form-group mb-3 private-post-option">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="privatePostCheckbox" name="isPrivate" value="1">
                        <label class="form-check-label" for="privatePostCheckbox">
                            <i class="fa fa-lock text-warning me-1"></i>
                            <span class="fw-semibold">Make this post visible only to instructors</span>
                        </label>
                        <small class="form-text text-muted d-block mt-1">Private posts can only be viewed by the author and instructors</small>
                    </div>
                </div>
            `;
            
            insertionPoint.after(checkboxHtml);
            
            // Scroll to make the checkbox visible
            setTimeout(() => {
                const checkbox = $('.private-post-option');
                if (checkbox.length > 0) {
                    checkbox[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
            
            // Hook into form submission
            setupFormSubmissionHandler();
        }
    }
}

function setupFormSubmissionHandler() {
    // Hook into NodeBB's composer submit filter hook using proper hooks system
    if (typeof window.require !== 'undefined') {
        try {
            window.require(['hooks'], function(hooks) {
                // Register the hook using NodeBB's proper hooks system
                hooks.on('filter:composer.submit', function(hookData) {
                    const checkbox = $('#privatePostCheckbox');
                    
                    if (checkbox.length && checkbox.is(':checked')) {
                        hookData.composerData.isPrivate = 1;
                    } else {
                        hookData.composerData.isPrivate = 0;
                    }
                    
                    return hookData;
                });
            });
        } catch (e) {
            // Fallback: Legacy form submission handler
            $('.composer').off('click.privatePost', '[component="composer/submit"]');
            $('.composer').on('click.privatePost', '[component="composer/submit"]', function(e) {
                const checkbox = $('#privatePostCheckbox');
                
                if (checkbox.length && checkbox.is(':checked')) {
                    // Set the checkbox name and value directly
                    checkbox.attr('name', 'isPrivate');
                    checkbox.attr('value', '1');
                    checkbox.prop('checked', true);
                    
                    // Add hidden field to form as backup
                    $('.composer').find('input[name="isPrivate"]').remove();
                    const hiddenField = $('<input type="hidden" name="isPrivate" value="1">');
                    $('.composer form, .composer').append(hiddenField);
                } else {
                    // Remove hidden field if checkbox is not checked
                    $('.composer').find('input[name="isPrivate"]').remove();
                }
            });
        }
    }
}

function addPrivatePostIndicators() {
    // Multiple ways to check if topic is private (for topic pages)
    let isPrivate = false;
    let dataSource = '';
    
    // Only do individual topic checks if we're on a topic page
    if (window.location.pathname.includes('/topic/')) {
        // Method 1: Check ajaxify data
        if (typeof ajaxify !== 'undefined' && ajaxify.data && ajaxify.data.isPrivate) {
            isPrivate = true;
            dataSource = 'ajaxify.data';
        }
        
        // Method 2: Check script tag with ajaxify data
        if (!isPrivate) {
            try {
                const ajaxifyScript = $('#ajaxify-data');
                if (ajaxifyScript.length) {
                    const data = JSON.parse(ajaxifyScript.text());
                    if (data && data.isPrivate) {
                        isPrivate = true;
                        dataSource = 'ajaxify-script';
                    }
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }
        
        // Method 3: Check for data attributes on the page
        if (!isPrivate) {
            const topicContainer = $('.topic, [component="topic"]');
            if (topicContainer.attr('data-private') === '1' || topicContainer.attr('data-private') === 'true') {
                isPrivate = true;
                dataSource = 'data-attribute';
            }
        }
        
        // Method 4: If all else fails, extract topic ID from URL and check via API
        if (!isPrivate) {
            const topicIdMatch = window.location.pathname.match(/\/topic\/(\d+)/);
            if (topicIdMatch) {
                const topicId = topicIdMatch[1];
                
                // Make a quick API call to check if topic is private
                $.ajax({
                    url: `/api/topic/${topicId}`,
                    method: 'GET',
                    success: function(data) {
                        if (data && data.isPrivate) {
                            isPrivate = true;
                            dataSource = 'api-call';
                            // Re-run the indicator logic with the confirmed data
                            addPrivateIndicatorsWithData(true, 'api-call');
                        }
                    },
                    error: function(xhr, status, error) {
                        // Silently fail
                    }
                });
            }
        }
        
        // Add indicators if topic is private
        if (isPrivate) {
            addPrivateIndicatorsWithData(isPrivate, dataSource);
        }
    }

    // ALWAYS check for topic listings on any page (home, category, etc.)
    $('[component="topic/item"], [component="category/topic"], li[data-tid]').each(function() {
        const $topic = $(this);
        const tid = $topic.attr('data-tid') || $topic.data('tid');
        const isPrivateFromAttr = $topic.data('private') === 1 || $topic.attr('data-private') === '1';
        
        if (isPrivateFromAttr) {
            const titleEl = $topic.find('[component="topic/title"], .topic-title, a[href*="/topic/"]');
            if (titleEl.length && !titleEl.find('.private-listing-indicator').length) {
                const privateIndicatorHtml = `
                    <span class="private-listing-indicator badge bg-danger text-white ms-2">
                        <i class="fa fa-lock me-1"></i>Private
                    </span>
                `;
                titleEl.append(privateIndicatorHtml);
            }
            
            // Add background styling to the entire topic row
            $topic.addClass('private-topic-listing');
        }
    });
    
    // Force check known private topics by making API calls for recent topics
    if (!window.location.pathname.includes('/topic/')) {
        $('[component="topic/item"], [component="category/topic"], li[data-tid]').each(function() {
            const $topic = $(this);
            const tid = $topic.attr('data-tid') || $topic.data('tid');
            
            if (tid && !$topic.find('.private-listing-indicator').length) {
                // Quick API check for this topic
                $.ajax({
                    url: `/api/topic/${tid}`,
                    method: 'GET',
                    success: function(data) {
                        if (data && data.isPrivate) {
                            const titleEl = $topic.find('[component="topic/title"], .topic-title, a[href*="/topic/"]');
                            if (titleEl.length && !titleEl.find('.private-listing-indicator').length) {
                                const privateIndicatorHtml = `
                                    <span class="private-listing-indicator badge bg-danger text-white ms-2">
                                        <i class="fa fa-lock me-1"></i>Private
                                    </span>
                                `;
                                titleEl.append(privateIndicatorHtml);
                            }
                            $topic.addClass('private-topic-listing');
                        }
                    },
                    error: function(xhr, status, error) {
                        // Silently fail for listing checks
                    }
                });
            }
        });
    }
    
    // Add CSS for listing indicators if not already added
    if (!$('#private-listing-styles').length) {
        $('head').append(`
            <style id="private-listing-styles">
            .private-topic-listing {
                background-color: #fff5f5;
                border-left: 3px solid #dc3545;
            }
            .private-listing-indicator {
                font-size: 0.7rem;
                vertical-align: top;
            }
            </style>
        `);
    }
}

function addPrivateIndicatorsWithData(isPrivate, dataSource) {
    if (!isPrivate) return;
    
    // Only add indicators if we're on a topic page
    if (!window.location.pathname.includes('/topic/')) {
        return;
    }
    
    // Add prominent "Private" badge next to topic title
    const topicTitle = $('[component="topic/title"]');
    if (topicTitle.length && !topicTitle.find('.private-post-badge').length) {
        const privateBadgeHtml = `
            <span class="private-post-badge badge bg-danger text-white ms-2 me-2">
                <i class="fa fa-lock me-1"></i>Private
            </span>
        `;
        topicTitle.append(privateBadgeHtml);
    }
    
    // Add notification banner if not already present - only in topic containers
    const topicContainer = $('.topic, [component="topic"]');
    if (topicContainer.length && !topicContainer.find('.private-post-banner').length) {
        const bannerHtml = `
            <div class="private-post-banner alert alert-danger d-flex align-items-center mb-3" role="alert">
                <i class="fa fa-lock me-2"></i>
                <div>
                    <div class="fw-bold">🔒 Private Post</div>
                    <div class="small">This post is only visible to the author and instructors.</div>
                </div>
            </div>
        `;
        
        topicContainer.first().prepend(bannerHtml);
    }
    
    // Add styling to make it more obvious - only to topic containers
    topicContainer.addClass('private-topic');
    
    // Add CSS for private topics if not already added
    if (!$('#private-posts-styles').length) {
        $('head').append(`
            <style id="private-posts-styles">
            .private-topic {
                border-left: 4px solid #dc3545;
                background-color: #fff5f5;
                padding-left: 1rem;
            }
            .private-post-badge {
                font-size: 0.8rem;
                vertical-align: middle;
                animation: pulse 2s infinite;
            }
            .private-post-banner {
                background-color: #f8d7da;
                border-color: #f5c6cb;
                color: #721c24;
            }
            .private-post-indicator {
                color: #dc3545;
                opacity: 0.9;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            </style>
        `);
    }
}
'use strict';

(async () => {
    const hooks = await app.require('hooks');

    hooks.on('action:app.load', () => {
        console.log('[Anonymous Button] NodeBB loaded');
    });

    hooks.on('action:composer.loaded', (evt, data) => {
        const composerEl = data.composerEl;
        if (!composerEl) return;

        // Add hidden input if not already present
        if (!composerEl.find('#is_anonymous').length) {
            composerEl.find('form').append('<input type="hidden" name="is_anonymous" id="is_anonymous" value="0">');
            console.log('[Anonymous Button] hidden input added');
        }

        // Add anonymous button
        const anonOption = { title: 'Anonymous', className: 'fa fa-user-secret' };
        if (!composerEl.find('.btn-anon').length) {
            const $button = $(`
                <button type="button" class="btn btn-sm btn-link btn-anon" tabindex="-1" title="${anonOption.title}">
                    <i class="${anonOption.className}"></i>
                </button>
            `);
            composerEl.find('.formatting-group').append($button);

            // Delegated click handler
            $button.on('click', () => {
                const $checkbox = composerEl.find('#is_anonymous');
                if (!$checkbox.length) return;

                const isAnon = $checkbox.val() === '1';
                $checkbox.val(isAnon ? '0' : '1');

                console.log('Checkbox value:', $checkbox.val());
                console.log(isAnon ? 'Posting as yourself' : 'Posting as Anonymous');
            });
        }
    });
})();










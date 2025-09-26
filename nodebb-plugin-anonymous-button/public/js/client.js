'use strict';

(function () {
    if (typeof window === 'undefined') return; // Only run in browser

    require(['composer', 'components'], () => {

        function toggleAnonButton($composer, $button) {
            let $hidden = $composer.find('input[name="is_anonymous"]');

            if (!$hidden.length) {
                $hidden = $('<input>', {
                    type: 'hidden',
                    name: 'is_anonymous',
                    value: 'false'
                }).appendTo($composer.find('form'));
            }

            const isAnon = $hidden.val() === 'true';
            $hidden.val(isAnon ? 'false' : 'true');

            $button.toggleClass('active-anonymous', !isAnon);
            console.log('[Anonymous Button] toggled, new value =', $hidden.val());
        }

        function setupAnonButtons($root) {
            $root.find('.formatting-group [data-format="AnonButton"]').each(function () {
                const $button = $(this);
                const $composer = $button.closest('.composer');

                $button.off('click').on('click', () => toggleAnonButton($composer, $button));

                // Initialize button state
                const $hidden = $composer.find('input[name="is_anonymous"]');
                if ($hidden.length && $hidden.val() === 'true') {
                    $button.addClass('active-anonymous');
                } else {
                    $button.removeClass('active-anonymous');
                }
            });
        }

        $(window).on('action:composer.enhanced action:ajaxify.end', () => setupAnonButtons($(document)));
    });
}());

















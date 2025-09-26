'use strict';

(function () {
    require(['components'], (components) => {

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

        function setupAnonButtons() {
            $('.formatting-group [data-format="AnonButton"]').each(function () {
                const $button = $(this);
                const $composer = $button.closest('.composer');

                const $hidden = $composer.find('input[name="is_anonymous"]');
                if ($hidden.length && $hidden.val() === 'true') {
                    $button.addClass('active-anonymous');
                } else {
                    $button.removeClass('active-anonymous');
                }

                $button.off('click').on('click', function () {
                    toggleAnonButton($composer, $button);
                });
            });
        }

        // Run when composer is enhanced or after AJAX navigation
        $(window).on('action:composer.enhanced action:ajaxify.end', setupAnonButtons);

    });
}());












'use strict';

const plugins = require('./plugins');

// Register hooks for private posts functionality
function init() {
	// Hook into topic creation to ensure isPrivate field is properly handled
	plugins.hooks.register('core', {
		hook: 'filter:topic.post',
		method: function (data) {
			console.log('🔍 HOOK: filter:topic.post triggered', data);
            
			// Ensure isPrivate field is properly set on the data object
			if (data.req && data.req.body && data.req.body.hasOwnProperty('isPrivate')) {
				data.isPrivate = data.req.body.isPrivate ? 1 : 0;
				console.log('✅ HOOK: Set isPrivate from req.body:', data.isPrivate);
			} else if (!data.hasOwnProperty('isPrivate')) {
				data.isPrivate = 0;
				console.log('🔧 HOOK: Set default isPrivate = 0');
			}
            
			console.log('📊 HOOK: Final data object:', data);
			return data;
		},
		priority: 5,
	});
    
	// Hook into composer data building
	plugins.hooks.register('core', {
		hook: 'filter:composer.build',
		method: function (data) {
			console.log('🏗️ HOOK: filter:composer.build triggered', data);
            
			// Add canCreatePrivate flag for new topics
			if (data.req && data.req.query && data.req.query.cid && !data.req.query.tid && !data.req.query.pid) {
				data.templateData.canCreatePrivate = true;
				console.log('✅ HOOK: Added canCreatePrivate flag');
			}
            
			return data;
		},
		priority: 10,
	});
    
	console.log('✅ Private posts hooks registered successfully');
}

module.exports = {
	init: init,
};
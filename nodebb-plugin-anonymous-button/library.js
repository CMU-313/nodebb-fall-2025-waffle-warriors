'use strict';

const db = require.main.require('./src/database');

const plugin = {};

/**
 * Add the "Anonymous" button to the composer formatting toolbar
 */
plugin.addComposerButton = function (payload, callback) {
    payload.options.push({
        name: 'AnonButton',            // matches main.js
        className: 'fa fa-user-secret',
        title: 'Anonymous'
    });
    callback(null, payload);
};

/**
 * On post creation, set the is_anonymous flag in the database
 */
plugin.addAnonymousFlag = async function (postData) {
    const isAnon = postData.is_anonymous === '1' || postData.is_anonymous === true;

    console.log(`[Anonymous] Post ${postData.post.pid}: is_anonymous = ${isAnon}`);

    await db.setObjectField(`post:${postData.post.pid}`, 'is_anonymous', isAnon);

    return postData;
};

module.exports = plugin;



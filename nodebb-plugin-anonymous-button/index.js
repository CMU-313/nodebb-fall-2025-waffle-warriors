'use strict';

const meta = require.main.require('./src/meta');
const db = require.main.require('./src/database');

module.exports = {
    init: async function (params, callback) {
        console.log('[Anonymous Button] plugin initialized');
        if (callback) callback();
    },

    addComposerButton: function (payload, callback) {
        payload.options.push({
            name: 'AnonButton',
            className: 'fa fa-user-secret',
            title: 'Anonymous',
        });
        console.log('[Anonymous Button] addComposerButton fired');
        callback(null, payload);
    },

    // Populate composer when editing posts
    populatePostData: function (postData, callback) {
        postData.is_anonymous = !!postData.data?.is_anonymous;
        console.log('[Anonymous Button] populatePostData is_anonymous =', postData.is_anonymous);
        callback(null, postData);
    },

    // Save to database when post is saved
    addAnonymousFlag: async function (postData) {
        const isAnon = postData.is_anonymous === true || postData.is_anonymous === 'true';

        if (postData.post && postData.post.pid) {
            await db.setObjectField(`post:${postData.post.pid}`, 'is_anonymous', isAnon);
            postData.post.is_anonymous = isAnon;
            console.log(`[Anonymous Button] addAnonymousFlag post ${postData.post.pid}: is_anonymous = ${isAnon}`);
        }

        return postData;
    },

    addConfig: async function (config) {
        const allow = await meta.settings.getOne('nodebb-plugin-anonymous-button', 'allow_anonymous');
        config.allow_anonymous = allow === '1' || allow === 'true' || allow === true;
        console.log('[Anonymous Button] addConfig fired');
        return config;
    }
};















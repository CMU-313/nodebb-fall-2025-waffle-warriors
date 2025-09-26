'use strict';

const postsAPI = require.main.require('./src/api/posts');

module.exports.anonymous = {
  toggle: async function(socket, data) {
    if (!socket.uid) {
      throw new Error('[[error:not-logged-in]]');
    }

    // example: emit a server-side event to mark post as anonymous
    const postData = {
      pid: data.pid,
      is_anonymous: data.is_anonymous
    };

    await postsAPI.edit(socket, postData);
  }
};

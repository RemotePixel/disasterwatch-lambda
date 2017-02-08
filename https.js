'use strict';
var request = require('request');

module.exports.toHTTPS = function(event, context, callback) {
    request(event.url, function (error, response, body) {
        if (!error && response.statusCode == 200) return callback(null, body);
        return callback(error);
    });
};

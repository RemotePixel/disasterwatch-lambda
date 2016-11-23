'use strict';
var request = require('request');

module.exports.toHTTPS = function(event, context) {

  request(event.url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      context.succeed(body);
    } else {
      context.fail(error);
    }
  })

};

'use strict';

var request = require('request');
var parse = require('wellknown');
var moment = require('moment');
var turf = require('turf');

var getParams = function (event) {
  var params = {};
  if (event.httpMethod === 'POST') {
    params = JSON.parse(event.body);
  } else if (event.queryStringParameters) {
    params = event.queryStringParameters;
  }

  return params
}

module.exports.getS1Images = function(event, context, callback) {

    var params = getParams(event),
        results = [];

    request({
        url: 'https://peps.cnes.fr/resto/api/collections/S1/search.json', //URL to hit
        qs:params
    }, function(err, response, data){
        if (!err && response.statusCode == 200) {
            if (data.hasOwnProperty('ErrorMessage')) {
                var response = {
                  statusCode: 400,
                  headers: {
                    "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
                  },
                  body: JSON.stringify({
                    errorMessage: 'PEPS api request failed',
                    results: [],
                  }),
                };
                callback(null, response);
            } else {
                data = JSON.parse(data);
                var i;
                for (i = 0; i < data.features.length; i += 1) {
                    var scene = {};
                    scene.sceneID = data.features[i].properties.title;
                    scene.sat = 'sentinel-1';
                    scene.date = moment(data.features[i].properties.startDate).utc().format("YYYY-MM-DD");
                    scene.fullDate = data.features[i].properties.startDate;
                    scene.mode = data.features[i].properties.sensorMode;
                    scene.geometry = data.features[i].geometry;
                    scene.orbType = data.features[i].properties.orbitDirection;
                    scene.polarisation = data.features[i].properties.polarisation;
                    scene.product = data.features[i].properties.productType;
                    if (scene.product !== 'SLC') continue;
                    scene.pepsURL = 'https://peps.cnes.fr/rocket/#/collections/S1/' +  data.features[i].id;
                    scene.pepsdownURL = data.features[i].properties.services.download.url;
                    //scene.pepsWMSURL = data.features[i].properties.services.layer.url;
                    scene.browseURL = data.features[i].properties.quicklook;
                    scene.refOrbit = data.features[i].properties.orbitNumber;
                    scene.orbit = data.features[i].properties.orbitNumber;
                    results.push(scene)
                }
            }
            var response = {
              statusCode: 200,
              headers: {
                "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
              },
              body: JSON.stringify({
                message: 'PEPS API request succeed',
                scenesFound: results.length,
                results: results,
              }),
            };
            callback(null, response);
        } else {
            var response = {
              statusCode: 500,
              headers: {
                "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
              },
              body: JSON.stringify({
                errorMessage: 'PEPS API request failed',
                results: [],
              }),
            };
            callback(null, response);
        }
    })
}

'use strict';

const request = require('request');
const moment = require('moment');

const getParams = function (event) {
    let params = {};
    if (event.httpMethod === 'POST') {
        params = JSON.parse(event.body);
    } else if (event.queryStringParameters) {
        params = event.queryStringParameters;
    }

    return params;
};

module.exports.S1search = function(event, context, callback) {

    const params = getParams(event);
    const results = [];

    request({
        url: 'https://peps.cnes.fr/resto/api/collections/S1/search.json',
        qs:params
    }, function(err, response, data){
        let outResponse;

        if (!err && response.statusCode == 200) {
            if (data.hasOwnProperty('ErrorMessage')) {
                outResponse = {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin' : '*'
                    },
                    body: JSON.stringify({
                        errorMessage: 'PEPS api request failed',
                        results: [],
                    }),
                };
            } else {
                data = JSON.parse(data);
                for (let i = 0; i < data.features.length; i += 1) {
                    const scene = {};
                    scene.sceneID = data.features[i].properties.title;
                    scene.sat = 'sentinel-1';
                    scene.date = moment(data.features[i].properties.startDate).utc().format('YYYY-MM-DD');
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
                    results.push(scene);
                }
                outResponse = {
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin' : '*'
                    },
                    body: JSON.stringify({
                        message: 'PEPS API request succeed',
                        scenesFound: results.length,
                        results: results,
                    }),
                };
            }

        } else {
            console.log(err);
            outResponse = {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin' : '*'
                },
                body: JSON.stringify({
                    errorMessage: 'PEPS API request failed',
                    results: [],
                }),
            };
        }

        return callback(null, outResponse);

    });
};

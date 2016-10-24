var request = require('superagent');
var parse = require('wellknown');
var moment = require('moment');
var config = require('./config');

function getAttribute(listTocheck, attribute) {
    return listTocheck.filter(function(e){
        return (e.name === attribute);
    })[0];
}

function sortScenes(a, b) {
    'use strict';
    return Date.parse(b.date) - Date.parse(a.date);
}

module.exports.getS1Images = function(feature, options, callback) {

    if (options && options.hasOwnProperty('dateStart')) {
        dateStart = moment(options.dateStart).utc().format("YYYY-MM-DDThh:mm:ss");
    } else {
        dateStart = '2016-01-01T00:00:00';
    }

    var results = []
        query = 'beginPosition:[' + dateStart + 'Z TO ' + moment.utc().format("YYYY-MM-DDThh:mm:ss") + 'Z] AND ' +
            'footprint:"Intersects(' + parse.stringify(feature) + ')" AND productType:SLC AND platformname:Sentinel-1';

    request.get('https://scihub.copernicus.eu/dhus/search')
        .auth(config.scihub.login, config.scihub.password)
        .timeout(15000)
        .query({
            format: 'json',
            rows: 1000,
            q: query
        })
        .end(function(error, response) {
            if (!error && response.statusCode == 200 && response.body.feed.entry) {
                for (var i = 0; i < response.body.feed.entry.length; i += 1) {
                    var data = response.body.feed.entry[i],
                        scene = {};

                    scene.sceneID = data.title;
                    scene.sat = 'sentinel1';
                    scene.date = moment(getAttribute(data.date, 'beginposition').content).utc().format('YYYY-MM-DD');
                    scene.fullDate = moment(getAttribute(data.date, 'beginposition').content).utc();
                    scene.mode = getAttribute(data.str, 'sensoroperationalmode').content;
                    scene.geometry = parse.parse(getAttribute(data.str, 'footprint').content);
                    scene.orbType = getAttribute(data.str, 'orbitdirection').content;
                    scene.polarisation = getAttribute(data.str, 'polarisationmode').content;
                    scene.browseURL = "https://disasterwatch.remotepixel.ca/img/sentinel1.jpg";
                    scene.product = getAttribute(data.str, 'producttype').content;
                    scene.esaURL = data.link.filter(function(e){return e.rel === 'alternative'})[0].href + '$value';
                    scene.downURL = data.link.filter(function(e){return e.rel === 'alternative'})[0].href + '$value';
                    scene.refOrbit = getAttribute(data.int, 'relativeorbitnumber').content;
                    scene.orbit = getAttribute(data.int, 'orbitnumber').content;
                    results.push(scene)
                }
                return callback(null, results);
            } else {
                console.log("Cannot connect to scihub api");
                return callback(null, results);
            }
        })
}

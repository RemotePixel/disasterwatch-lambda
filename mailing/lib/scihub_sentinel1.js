var request = require('request');
var turf = require('turf');
var moment = require('moment');
var config = require('./config');

module.exports.getS1Images = function(feature, options, callback) {
    if (options && options.hasOwnProperty('dateStart')) {
        dateStart = moment(options.dateStart).utc().format("YYYY-MM-DD");
    } else {
        dateStart = '2016-01-01';
    }
    var results = [],
        query = {
            startDate: dateStart,
            completionDate: moment.utc().format('YYYY-MM-DD'),
            productType: 'SLC',
            maxRecords: 200
        };

    if (feature.geometry.type === "Point") {
        query.lat = feature.geometry.coordinates[1];
        query.lon = feature.geometry.coordinates[0];
    } else {
        var bbox = turf.bbox(feature);
        query.box = bbox[0] + ',' + bbox[1] + ',' + bbox[2] + ',' + bbox[3];
    }

    request({
        url: 'https://peps.cnes.fr/resto/api/collections/S1/search.json', //URL to hit
        qs: query
    }, function(err, response, data){
        if (!err && response.statusCode == 200) {
            if (data.hasOwnProperty('ErrorMessage')) {
                console.log("Cannot connect to PEPS api");
                return callback(null, results);
            } else {
                data = JSON.parse(data);
                var i;
                for (i = 0; i < data.features.length; i += 1) {
                    var scene = {};
                    scene.sceneID = data.features[i].properties.title;
                    scene.sat = 'sentinel1';
                    scene.date = moment(data.features[i].properties.startDate).utc().format("YYYY-MM-DD");
                    scene.fullDate = data.features[i].properties.startDate;
                    scene.mode = data.features[i].properties.sensorMode;
                    scene.geometry = data.features[i].geometry;
                    scene.orbType = data.features[i].properties.orbitDirection;
                    scene.polarisation = data.features[i].properties.polarisation;
                    scene.product = data.features[i].properties.productType;
                    if (scene.product !== 'SLC') continue;
                    scene.downURL = 'https://peps.cnes.fr/rocket/#/collections/S1/' +  data.features[i].id;
                    scene.pepsdownURL = data.features[i].properties.services.download.url;
                    scene.browseURL = data.features[i].properties.quicklook;
                    scene.refOrbit = data.features[i].properties.orbitNumber;
                    scene.orbit = data.features[i].properties.orbitNumber;
                    results.push(scene)
                }
            }
            return callback(null, results);
        } else {
            console.log("Cannot connect to PEPS api");
            return callback(null, results);
        }
    })
}

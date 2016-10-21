var request = require('request');
var moment = require('moment');
var config = require('./config');

function zeroPad(n, c) {
    'use strict';
    var s = String(n);
    if (s.length < c) {
        return zeroPad('0' + n, c);
    }
    return s;
}

module.exports.getL8Images = function(feature, options, callback) {
    if (options && options.hasOwnProperty('dateStart')) {
        dateStart = moment(options.dateStart).utc().format("YYYY-MM-DD");
    } else {
        dateStart = '2016-01-01';
    }

    var results = [],
        query = {
                intersects: feature,
                satellite_name: 'landsat',
                date_from: dateStart,
                date_to: moment.utc().format('YYYY-MM-DD'),
                limit: 2000
            };

    request({
        url: 'https://api.developmentseed.org/satellites/', //URL to hit
        method: 'POST',
        json: query
    }, function(err, response, data){
        if (!err && response.statusCode == 200) {
            if (data.meta.found !== 0) {
                var i;
                for (i = 0; i < data.results.length; i += 1) {
                    var scene = {};
                    scene.date = data.results[i].date;
                    scene.cloud = data.results[i].cloud_coverage;
                    scene.sceneID = data.results[i].scene_id;
                    scene.sat = 'landsat8';
                    scene.path = data.results[i].path.toString();
                    scene.row = data.results[i].row.toString();
                    scene.grid = data.results[i].path + '/' + data.results[i].row;
                    scene.usgsURL = data.results[i].cartURL;
                    scene.browseURL = data.results[i].browseURL.replace('http://', "https://");
                    scene.AWSurl = 'http://landsat-pds.s3.amazonaws.com/L8/' + zeroPad(data.results[i].path, 3) + '/' + zeroPad(data.results[i].row, 3) + '/' + data.results[i].sceneID + '/';
                    scene.sumAWSurl = 'https://landsatonaws.com/L8/' + zeroPad(data.results[i].path, 3) + '/' + zeroPad(data.results[i].row, 3) + '/' + data.results[i].sceneID;
                    scene.downURL = 'https://landsatonaws.com/L8/' + zeroPad(data.results[i].path, 3) + '/' + zeroPad(data.results[i].row, 3) + '/' + data.results[i].sceneID;
                    results.push(scene);
                }
            }
            return callback(null, results);
        } else {
            console.log("Cannot connect to sat-api");
            return callback(null, results);
        }
    })
}

module.exports.getS2Images = function(feature, options, callback) {

    if (options && options.hasOwnProperty('dateStart')) {
        dateStart = moment(options.dateStart).utc().format("YYYY-MM-DD");
    } else {
        dateStart = '2016-01-01';
    }

    var results = [],
        query = {
                intersects: feature,
                satellite_name: 'sentinel',
                date_from: dateStart,
                date_to: moment.utc().format('YYYY-MM-DD'),
                limit: 2000
            };

    request({
        url: 'https://api.developmentseed.org/satellites/', //URL to hit
        method: 'POST',
        json: query
    }, function(err, response, data){
        if (!err && response.statusCode == 200) {
            if (data.hasOwnProperty('errorMessage')) {
                return callback(null, results);
            }
            if (data.meta.found !== 0) {
                var i;
                for (i = 0; i < data.results.length; i += 1) {
                    var scene = {};
                    scene.date = data.results[i].date;
                    scene.cloud = data.results[i].cloud_coverage;
                    scene.sceneID = data.results[i].scene_id;
                    scene.sat = 'sentinel2';
                    scene.utm_zone = data.results[i].utm_zone.toString();
                    scene.grid_square = data.results[i].grid_square;
                    scene.coverage = data.results[i].data_coverage_percentage;
                    scene.latitude_band = data.results[i].latitude_band;
                    scene.browseURL = data.results[i].thumbnail.replace('.jp2', ".jpg");
                    scene.path = data.results[i].aws_path.replace('tiles', "#tiles");
                    scene.AWSurl = 'http://sentinel-s2-l1c.s3-website.eu-central-1.amazonaws.com/' + scene.path + '/';
                    scene.downURL = 'http://sentinel-s2-l1c.s3-website.eu-central-1.amazonaws.com/' + scene.path + '/';
                    scene.grid = scene.utm_zone + scene.latitude_band + scene.grid_square;
                    results.push(scene);
                }
            }
            return callback(null, results);
        } else {
            console.log("Cannot connect to sat-api");
            return callback(null, results);
        }
    })
}

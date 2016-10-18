var request = require('superagent');
var parse = require('wellknown');
var moment = require('moment');
var config = require('./config');

//Freely adapted from https://github.com/oyvindym/earth-observation-api
function getAttribute(listTocheck, attribute) {
    return listTocheck.filter(function(e){
        return (e.name === attribute);
    })[0];
}

module.exports.getS1Images = function(event, context) {
    var results = [],
        query = 'beginPosition:[2016-01-01T00:00:00Z TO ' + moment.utc().format("YYYY-MM-DDThh:mm:ss") + 'Z] AND ' +
            'footprint:"Intersects(' + parse.stringify(event.body) + ')" AND productType:SLC AND platformname:Sentinel-1';

    request.get('https://scihub.copernicus.eu/dhus/search')
        .auth(config.auth.login, config.auth.password)
        .query({
            format: 'json',
            rows: 1000,
            q: query
        })
        .end(function(error, response) {
            if (!error && response.statusCode == 200) {
                if (response.body.feed.entry) {
                    for (var i = 0; i < response.body.feed.entry.length; i += 1) {
                        var data = response.body.feed.entry[i],
                            scene = {};

                        scene.sceneID = data.title;
                        scene.sat = 'sentinel-1';
                        scene.date = moment(getAttribute(data.date, 'beginposition').content).utc().format('YYYY-MM-DD');
                        scene.fullDate = moment(getAttribute(data.date, 'beginposition').content).utc();
                        scene.mode = getAttribute(data.str, 'sensoroperationalmode').content;
                        scene.geometry = parse.parse(getAttribute(data.str, 'footprint').content);
                        scene.orbType = getAttribute(data.str, 'orbitdirection').content;
                        scene.polarisation = getAttribute(data.str, 'polarisationmode').content;
                        scene.product = getAttribute(data.str, 'producttype').content;
                        scene.esaURL = data.link.filter(function(e){return e.rel === 'alternative'})[0].href + '$value';
                        scene.refOrbit = getAttribute(data.int, 'relativeorbitnumber').content;
                        scene.orbit = getAttribute(data.int, 'orbitnumber').content;
                        results.push(scene)
                    }
                }
                context.succeed({'scenes': results});
            } else {
                context.fail('Could not connect to scihub api');
            }
        })
}

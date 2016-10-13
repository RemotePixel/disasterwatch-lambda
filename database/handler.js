var mongodb = require('mongodb');
var config = require('./config');
var mongodbUri = 'mongodb://' + config.mongodb.login + ':' + config.mongodb.password + '@' + config.mongodb.host + ':' + config.mongodb.port + '/ddb';

//ADD (feature)
module.exports.add = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        var geojsonFeature = event.body,
            uuid = geojsonFeature.properties.uuid,
            mailTo = geojsonFeature.properties.mailTO;

        delete geojsonFeature.properties.mail;

        var disaster = {
            uuid: uuid,
            mail: [mailTo],
            feature: geojsonFeature
        };

        col.insert(disaster, function(err, docs){
            if (err) {
                console.log("Couldn't Add disasterEvent to database");
                context.fail(err);
            }
            db.close();

            //Confirmation MAIL to "mailTO"

            console.log("disasterEvent Added to database");
            context.succeed("disasterEvent Added to database");
            // context.done(null, "disasterEvent Added to database");
        });
    });
};

//UPDATE (id, feature)
module.exports.update = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');

        var geojsonFeature = event.body,
            uuid = geojsonFeature.properties.uuid,
            mailTo = geojsonFeature.properties.mailTO;

        delete geojsonFeature.properties.mail;

        col.updateOne({uuid: uuid}, {$push: {'mail': mailTo}, $set: {'feature': geojsonFeature}}, function(err, doc) {
            if (err) {
                console.log("Couldn't update disasterEvent");
                context.fail(err);
            }
            db.close();
            console.log("Successfully updated disasterEvent");
            //Confirmation MAIL to "event.mailTO"
            context.succeed("Successfully updated disasterEvent");
            // context.done(null, "Successfully updated disasterEvent");
        });
    });
};

//REMOVE (id)
module.exports.remove = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        col.deleteOne({uuid: event.body.uuid}, function(err, docs) {
            if (err) {
                console.log("Couldn't Remove disasterEvent from database");
                context.fail(err);
            }
            db.close();
            console.log("disasterEvent Removed from database");
            context.succeed("disasterEvent Removed from database");
            // context.done(null, "disasterEvent Removed from database");
        });
    });
};

//SUBSCRIBE (id, mail)
module.exports.subscribe = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        col.updateOne({uuid: event.body.uuid}, {$push: {'mail': event.body.mailTO}}, function(err, doc) {
            if (err) {
                console.log("Couldn't subscribe to disasterEvent");
                context.fail(err);
            }
            db.close();
            console.log("Successfully subscribed to disasterEvent");
            //Confirmation MAIL to "event.mailTO"
            context.succeed("Successfully subscribed to disasterEvent");
            // context.done(null, "Successfully subscribed to disasterEvent");
        });
    });
};

//UNSUBSCRIBE (id, mail)
module.exports.unsubscribe = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        col.updateOne({uuid: event.body.uuid}, {$pull: {'mail': event.body.mailTO}}, function(err, doc) {
            if (err) {
                console.log("Couldn't unsubscribe to disasterEvent");
                context.fail(err);
            }
            db.close();
            //Confirmation MAIL to "event.mailTO"
            console.log("Successfully unsubscribe to disasterEvent");
            context.succeed("Successfully unsubscribe to disasterEvent");
            // context.done(null, "Successfully unsubscribe to disasterEvent");
        });
    });
};

//toGEOJSON
module.exports.toGEOJSON = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        col.find({}).toArray(function(err, docs) {
            if (err) {
                console.log("Couldn't retrieve disasterEvent from database");
                context.fail(err);
            } else {
                var geojson = {
                    "type": "FeatureCollection",
                    "features": []
                };

                docs.forEach(function(doc) {
                    var feat = doc.feature;
                    geojson.features.push(feat)
                });
                context.succeed(geojson);
                // context.done(null, geojson);
            }
            db.close();
            console.log("Done");
        });
    });
};

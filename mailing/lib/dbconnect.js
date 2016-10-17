var mongodb = require('mongodb');
var config = require('./config');
var mongodbUri = 'mongodb://' + config.mongodb.login + ':' + config.mongodb.password + '@' + config.mongodb.host + ':' + config.mongodb.port + '/ddb';

//UPDATE (id, feature)
module.exports.imgDateUpdate = function(uuid, images, callback) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        col.updateOne({uuid: uuid}, {$set: {'feature.properties.images': images}}, function(err, doc) {
            if (err) {
                return callback(err);
            }
            return callback("Successfully updated disasterEvent");
            db.close();
        });
    });
};

module.exports.getDB = function(callback) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        col.find({mail: {$not: {$size: 0}}}).toArray(function(err, docs) {
            if (err) {
                console.log("Couldn't retrieve disasterEvent from database");
                return callback(err);
            } else {
                return callback(null, docs);
            }
            db.close();
        });
    });
};

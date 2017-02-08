const mongodb = require('mongodb');
const config = require('./config');
const mongodbUri = 'mongodb://' + config.mongodb.login + ':' + config.mongodb.password + '@' + config.mongodb.host + ':' + config.mongodb.port + '/ddb';

//UPDATE (id, feature)
module.exports.imgDateUpdate = function(uuid, images, callback) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        const col = db.collection('disasters');
        col.updateOne({uuid: uuid}, {$set: {'feature.properties.images': images}}, function(err) {
            db.close();
            if (err)  return callback(err);
            return callback('Successfully updated disasterEvent');
        });
    });
};

module.exports.getDB = function(callback) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        const col = db.collection('disasters');
        col.find({}).toArray(function(err, docs) {
            db.close();
            if (err) return callback(err);
            return callback(null, docs);
        });
    });
};

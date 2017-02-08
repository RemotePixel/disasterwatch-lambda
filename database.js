const mongodb = require('mongodb');
const mark = require('markup-js');
const aws = require('aws-sdk');
const fs = require('fs');

const config = require('./lib/config');
const mongodbUri = 'mongodb://' + config.mongodb.login + ':' + config.mongodb.password + '@' + config.mongodb.host + ':' + config.mongodb.port + '/ddb';

const ses = new aws.SES({region: 'us-west-2'});

function sendMail(content, callback) {
    ses.sendEmail(content, function (err) {
        if (err) callback('Internal Error: The email could not be sent');
        return callback(null, 'The email was successfully sent to ' + content.Destination.ToAddresses[0]);
    });
}

//ADD (feature)
module.exports.add = function(event, context, callback) {

    mongodb.MongoClient.connect(mongodbUri, function(err, db) {

        const col = db.collection('disasters');
        const geojsonFeature = event.body;
        const uuid = geojsonFeature.properties.uuid;
        const mail = geojsonFeature.properties.mail;

        delete geojsonFeature.properties.mail;

        const disaster = {
            uuid: uuid,
            mail: [],
            feature: geojsonFeature
        };

        if (mail) disaster.mail = [mail];

        col.insert(disaster, function(err){
            db.close();
            if (err) return callback(err);
            if (mail) {
                const mailTemplate = fs.readFileSync('./templates/subscribe.html', 'utf8');
                const info = {
                    name: disaster.feature.properties.name,
                    uuid: disaster.feature.properties.uuid,
                    mail: mail.mail
                };
                const message = mark.up(mailTemplate, info);
                const params = {
                    Destination: { ToAddresses: [info.mail] },
                    Message: {
                        Body: { Html: {Data: message, Charset: 'UTF-8'} },
                        Subject: {
                            Data: 'successfully subscribed to Event: ' + info.name,
                            Charset: 'UTF-8'
                        }
                    },
                    Source: 'disasterwatch@remotepixel.ca'
                };

                // Send the email
                sendMail(params, function(err) {
                    if (err) return callback(err);
                    return callback(null, {'Message': 'disasterEvent Added to database and mail sent'});
                });
            }
        });
    });
};

//UPDATE (id, feature)
module.exports.update = function(event, context, callback) {

    mongodb.MongoClient.connect(mongodbUri, function(err, db) {

        const col = db.collection('disasters');

        const geojsonFeature = event.body;
        const uuid = geojsonFeature.properties.uuid;
        const mail = geojsonFeature.properties.mail;

        delete geojsonFeature.properties.mail;

        if (mail) {
            col.updateOne({uuid: uuid}, {$push: {'mail': mail}, $set: {'feature': geojsonFeature}}, {upsert: true}, function(err) {
                db.close();
                if (err) return callback(err);

                const mailTemplate = fs.readFileSync('./templates/subscribe.html', 'utf8');
                const info = {
                    name: geojsonFeature.properties.name,
                    uuid: geojsonFeature.properties.uuid,
                    mail: mail.mail
                };
                const message = mark.up(mailTemplate, info);
                const params = {
                    Destination: {
                        ToAddresses: [info.mail]
                    },
                    Message: {
                        Body: {
                            Html: {Data: message, Charset: 'UTF-8'}
                        },
                        Subject: {
                            Data: 'successfully subscribed to Event: ' + info.name,
                            Charset: 'UTF-8'
                        }
                    },
                    Source: 'disasterwatch@remotepixel.ca'
                };

                // Send the email
                sendMail(params, function(err){
                    if (err) return callback(err);
                    return callback(null, {'Message': 'disasterEvent updated and mail sent'});
                });
            });
        } else {
            col.updateOne({uuid: uuid}, {$set: {'feature': geojsonFeature}}, {upsert: true}, function(err) {
                db.close();
                if (err) return callback(err);
                return callback(null, {'Message': 'Successfully updated disasterEvent'});
            });
        }
    });
};

//REMOVE (id)
module.exports.remove = function(event, context, callback) {

    mongodb.MongoClient.connect(mongodbUri, function(err, db) {

        const col = db.collection('disasters');
        col.deleteOne({uuid: event.body.uuid}, function(err) {
            db.close();
            if (err) return callback('Couldn\'t remove disasterEvent from database');
            return callback(null, {'Message': 'disasterEvent Removed from database'});
        });
    });
};

//SUBSCRIBE (id, mail)
module.exports.subscribe = function(event, context, callback) {

    mongodb.MongoClient.connect(mongodbUri, function(err, db) {

        const col = db.collection('disasters');

        col.updateOne({uuid: event.body.uuid}, {$push: {'mail': event.body.mail}}, function(err) {
            if (err) {
                db.close();
                return callback('Couldn\'t subscribe to disasterEvent');
            }

            setTimeout(function() {
                col.findOne({uuid: event.body.uuid}, function(err, item) {
                    const mailTemplate = fs.readFileSync('./templates/subscribe.html', 'utf8');
                    const info = {
                        name: item.feature.properties.name,
                        uuid: item.feature.properties.uuid,
                        mail: event.body.mail.mail
                    };
                    const message = mark.up(mailTemplate, info);
                    const params = {
                        Destination: {
                            ToAddresses: [info.mail]
                        },
                        Message: {
                            Body: {
                                Html: {Data: message, Charset: 'UTF-8'}
                            },
                            Subject: {
                                Data: 'successfully subscribed to Event: ' + info.name,
                                Charset: 'UTF-8'
                            }
                        },
                        Source: 'disasterwatch@remotepixel.ca'
                    };

                    db.close();

                    // Send the email
                    sendMail(params, function(err){
                        if (err) return callback('Couldn\'t subscribe to disasterEvent');
                        return callback(null, {'Message': 'Successfully subscribe to disasterEvent'});
                    });
                });
            }, 1000);
        });
    });
};

//UNSUBSCRIBE (id, mail)
module.exports.unsubscribe = function(event, context, callback) {

    mongodb.MongoClient.connect(mongodbUri, function(err, db) {

        const col = db.collection('disasters');

        col.updateOne({uuid: event.body.uuid}, {$pull: {'mail': {'mail': event.body.mail}}}, function(err) {
            if (err) {
                db.close();
                return callback('Couldn\'t unsubscribe to disasterEvent');
            }

            setTimeout(function() {
                // Fetch the document that we modified
                col.findOne({uuid: event.body.uuid}, function(err, item) {

                    const mailTemplate = fs.readFileSync('./templates/unsubscribe.html', 'utf8');
                    const info = {
                        name: item.feature.properties.name,
                        uuid: item.feature.properties.uuid
                    };
                    const message = mark.up(mailTemplate, info);
                    const params = {
                        Destination: {
                            ToAddresses: [event.body.mail]
                        },
                        Message: {
                            Body: {
                                Html: {Data: message, Charset: 'UTF-8'}
                            },
                            Subject: {
                                Data: 'successfully unsubscribed to Event: ' + info.name,
                                Charset: 'UTF-8'
                            }
                        },
                        Source: 'disasterwatch@remotepixel.ca'
                    };
                    db.close();

                    // Send the email
                    sendMail(params, function(err){
                        if (err) return callback('Couldn\'t unsubscribe to disasterEvent');
                        return callback(null, {'Message': 'Successfully unsubscribe to disasterEvent'});
                    });
                });
            }, 1000);
        });
    });
};

//toGEOJSON
module.exports.toGEOJSON = function(event, context, callback) {

    mongodb.MongoClient.connect(mongodbUri, function(err, db) {

        const col = db.collection('disasters');
        col.find({}).toArray(function(err, docs) {
            db.close();

            if (err) return callback('Couldn\'t retrieve disasterEvent from database');
            const geojson = {
                'type': 'FeatureCollection',
                'features': []
            };

            docs.forEach(function(doc) {
                var feat = doc.feature;
                feat.properties.nbfollowers = doc.mail.length;
                geojson.features.push(feat);
            });
            return callback(null, geojson);
        });
    });
};

module.exports.getEvent = function(event, context, callback) {

    mongodb.MongoClient.connect(mongodbUri, function(err, db) {

        const col = db.collection('disasters');
        col.find({uuid:event.query.uuid}).toArray(function(err, docs) {
            db.close();

            if (err) callback('Couldn\'t retrieve disasterEvent from database');

            const geojson = {
                'type': 'FeatureCollection',
                'features': []
            };

            docs.forEach(function(doc) {
                var feat = doc.feature;
                feat.properties.nbfollowers = doc.mail.length;
                geojson.features.push(feat);
            });

            return callback(null, geojson);

        });
    });
};

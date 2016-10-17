var mongodb = require('mongodb');
var mark = require('markup-js');
var aws = require('aws-sdk');
var fs = require('fs');

var config = require('./config');
var mongodbUri = 'mongodb://' + config.mongodb.login + ':' + config.mongodb.password + '@' + config.mongodb.host + ':' + config.mongodb.port + '/ddb';

var ses = new aws.SES({region: 'us-west-2'});

function sendMail(content, callback) {
    ses.sendEmail(content, function (err, data) {
        if (err) {
            console.log('Internal Error: The email could not be sent.');
            return callback(null, 'Internal Error: The email could not be sent.');
        } else {
            console.log('The email was successfully sent to ' + content.Destination.ToAddresses[0]);
            return callback(null, 'The email was successfully sent to ' + content.Destination.ToAddresses[0]);
        }
    });
}

//ADD (feature)
module.exports.add = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        var geojsonFeature = event.body,
            uuid = geojsonFeature.properties.uuid,
            mail = geojsonFeature.properties.mail;

        delete geojsonFeature.properties.mail;

        var disaster = {
            uuid: uuid,
            mail: [],
            feature: geojsonFeature
        };

        if (mail) {
            disaster.mail = [mail];
        }

        col.insert(disaster, function(err, res){
            if (err) {
                console.log("Couldn't Add disasterEvent to database");
                context.fail(err);
            }
            db.close();
            console.log("disasterEvent Added to database");

            if (mail) {
                var mailTemplate = fs.readFileSync('./templates/subscribe.html', 'utf8'),
                    info = {
                        name: disaster.feature.properties.name,
                        uuid: disaster.feature.properties.uuid,
                        mail: mail.mail
                    },
                    message = mark.up(mailTemplate, info),
                    params = {
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
                        Source: "disasterwatch@remotepixel.ca"
                    };

                // Send the email
                sendMail(params, function(err, res) {
                    if (err) {
                        context.succeed("disasterEvent Added to database but couldn't send Email");
                    }
                    context.succeed("disasterEvent Added to database and mail sent");
                });
            }
        });
    });
};

//UPDATE (id, feature)
module.exports.update = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');

        var geojsonFeature = event.body,
            uuid = geojsonFeature.properties.uuid,
            mail = geojsonFeature.properties.mail;

        delete geojsonFeature.properties.mail;

        if (mail) {
            col.updateOne({uuid: uuid}, {$push: {'mail': mail}, $set: {'feature': geojsonFeature}}, {upsert: true}, function(err, doc) {
                if (err) {
                    console.log("Couldn't update disasterEvent");
                    context.fail(err);
                }
                db.close();
                console.log("Successfully updated disasterEvent");
                //Confirmation MAIL to "event.mailTO"
                // context.succeed("Successfully updated disasterEvent");

                var mailTemplate = fs.readFileSync('./templates/subscribe.html', 'utf8'),
                    info = {
                        name: geojsonFeature.properties.name,
                        uuid: geojsonFeature.properties.uuid,
                        mail: mail.mail
                    },
                    message = mark.up(mailTemplate, info),
                    params = {
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
                        Source: "disasterwatch@remotepixel.ca"
                    };

                // Send the email
                sendMail(params, function(err, res){
                    if (err) {
                        context.succeed("disasterEvent updated but couldn't send Email");
                    }
                    context.succeed("disasterEvent updated and mail sent");
                });
            });
        } else {
            col.updateOne({uuid: uuid}, {$set: {'feature': geojsonFeature}}, {upsert: true}, function(err, doc) {
                if (err) {
                    console.log("Couldn't update disasterEvent");
                    context.fail(err);
                }
                db.close();
                console.log("Successfully updated disasterEvent");
                context.succeed("Successfully updated disasterEvent");
            });
        }
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
        });
    });
};

//SUBSCRIBE (id, mail)
module.exports.subscribe = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        col.updateOne({uuid: event.body.uuid}, {$push: {'mail': event.body.mail}}, function(err, doc) {
            if (err) {
                console.log("Couldn't subscribe to disasterEvent");
                context.fail(err);
            }

            console.log("Successfully subscribed to disasterEvent");

            setTimeout(function() {
              // Fetch the document that we modified
              col.findOne({uuid: event.body.uuid}, function(err, item) {
                  var mailTemplate = fs.readFileSync('./templates/subscribe.html', 'utf8'),
                      info = {
                          name: item.feature.properties.name,
                          uuid: item.feature.properties.uuid,
                          mail: event.body.mail.mail
                      },
                      message = mark.up(mailTemplate, info),
                      params = {
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
                          Source: "disasterwatch@remotepixel.ca"
                      };

                  // Send the email
                  sendMail(params, function(err, res){
                      if (err) {
                          context.succeed("Couldn't subscribe to disasterEvent");
                      }
                      context.succeed("Successfully subscribed to disasterEvent");
                  });
                db.close();
              });
            }, 1000);
        });
    });
};

//UNSUBSCRIBE (id, mail)
module.exports.unsubscribe = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');

        col.updateOne({uuid: event.body.uuid}, {$pull: {'mail': {'mail': event.body.mail}}}, function(err, doc) {
            if (err) {
                console.log("Couldn't unsubscribe to disasterEvent");
                context.fail(err);
            }
            console.log("Successfully unsubscribe to disasterEvent");
            setTimeout(function() {
              // Fetch the document that we modified
              col.findOne({uuid: event.body.uuid}, function(err, item) {
                  var mailTemplate = fs.readFileSync('./templates/unsubscribe.html', 'utf8'),
                      info = {
                          name: item.feature.properties.name,
                          uuid: item.feature.properties.uuid
                      },
                      message = mark.up(mailTemplate, info),
                      params = {
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
                          Source: "disasterwatch@remotepixel.ca"
                      };

                  // Send the email
                  sendMail(params, function(err, res){
                      if (err) {
                          context.succeed("Couldn't unsubscribe to disasterEvent");
                      }
                      context.succeed("Successfully unsubscribe to disasterEvent");
                  });
                db.close();
              });
            }, 1000);
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
                    feat.properties.nbfollowers = doc.mail.length;
                    geojson.features.push(feat)
                });
                context.succeed(geojson);
            }
            db.close();
            console.log("Done");
        });
    });
};

module.exports.getEvent = function(event, context) {
    mongodb.MongoClient.connect(mongodbUri, function(err, db) {
        var col = db.collection('disasters');
        col.find({uuid:event.body.uuid}).toArray(function(err, docs) {
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
                    feat.properties.nbfollowers = doc.mail.length;
                    geojson.features.push(feat)
                });
                context.succeed(geojson);
            }
            db.close();
            console.log("Done");
        });
    });
};

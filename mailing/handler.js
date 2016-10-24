var fs = require('fs');
var d3 = require('d3-queue');
var moment = require('moment');
var mark = require('markup-js');
var aws = require('aws-sdk');

var db = require('./lib/dbconnect.js');
var satapi = require('./lib/sat-api.js');
var scihubapi = require('./lib/scihub_sentinel1.js');

var ses = new aws.SES({region: 'us-west-2'});

function sortScenes(a, b) {
    return Date.parse(b.date) - Date.parse(a.date);
}

var mailTemplate = fs.readFileSync('./templates/images_update.html', 'utf8');

function construcMailInfo(prop, mail, images) {

    var imgTemplate = '<td valign="top" width="280" class="leftColumnContent">' +
                        '<table border="0" cellpadding="20" cellspacing="0" width="100%">' +
                            '<tr><td valign="top">' +
                                '<img src="{{browseURL}}" style="max-width:260px;"/>' +
                                '<div>' +
                                    '<strong>Satellite:</strong> {{satellite}}<br />' +
                                    '<strong>Date:</strong> {{date}}<br />' +
                                    '<strong>Cloud %:</strong> {{cloud}}<br />' +
                                    '<a href="{{downloadURL}}" target="_blank">link</a>' +
                                '</div></td>' +
                            '</tr></table></td>';

    var info = {
        nbImages : images.length,
        name: prop.name,
        uuid: prop.uuid,
        mail: mail.mail,
        imageslist : '<tr>'
    };

    for(var jj = 0; jj < images.length; jj++) {
        var imginfo = {

            browseURL: images[jj].browseURL,
            satellite: images[jj].sat,
            date: images[jj].date,
            cloud: (images[jj].sat !== 'sentinel1')? images[jj].cloud : '- ',
            downloadURL: images[jj].downURL
        }

        var imgBlock = mark.up(imgTemplate, imginfo);
        info.imageslist += imgBlock;
        if (jj % 2 === 1) info.imageslist += '</tr><tr>';
    }

    info.imageslist += '</tr>';

    return info;
}

function sendMail (content, callback) {
    ses.sendEmail(content, function (err, data) {
        if (err) {
            console.log('Internal Error: The email could not be sent.');
        } else {
            console.log('The email was successfully sent to ' + content.Destination.ToAddresses[0]);
            return callback(null, 'The email was successfully sent to ' + content.Destination.ToAddresses[0]);
        }
    });
}

function getImagery(doc, cb){

    var q = d3.queue();
    q.defer(scihubapi.getS1Images, doc.feature, {'dateStart': moment(doc.feature.properties.images.sentinel1).utc().add(1, 'days').format('YYYY-MM-DD')});
    q.defer(satapi.getL8Images, doc.feature, {'dateStart': moment(doc.feature.properties.images.landsat8).utc().add(1, 'days').format('YYYY-MM-DD')});
    q.defer(satapi.getS2Images, doc.feature, {'dateStart': moment(doc.feature.properties.images.sentinel2).utc().add(1, 'days').format('YYYY-MM-DD')});
    q.awaitAll(function(error, results) {
        var images = [];
        if (results.length !== 0) {
            for (var j = 0; j <results.length; j++) {
                if (results[j]) {
                    images = images.concat(results[j]);
                }
            }
        }
        images.sort(sortScenes);

        if (images.length === 0) {
            console.log('No new Image for event: ' + doc.feature.properties.name);
            return cb(null, 1)
        } else {
            console.log(images.length + ' new Image for event: ' + doc.feature.properties.name);

            var s1img = images.filter(function(e){
                return (e.sat === 'sentinel1');
            });

            var s2img = images.filter(function(e){
                return (e.sat === 'sentinel2');
            });

            var l8img = images.filter(function(e){
                return (e.sat === 'landsat8');
            });

            // update database
            if (s1img.length !== 0) {
                doc.feature.properties.images.sentinel1 = s1img[0].date;
            }
            if (s2img.length !== 0) {
                doc.feature.properties.images.sentinel2 = s2img[0].date;
            }
            if (l8img.length !== 0) {
                doc.feature.properties.images.landsat8 = l8img[0].date;
            }

            var q2 = d3.queue();
            for(var ii = 0; ii < doc.mail.length; ii++) {

                var img2send = images.filter(function(e){
                    console.log(e.sat, doc.mail[ii].satellite);
                    return (doc.mail[ii].satellite.indexOf(e.sat) > -1);
                });

                if (img2send.length === 0) {continue}

                var info = construcMailInfo(doc.feature.properties, doc.mail[ii], img2send),
                    message = mark.up(mailTemplate, info),
                    params = {
                        Destination: {
                            ToAddresses: [doc.mail[ii].mail]
                        },
                        Message: {
                            Body: {
                                Html: {Data: message, Charset: 'UTF-8'}
                            },
                            Subject: {
                                Data: 'New Images Available for Event: ' + info.name,
                                Charset: 'UTF-8'
                            }
                        },
                        Source: "disasterwatch@remotepixel.ca"
                    };

                    // Send the email
                    q2.defer(sendMail, params);
            }

            q2.awaitAll(function(error, results) {
                db.imgDateUpdate(doc.uuid, doc.feature.properties.images, function(err, res) {
                    return cb(null, 1);
                });
            });
        }
    });
}

module.exports.checkImagery = function (event, context) {
    db.getDB(function (err, docs) {
        if (err) {
            context.fail("Cannot connect to db");
        }
        var count = 0;

        for(var i = 0; i < docs.length; i++) {

            var doc = docs[i];

            getImagery(doc, function(err, res){
                console.log(res)
                count += 1
                if (count ===  docs.length){
                    context.succeed("Done");
                }
            })

        }
        if (docs.length === 0) {
            context.succeed("Done");
        }
    });
}

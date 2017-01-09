var shelltool = require("./lib/shelltools"),
    gcloudBuckets = require("./lib/buckets");

var shell = require("shelljs"),
    bluebird = require("bluebird"),
    moment = require("moment"),
    temporary = require("temporary");

var gstorage = require('@google-cloud/storage');


var fs = require('fs'),
    path = require("path"),
    url = require("url")
    ;

var Report = require("./lib/report");

function doBackup(configuration) {
    var reportName = configuration.reportName || "Unnamed";
    var report = new Report(reportName);
    var timestamp = moment().format("YYYYMMDD-HHmmss");

    var storage = gstorage({
        projectId: configuration.gCloudProjectId,
        keyFilename: configuration.gCloudKeyFilename
    });

    var currentName = "Unamed";
    var execArray = [];

    function addTaskArgument(arg) {
        switch (typeof arg) {
            case "string":
                currentName = arg;
                break;
            case "function":
                if (execArray.length>0 && execArray[execArray.length-1].name !== undefined) {
                    execArray.push({func:arg}); // skip the name if it's the same than the previous one
                } else {
                    execArray.push({
                        name: currentName,
                        func: arg
                    });
                }
                break;
            default:
                report.addError("Skipping unknown task of type " + typeof arguments[i]);
                break;
        }
    }

    for (var i=1; i<arguments.length; i++) {
        if (Array.isArray(arguments[i])) {
            arguments[i].forEach((arg) => addTaskArgument(arg));
        } else {
            addTaskArgument(arguments[i]);
        }
    }
    console.log("Using bucket name", configuration.gCloudBucket);
    var bucket = storage.bucket(configuration.gCloudBucket);

    return bluebird.Promise.each(execArray, function(entry) {

        var name = entry.name;
        var tmpDir = shelltool.createTemporary();

        return new bluebird.Promise((resolve, reject) => {
            report.log("== processing task " + name);
            try {
                entry.func(tmpDir, report);
            } catch(err) {
                report.addError(err);
                return resolve(report);
            }

            var tmpDirContent = fs.readdirSync(tmpDir);
            console.log("Archiving ", tmpDirContent.length, "entries");

            var BASENAME = `${name}-archive-${timestamp}`;

            var filename = `/tmp/${BASENAME}.tar`;

            shelltool.cd(tmpDir, () => {
                shelltool.runShell(`tar cvf ${filename} .`, true);
            });
            console.log(`Compressing archive ${filename}...`);
            filename = shelltool.bzip2(filename, true);
            if (configuration.aesKey) {
                console.log(`Encrypting ${filename} with aes...`);
                var uncryptedFilename = filename;
                filename = shelltool.cryptAES(filename, filename + ".crypted", configuration.aesKey);
                shell.rm(uncryptedFilename);
            }
            shell.rm('-fr', tmpDir);

            var remoteFilePath = path.basename(filename);
            if (configuration.bucketSubdir) {
                remoteFilePath = path.join(configuration.bucketSubdir, remoteFilePath);
            }
            bucket.upload(filename, function(err,file){
                console.log("DONE", err, file);
            });

        })
    }).then(() => report);

}
function convertWriteStreamToPromise(stream) {
    return new bluebird.Promise(function (resolve, reject) {
        stream.on("finish", resolve);
        stream.on("error", reject);
    });
}

function restore(configuration) {
    var storage = gstorage({
        projectId: configuration.gCloudProjectId,
        keyFilename: configuration.gCloudKeyFilename
    });

    var bucket = storage.bucket(configuration.gCloudBucket);

    return new bluebird.Promise((resolve, reject) => {

        gcloudBuckets.listFiles(bucket, configuration.bucketSubdir)
            .then((files)=>{
                // sort results by timestamp
                files = files
                    .sort((file1, file2) => file2.metadata.timeCreated.localeCompare(file1.metadata.timeCreated))
                    .filter((file) => parseInt(file.metadata.size)>0)
                ;
                if (files.length > 0) {
                    var file = files[0];
                    var localPath = path.basename(file.metadata.name);
                    console.log("\nDownloading", localPath);
                    file.download({
                        destination: localPath
                    }, function(err) {
                        console.log("Download complete (", err, ")");
                        if (err) {
                            return reject(err);
                        }

                        if (configuration.aesKey && file.metadata.name.endsWith('.crypted')) {
                            var decryptedPath = path.basename(localPath, ".crypted");
                            console.log("Decrypting file as", decryptedPath);
                            shelltool.decryptAES(localPath, decryptedPath, configuration.aesKey);
                            shell.rm(localPath);
                            resolve(decryptedPath);
                        } else {
                            resolve(localPath);
                        }
                    })
                } else {
                    console.log('No matching file');
                    reject();
                }
            })
            .error((err)=>{
                reject(err);
            });

    });

}

exports.doBackup = doBackup;
exports.restore = restore;
exports.cd = shelltool.cd;
exports.runShell = shelltool.runShell;
exports.createTemporary = shelltool.createTemporary;
exports.cleanup = shelltool.cleanup;
exports.bzip2 = shelltool.bzip2;
exports.bunzip2 = shelltool.bunzip2;
exports.cryptAES = shelltool.cryptAES;
exports.decryptAES = shelltool.decryptAES;
exports.getUserHome = shelltool.getUserHome;

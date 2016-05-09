var shelltool = require("./lib/shelltools"),
    gcloudBuckets = require("./lib/buckets");

var shell = require("shelljs"),
    bluebird = require("bluebird"),
    moment = require("moment"),
    gcloud = require('gcloud'),
    temporary = require("temporary");

var fs = require('fs'),
    path = require("path"),
    url = require("url")
    ;

var Report = require("./lib/report");

function doBackup(configuration, name, bodyFunction) {
    var report = new Report(name);
    var tmpDir = shelltool.createTemporary();
    var timestamp = moment().format("YYYYMMDD-HHmmss");

    var storage = gcloud.storage({
        projectId: configuration.gCloudProjectId,
        keyFilename: configuration.gCloudKeyFilename
    });

    return new bluebird.Promise((resolve, reject) => {
        var bucket = storage.bucket(configuration.gCloudBucket);

        bodyFunction(tmpDir, report);

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

        console.log("Uploading", filename, "to", remoteFilePath, "...");
        var localReadStream = fs.createReadStream(filename);
        var remoteWriteStream = bucket.file(remoteFilePath).createWriteStream();
        var pipeStream = localReadStream.pipe(remoteWriteStream);

        convertWriteStreamToPromise(pipeStream)
            .then(()=> {
                shell.rm(filename);
                report.log(`Uploaded file ${remoteFilePath}`)
                report.log(`Backup operation ${name} successful`);
                resolve(report);
            })
            .error(()=>{
                console.error("!!! Failed to upload to google cloud storage");
                shell.rm(filename);
                report.addError(`Backup operation ${name} failed`);
                reject(report);
            })
        ;

    });
}


function convertWriteStreamToPromise(stream) {
    return new bluebird.Promise(function (resolve, reject) {
        stream.on("finish", resolve);
        stream.on("error", reject);
    });
}

function restore(configuration) {
    var storage = gcloud.storage({
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

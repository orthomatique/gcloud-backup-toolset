var gcloud = require('gcloud'),
    bluebird = require("bluebird")
;

function listFiles(bucket, prefix) {

    return new bluebird.Promise((resolve, reject) => {
        var list = [];

        function readResponse(err, files, nextQuery, apiResponse) {
            if (err) {
                reject(err)
            } else {
                console.log("intermediate results:", files.length);
                // list = list.concat(files);
                files.forEach((file)=> {
                    console.log("added ", file.metadata.name);
                    list.push(file);
                });
                if (nextQuery) {
                    bucket.getFiles(nextQuery, readResponse);
                } else {
                    resolve(list);
                }
            }
        }

        bucket.getFiles({
            maxResults: 50,
            prefix: prefix
        }, readResponse);
    });

}


module.exports.listFiles = listFiles;
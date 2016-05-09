# gcloud-backup-toolset

This package provides a toolset to create backups and store them with the google cloud storage service.
Note that this is not an application to create backup, it requires some code writing.

### Requirements

ES2015 is required (arrow functions and string templates mainly), so you need a recent
version of node.

## Install

Directly from github

    npm install git+https://git@github.com:reyesr/gcloud-backup-toolset.git

## Creating a backup

This package works by providing a toolset that does most of the work of creating
a backup. Here is a template backup file

    var configuration = {
        gCloudProjectId: "your-gcloudId-12345",
        gCloudKeyFilename: 'yourkeyfile-ab1234567890.json',
        gCloudBucket: "my-bucket-name",
        bucketSubdir: "optional-directory-name",
        aesKey: "LOzKM6wlcd3NlSPjoEXfSbJimJXtwtLgGawTLjCpzHoTQMcHX4xN9YX97KRjNEO1"
    };

    // tmpDir is a directory where you can store all the files to archive
    // report is a report object you can user for logs and error
    lib.doBackup(configuration, "my-backup-name", (tmpDir, report) => {
        // add files to tmpDir here
    }).then((report)=>{
        console.log("backup complete");
        console.log(report.toString())
    });

The configuration should contain at least the following keys:

- gCloudProjectId
- gCloudKeyFilename
- gCloudBucket

The following keys are optional

- aesKey: a string that contains the AES key
- bucketSubdir: a subdirectory in the google cloud bucket where the backup should be store

## Restoring an archive

This is very similar to the backup, except it loads and decrypts the most recent file
in the bucket (or in the subdirectory of the bucket, if specified)

    var configuration = {
        gCloudProjectId: "your-gcloudId-12345",
        gCloudKeyFilename: 'yourkeyfile-ab1234567890.json',
        gCloudBucket: "my-bucket-name",
        bucketSubdir: "optional-directory-name",
        aesKey: "LOzKM6wlcd3NlSPjoEXfSbJimJXtwtLgGawTLjCpzHoTQMcHX4xN9YX97KRjNEO1" */
    };

    lib.restore(configuration)
        .then((file) => {
            console.log("File available:", file);
        })
        .error((err)=>{
            console.log("!!! Failed:", err);
        });


# gcloud-backup-toolset

This package provides a toolset to create backups and store them with the google cloud storage service.
Note that this is not an application to create backups, it's a toolset that requires to develop in javascript the recipe to collect the
data to backup. It takes care of tarring, compressing, encrypting the data, and uploading it to your google cloud storage
bucket.

### Requirements

ES2015 is required (arrow functions and string templates mainly), so you need a recent
version of node.

## Install

From the npm registry

    npm install --save gcloud-backup-toolset

Directly from github

    npm install git+https://git@github.com:reyesr/gcloud-backup-toolset.git

## Creating a backup

This package works by providing a toolset that does most of the common work involved in the process
of creating a backup. Here is a template backup file

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

- reportName: a string to use as report name (default: "unnamed")
- aesKey: a string that contains the AES key. If no aesKey is provided, the backup is not encrypted.
- bucketSubdir: a subdirectory in the google cloud bucket where the backup should be store


### Calling doBackup()

The function accepts multiple arguments

    doBackup(configuration, taskArgument...)

- configuration is a configuration object
- Any argument after configuraton should be either
  * a string: it sets a name for the following task(s)
  * a function: a function to process the archiving. The doBackup function calls it
  with two arguments: a temporary folder (the function needs to put every file and folder
  to backup in it, doBackup then tars and bzip2 it), and a report object for reporting and
   logging.
  * If an array if provided, it is processed as a list of string/function

Example

    doBackup(configuration, "my first task", someFunction, "Another task", anotherFunction, thirdFunction);

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


## Reporting

TODO

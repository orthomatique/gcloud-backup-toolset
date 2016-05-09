var shell = require("shelljs"),
    bluebird = require("bluebird"),
    moment = require("moment"),
    gcloud = require('gcloud'),
    temporary = require("temporary");
var fs = require('fs'),
    path = require("path");

var deletionPending = [];

function cleanup() {
    deletionPending.forEach(function (path) {
        console.log("CleanUp: removing path [" + path + "]");
        shell.rm("-rf", path);
    });
}

/**
 * Create a temp dir and remember it for delayed removal
 * @returns {string|Array|*}
 */
function createTemporary() {
    var tmpdir = new temporary.Dir().path;
    deletionPending.push(tmpdir);
    return tmpdir;
}

/**
 * Run a shell command and optionally verifies a file was correctly created by the command
 * @param command
 * @param silent
 * @param expectedfile
 * @returns {*}
 */
function runShell(command, silent, expectedfile) {
    silent = silent !== undefined ? silent : false;
    if (Array.isArray(command)) {
        var c = "";
        command.forEach(function (el) {
            c = c + el + " ";
        });
        command = c;
    }
    try {
        var res = shell.exec(command, {silent: silent});
        if (res.code != 0) {
            console.log("Error executing [" + command + "]");
            throw new Error("Command [" + command + "] returned code " + res.code);
        }
        if ((expectedfile !== undefined) && (fs.existsSync(expectedfile) != true)) {
            console.log("Error executing [" + command + "]");
            throw Error("Expected [" + expectedfile + "] was not created");
        }
        return res.output;
    } catch (err) {
        console.error(err.toString(), err.stack);
    }
}

/**
 * Set the current directory to a new location, and synchronously executes a callback.
 * When the callback returns, the current dir returns to its original location.
 * @param dir
 * @param callback
 * @returns {*}
 */
function cd(dir, callback) {
    var previousDir = process.cwd();
    process.chdir(dir);
    if (callback !== undefined) {
        callback();
        process.chdir(previousDir);
    }
    return previousDir;
}

/**
 * Uses the bzip2 command to compress a file
 * @param file a filepath
 * @returns {string} the path of the compressed file
 */
function bzip2(file) {
    var target = file + ".bz2";
    var cmdline = "bzip2 -z -f -v --best " + file;
    console.log("bzip2: ", cmdline);
    runShell(cmdline, false, target);
    return target;
}

/**
 * Uses the bunzip2 command to uncompress a file
 * @param file a filepath
 * @returns {*} the path of the uncompressed file
 */
function bunzip2(file) {
    var ext = path.extname(file);
    var newpath = path.basename(file, ext);
    var cmdline = "bunzip2 " + file;
    console.log("bzip2: ", cmdline);
    runShell(cmdline, false, newpath);
    return newpath;
}

/**
 * Uses openssl to encrypt a file using an AES key (in AES 256 CBC mode)
 * @param inFile the path of the file to crypt
 * @param outFile the file path of the encrypted target
 * @param pass the AES key (as a string). Should be at least 256 bits (32 chars)
 * @returns {*} the path of the encrypted file
 */
function cryptAES(inFile, outFile, pass) {
    var cmdline = "openssl enc -e -aes-256-cbc -pass pass:" + pass + " -in " + inFile + " -out " + outFile;
    runShell(cmdline);
    return outFile;
}

/**
 * Uses openssl to decrypt a file using an AES key (in AES 256 CBC mode)
 * @param inFile the file path of the encrypted file to decrypt
 * @param outFile the location of the decrypted file
 * @param pass the AES key (as a string). Should be at least 256 bits (32 chars)
 * @returns {*} the path of the decrypted file
 */
function decryptAES(inFile, outFile, pass) {
    var cmdline = "openssl enc -d -aes-256-cbc -pass pass:" + pass + " -in " + inFile + " -out " + outFile;
    runShell(cmdline);
    return outFile;
}

var userHome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

function getUserHome() {
    return userHome;
}

exports.cd = cd;
exports.runShell = runShell;
exports.createTemporary = createTemporary;
exports.cleanup = cleanup;
exports.bzip2 = bzip2;
exports.bunzip2 = bunzip2;
exports.cryptAES = cryptAES;
exports.decryptAES = decryptAES;
exports.getUserHome = getUserHome;

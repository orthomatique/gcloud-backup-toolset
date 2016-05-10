var moment = require("moment"),
    timediff = require("timediff");

function Report(name) {
    if (!(this instanceof Report)) {
        return new Report();
    }
    this.name = name || "Report";
    this.logs = [];
    this.errorMessages = [];
    this.created = new Date();
}

Report.prototype.addError = function(err) {
    this.errorMessages.push(err);
    this.log("** ERROR: " + err);
};

Report.prototype.hasError = function() {
    return this.errorMessages.length>0;
};

Report.prototype.checkError = function(err) {
    if (err && err.toString && typeof err.toString == "function") {
        this.errorMessages.push(err.toString());
    }
};

Report.prototype.logSection = function(title) {
    var txt = "\n"+title + "\n";
    for (var i = 0,max=title.length; i<max; i+=1){
        txt += "=";
    }
    txt += "\n";
    console.log(txt);
    this.logs.push(txt);
};


Report.prototype.log = function(str) {
    console.log(str);
    this.logs.push(str);
};

Report.prototype.toString = function() {
    var elapsed = timediff(this.created, 'now', "mS");
    var buffer = "Report for " + this.name + " on " + moment().format("YYYY-MM-DD HH:mm:ss") + "\n";

    buffer += "   Total elapsed time: " + (elapsed.minutes>0?(elapsed.minutes + " min, "):"") + elapsed.seconds + " sec\n\n";

    if (this.errorMessages.length>0) {
        buffer += "================================\n";
        buffer += "==   REPORT ERROR !!!         ==\n";
        buffer += "================================\n";
        buffer += "\nList of error messages below:\n" + this.errorMessages.map(function(err){return err.toString();}).join("\n") + "\n\n";
    } else {
        buffer += " ** No error, all is fine **\n\n";
    }

    buffer += this.logs.join("\n");

    return buffer;
};

module.exports = Report;
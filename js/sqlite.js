const Database = require('better-sqlite3');
const fs = require('fs');
var db;

const RESET_DB = false;
const BACKUP_DB = true;

if (!fs.existsSync('db')) {
    fs.mkdirSync('db');
} else {
    if (fs.existsSync('db/db.db')) {
        if (BACKUP_DB) {
            db = new Database('db/db.db');
            const date = new Date().toLocaleDateString().replaceAll('/','-');
            
            db.backup(`db/backup-${date}.db`)
            .then(() => {
                console.log('backup complete!');
            })
            .catch((err) => {
                console.log('backup failed:', err);
            });
        }
        if (RESET_DB) fs.unlinkSync('db/db.db');
    }
}

if (!fs.existsSync('db/db.db')) {
    db = new Database('db/db.db');
    db.exec(`
        CREATE TABLE "posts" (
            "post_id"	INTEGER,
            "timestamp"	TEXT,
            "author"	TEXT,
            "body"	TEXT,
            "author_path"	TEXT,
            "path"	TEXT,
            "replying_to" TEXT,
            "live"	INTEGER,
            PRIMARY KEY("post_id")
        );
        CREATE TABLE "subscriptions" (
            "subscription_id"	INTEGER,
            "timestamp"	TEXT,
            "json"	TEXT,
            "endpoint"	TEXT,
            PRIMARY KEY("subscription_id")
        );
    `);
} else {
    db = new Database('db/db.db');
}

exports.db = db;

exports.insert = (table, obj) => {
    var keynames = "";
    var keys = "";
    for (let key in obj) {
        keynames += key + ",";
        keys += "@" + key + ",";
    }
    keynames = keynames.slice(0, -1);
    keys = keys.slice(0, -1);

    const stmt = db.prepare("INSERT INTO " + table + "(" + keynames + ") VALUES (" + keys + ")");
    return stmt.run(obj);
}

exports.delete = (table, obj) => {
    var conditions = "";
    for (let key in obj) {
        conditions += "WHERE " + key + "=@" + key + " AND ";
    }
    conditions = conditions.slice(0, -5);

    const stmt = db.prepare("DELETE FROM " + table + " " + conditions);
    return stmt.run(obj);
}

exports.update = (table, where, set) => {
    var obj = {};

    var where_conditions = "";
    for (let key in where) {
        obj["where_"+key] = where[key];
        where_conditions += key + "=@where_" + key + ", ";
    }
    where_conditions = where_conditions.slice(0, -2);

    var set_conditions = "";
    for (let key in set) {
        obj["set_"+key] = set[key];
        set_conditions += key + "=@set_" + key + ", ";
    }
    set_conditions = set_conditions.slice(0, -2);

    const stmt = db.prepare("UPDATE " + table + " SET " + set_conditions + " WHERE " + where_conditions);
    return stmt.run(obj);
}

exports.query = (table, obj) => {
    var conditions = "";
    for (let key in obj) {
        conditions += "WHERE " + key + "=@" + key + " AND ";
    }
    conditions = conditions.slice(0, -5);

    const stmt = db.prepare("SELECT * FROM " + table + " " + conditions);
    return stmt.get(obj);
}

exports.queryall = (table, obj, additional) => {
    var conditions = "";
    for (let key in obj) {
        conditions += "WHERE " + key + "=@" + key + " AND ";
    }
    conditions = conditions.slice(0, -5);

    if (additional) conditions += " " + additional;

    const stmt = db.prepare("SELECT * FROM " + table + " " + conditions);

    return stmt.all(obj);
}
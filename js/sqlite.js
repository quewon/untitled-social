const Database = require('better-sqlite3');
const fs = require('fs');
var db;

const RESET_DB = true;

if (!fs.existsSync('db')) fs.mkdirSync('db');
if (RESET_DB) fs.unlinkSync('db/db.db');
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
            PRIMARY KEY("post_id")
        );
        CREATE TABLE "temp_media" (
            "path"	TEXT,
            "post_id"	INTEGER,
            "confirmed"	INTEGER
        )
    `);
} else {
    db = new Database('db/db.db');
}

exports.db = db;

exports.insert = async (db, table, obj) => {
    var keynames = "";
    var keys = "";
    for (let key in obj) {
        keynames += key + ",";
        keys += "@" + key + ",";
    }
    keynames = keynames.slice(0, -1);
    keys = keys.slice(0, -1);

    const stmt = db.prepare("INSERT INTO " + table + "(" + keynames + ") VALUES (" + keys + ")");

    return new Promise((resolve, reject) => {
        const info = stmt.run(obj);
        resolve(info);
    });
}

exports.delete = async (db, table, obj) => {
    var conditions = "";
    for (let key in obj) {
        conditions += "WHERE " + key + "=@" + key + " AND ";
    }
    conditions = conditions.slice(0, -5);

    const stmt = db.prepare("DELETE FROM " + table + " " + conditions);

    return new Promise((resolve, reject) => {
        const info = stmt.run(obj);
        resolve(info);
    })
}

exports.update = async (db, table, where, set) => {
    var obj = {};

    var where_conditions = "";
    for (let key in where) {
        obj["where_"+key] = where[key];
        where_conditions += "WHERE " + key + "=@where_" + key + " AND ";
    }
    where_conditions = where_conditions.slice(0, -5);

    var set_conditions = "";
    for (let key in set) {
        obj["set_"+key] = set[key];
        set_conditions += "SET " + key + "=@set_" + key + " AND ";
    }
    set_conditions = set_conditions.slice(0, -5);

    const stmt = db.prepare("UPDATE " + table + " " + set_conditions + " " + where_conditions);

    return new Promise((resolve, reject) => {
        const info = stmt.run(obj);
        resolve(info);
    })
}

exports.query = async (db, table, obj) => {
    var conditions = "";
    for (let key in obj) {
        conditions += "WHERE " + key + "=@" + key + " AND ";
    }
    conditions = conditions.slice(0, -5);

    const stmt = db.prepare("SELECT * FROM " + table + " " + conditions);

    return new Promise((resolve, reject) => {
        const info = stmt.get(obj);
        resolve(info);
    })
}

exports.queryall = async (db, table, obj, additional) => {
    var conditions = "";
    for (let key in obj) {
        conditions += "WHERE " + key + "=@" + key + " AND ";
    }
    conditions = conditions.slice(0, -5);

    if (additional) conditions += " " + additional;

    const stmt = db.prepare("SELECT * FROM " + table + " " + conditions);

    return new Promise((resolve, reject) => {
        const info = stmt.all(obj);
        resolve(info);
    })
}
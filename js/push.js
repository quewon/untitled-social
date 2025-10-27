const push = require('web-push');
const sqlite = require('./sqlite.js');

push.setVapidDetails('mailto:' + process.env.VAPID_ADMIN_EMAIL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

exports.send = (subscription, title, body, url) => {
    var json;

    if (body) {
        json = JSON.stringify({
            title: title,
            body: body,
            url: url
        })
    } else {
        json = JSON.stringify({
            title: title,
            url: url
        })
    }

    push.sendNotification(subscription, json)
    .catch(error => {
        if (error.statusCode == '410') {
            sqlite.delete("subscriptions", { endpoint: error.endpoint });
            console.log("deleted expired notification subscription.");
        }
    })
}

exports.broadcast = (title, url, excluded_endpoint) => {
    const subs = sqlite.queryall("subscriptions", {});
    for (let sub of subs) {
        if (sub.endpoint != excluded_endpoint)
            exports.send(JSON.parse(sub.json), title, null, url)
    }
}
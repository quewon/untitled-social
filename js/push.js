const push = require('web-push');
const sqlite = require('./sqlite.js');

push.setVapidDetails('mailto:' + process.env.ADMIN_EMAIL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

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
    .catch(err => console.log(err))
}

exports.broadcast = (title, url) => {
    const subs = sqlite.queryall(sqlite.db, "subscriptions", {});
    for (let sub of subs) {
        exports.send(JSON.parse(sub.json), title, url)
    }
}
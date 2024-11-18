const push = require('web-push');
const sqlite = require('./sqlite.js');

const vapidKeys = {
    publicKey: 'BL2l-t4IJf73pZL9wd_SJ1SNQJ0wdB84KJ1L9Dzki8-NGRQtJNGmeH5HBWAyQaAPDSkaMU30TSb54aR8EI9lasU',
    privateKey: 'K3OnJXhpuAFnHXmZ6kANOgmsukAHR7iXU_VjJ-4pTfg'
};

push.setVapidDetails('mailto:quewon.chin@gmail.com', vapidKeys.publicKey, vapidKeys.privateKey);

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
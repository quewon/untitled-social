require('dotenv').config();

const express = require('express');
const path = require('path');
const compression = require('compression');

const marked = require('marked');
const sqlite = require('./js/sqlite.js');
const push = require('./js/push.js');

const port = process.env.PORT || 8080;
const app = express();

// settings

const posts_per_page = 10;
const max_title_length = 40;

//

app.use(compression());
app.use('/', express.static(path.join(__dirname, 'public')));
    // use form data
    app.use(express.json({ limit: "1gb" }));
    app.use(express.urlencoded({ extended: false }));
    // ejs
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'public/views'));

// routing

app.get('/', (req, res) => {
    res.render('home', { feed: get_feed(0), page: 1, max_page: get_max_page() });
})

app.get('/how-to-install', (req, res) => {
    res.render('how-to-install')
})

app.get('/posts', (req, res) => {
    var feed = [];
    for (let post of get_live_posts()) {
        feed.push(parse_post_minimal(post));
    }

    res.render('index', { title: "all posts", posts: feed });
})

app.get('/posts/:author', (req, res) => {
    var feed = [];
    for (let post of get_live_posts()) {
        if (post.author_path == req.params.author) {
            feed.push(parse_post_minimal(post));
        }
    }

    res.render('index', { title: `posts by <em>${req.params.author}</em>`, posts: feed });
})

app.get('/posts/:author/:id', (req, res) => {
    const path = req.params.author + '/' + req.params.id;
    const post = sqlite.query("posts", { path: path });

    if (post) {
        res.render('post', parse_post_with_replies(post));
    } else {
        res.render('post', {
            title: '?',
            timestamp: -1,
            author: req.params.author,
            author_path: req.params.author,
            preview_body: 'this post does not exist!',
            body: 'this post does not exist!',
            path: path,
            replies: [],
            reply_count: 0,
            replying_to: null
        });
    }
})

app.get('/new', (req, res) => {
    res.render('new');
})

app.get('/reply/:author/:id', (req, res) => {
    const path = req.params.author + '/' + req.params.id;
    const post = sqlite.query("posts", { path: path });

    if (post) {
        res.render('new', {
            replying_to: parse_post(post)
        })
    } else {
        res.redirect('/new');
    }
})

app.get('/page/:pagenumber', (req, res) => {
    const page = Number(req.params.pagenumber) || 0;
    const feed = get_feed(page - 1);
    res.render('home', { feed: feed, page: page, max_page: get_max_page() });
})

app.get('/posts/:author/:id/is-live', (req, res) => {
    const path = req.params.author + '/' + req.params.id;
    const post = sqlite.query("posts", { path: path });
    if (post) {
        res.send({ live: post.live == 1 })
    } else {
        res.send({ live: null, post_not_found: true })
    }
})

function get_max_page() {
    let stmt = sqlite.db.prepare("SELECT COUNT(*) AS count FROM posts");
    return Math.ceil(stmt.get().count / posts_per_page);
}

function get_feed(page) {
    const posts = get_live_posts().slice(page * posts_per_page, page * posts_per_page + posts_per_page);
    var feed = [];
    for (let post of posts) {
        feed.push(parse_post(post));
    }
    return feed;
}

// post

const upload = require('./js/upload.js');

app.post('/publish', upload.uploadMulter, async (req, res) => {
    var post;

    try {
        var replying_to = req.body.replying_to.trim();
        if (replying_to == "") {
            replying_to = null;
        }

        var name = req.body.name.trim();
        name = name == "" ? "anonymous" : name;

        const body = req.body.post.trim();
        const path = get_author_path(name) + '/' + nanoid(8);

        post = {
            author: name,
            author_path: get_author_path(name),
            body,
            path,
            replying_to,
            live: 0
        };
        
        sqlite.insert("posts", post);

        res.send({
            message: "post published!",
            path: 'posts/' + path
        })
    }
    catch {
        console.error("error creating post");
        res.send({ message: "error" });
    }

    try {
        for (let i=0; i<req.files.length; i++) {
            req.files[i].temp_path = 'media/' + i;
        }

        var files_not_uploaded = req.files;

        var limit = 10;
        while (files_not_uploaded.length > 0) {
            var promises = [];
            for (let file of files_not_uploaded) {
                promises.push(upload.uploadB2(file));
            }

            var urls = await Promise.allSettled(promises);
            for (let i=files_not_uploaded.length-1; i>=0; i--) {
                if (urls[i].status == 'fulfilled') {
                    post.body = post.body.replaceAll(`](${files_not_uploaded[i].temp_path})`, `](${urls[i].value})`)
                    files_not_uploaded.splice(i, 1);
                }
            }

            limit--;
            if (limit <= 0) {
                console.error("reached b2 upload failure limit. purging post.");
                sqlite.delete("posts", { path: post.path });
                return;
            }
        }

        sqlite.update("posts", { path: post.path }, {
            body: post.body,
            live: 1,
            timestamp: create_timestamp()
        });

        if (post.replying_to) {
            const reply_author = sqlite.query("posts", { path: post.replying_to }).author;
            push.broadcast(`${post.author} replied to ${reply_author}'s post`, '/posts/'+post.path, req.body.endpoint);
        } else {
            push.broadcast(`${post.author} wrote a new post`, '/posts/'+post.path, req.body.endpoint);
        }
    }
    catch {
        console.error("error uploading files. purging post.");
        sqlite.delete("posts", { path: post.path });
    }
});

app.post('/subscribe', upload.none, (req, res) => {
    try {
        var sub = JSON.parse(req.body.data);
        var sub_exists = sqlite.query("subscriptions", { endpoint: sub.endpoint });

        if (sub_exists) {
            sqlite.update("subscriptions", { endpoint: sub.endpoint }, {
                timestamp: create_timestamp()
            })

            push.send(sub, "notifications already enabled", "to turn them off, consult your site or app settings.");
        } else {
            sqlite.insert("subscriptions", {
                timestamp: create_timestamp(),
                json: req.body.data,
                endpoint: sub.endpoint
            })

            push.send(sub, "notifications enabled!", "to turn them off, consult your site or app settings.");
        }

        res.send({
            message: "subscription successful"
        })
    }
    catch (error) {
        console.error("subscribe error " + error.statusCode);
        res.send({ message: "error" });
    }
})

function get_live_posts() {
    return sqlite.queryall("posts", {
        live: 1
    }, "ORDER BY timestamp DESC");
}

function get_author_path(name) {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function parse_post(post) {
    var reply_count = 0;
    for (let reply of get_live_posts()) {
        if (reply.replying_to && reply.replying_to == post.path) reply_count++;
    }

    return {
        title: get_post_title(post),
        timestamp: post.timestamp,
        author: post.author,
        author_path: post.author_path,
        preview_body: get_body_preview(post.body),
        body: parse_markdown(post.body),
        path: post.path,
        reply_count: reply_count,
        replying_to: post.replying_to ? parse_post_minimal(sqlite.query("posts", { path: post.replying_to })) : null,
        live: post.live == 1 ? true : false
    }
}

function parse_post_with_replies(post) {
    var parsed = parse_post(post);

    parsed.replies = [];
    for (let reply of get_live_posts()) {
        if (reply.replying_to && reply.replying_to == post.path) {
            parsed.replies.push(parse_post(reply))
        }
    }
    
    return parsed;
}

function parse_post_minimal(post) {
    return {
        title: get_post_title(post),
        timestamp: post.timestamp,
        author: post.author,
        author_path: post.author_path,
        path: post.path
    }
}

function parse_markdown(markdown) {
    markdown = markdown.replaceAll("> ", "&gt; ");

    // search for albums
    let search = '![album]';
    let index = markdown.indexOf(search);
    while (index != -1) {
        let split = markdown.split(search);
        let split2 = split[1].split(')\r\n)');
        let in_between = split2[0].split(')\r\n)')[0].slice(3);
        let before = split[0];
        let after = 
            (split2.length > 1 ? split2.slice(1).join(')\n)') : '') +
            (split.length > 2 ? search + split.slice(2).join(search) : '');

        in_between = in_between.trim().split(",").join('') + ')';

        markdown = `${before}<div class='album block' data-type='album'>`;
        markdown += `<div class='slides-wrapper'><div class='slides'>\r\n    ${in_between}\r\n</div></div>`;
        markdown += `</div>${after}`;

        index = markdown.indexOf(search);
    }
    
    const media_tags = ['image', 'audio', 'video'];

    for (let tag of media_tags) {
        let search = '![' + tag + ']';
        let index = markdown.indexOf(search);
        while (index != -1) {
            let split = markdown.split(search);
            let split2 = split[1].split(/[()]/g);
            let src = split2[1];
            let before = split[0];
            let after = 
                (split2.length > 2 ? split[1].replace('('+src+')', '') : '') +
                (split.length > 2 ? search + split.slice(2).join(search) : '');

            let element = `<div class='${tag} block' data-type='${tag}'>`;

            switch (tag) {
                case "image":
                    element += `<img src='${src}'>`;
                    break;
                case "audio":
                    element += `<audio controls preload="metadata"><source src='${src}'></audio>`;
                    break;
                case "video":
                    element += `<video controls><source src='${src}'></video>`;
                    break;
            }
            
            element += `</div>`;

            markdown = before + element + after;

            index = markdown.indexOf(search);
        }
    }
    
    markdown = markdown.replace(/(.)\r\n(?!\r\n)/g, '$1  \r\n');

    return marked.parse(markdown);
}

function get_post_title(post) {
    var title = post.body.split("\n")[0];
    if (title != "") {
        title = title.substring(0, max_title_length);
    }

    if (title.includes("![album](")) title = "[album]";
    else if (title.includes("![image]")) title = "[image]";
    else if (title.includes("![audio]")) title = "[audio]";

    return title.trim();
}

function get_body_preview(body) {
    return parse_markdown(body.split("\r\n---\r\n")[0])
}

function create_timestamp() {
    return new Date().getTime();
}

// https://www.npmjs.com/package/nanoid
let a="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function nanoid(e=21) {
    let t = "", r = crypto.getRandomValues(new Uint8Array(e));
    for (let n=0; n<e; n++)
        t += a[63 & r[n]];
    return t;
};

app.listen(port, () => {
    console.log(`server listening on port ${port}.`);
})
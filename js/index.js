const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression');

const marked = require('marked');
const sqlite = require('./sqlite.js');
const push = require('./push.js');

const port = process.env.PORT || 3000;
const app = express();

// settings

const posts_per_page = 10;
const max_title_length = 40;
const max_file_size = 1000 * 1000 * 10; //10mb

//

app.use(compression({ level: 1 }));
app.use('/media', express.static(path.join(__dirname, '../media')));
app.use('/', express.static(path.join(__dirname, '../public')));
    // use form data
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    // ejs
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../public/views'));

// multer

const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync('media'))
            fs.mkdirSync('media');
        cb(null, 'media');
    },
    filename: (req, file, cb) => {
        cb(null, nanoid(8) + '-' + new Date().toLocaleDateString().replaceAll('/','-') + '-' + file.originalname);
    }
})
const upload = multer({
    storage: storage,
    limits: { fileSize: max_file_size }
}).single('file');

// routing

app.get('/', (req, res) => {
    res.render('home', { feed: get_feed(0), page: 1, max_page: get_max_page() });
})

app.get('/posts', (req, res) => {
    const posts = sqlite.queryall(sqlite.db, "posts", {}, "ORDER BY timestamp DESC");

    var feed = [];
    for (let post of posts) {
        feed.push(parse_post_minimal(post));
    }

    res.render('index', { title: "all posts", posts: feed });
})

app.get('/posts/:author', (req, res) => {
    const posts = sqlite.queryall(sqlite.db, "posts", {}, "ORDER BY timestamp DESC");

    var feed = [];
    for (let post of posts) {
        if (post.author_path == req.params.author) {
            feed.push(parse_post_minimal(post));
        }
    }

    res.render('index', { title: `posts by <em>${req.params.author}</em>`, posts: feed });
})

app.get('/posts/:author/:id', (req, res) => {
    const path = req.params.author + '/' + req.params.id;
    const post = sqlite.query(sqlite.db, "posts", { path: path });

    if (post) {
        res.render('post', parse_post(post));
    } else {
        res.render('post', {
            title: '?',
            timestamp: '?',
            date: '?',
            date_informal: '?',
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
    const post = sqlite.query(sqlite.db, "posts", { path: path });

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

function get_max_page() {
    let stmt = sqlite.db.prepare("SELECT COUNT(*) AS count FROM posts");
    return Math.ceil(stmt.get().count / posts_per_page);
}

function get_feed(page) {
    const posts = sqlite.queryall(sqlite.db, "posts", {}, "ORDER BY timestamp DESC LIMIT " + posts_per_page + " OFFSET " + (page * posts_per_page));
    var feed = [];
    for (let post of posts) {
        feed.push(parse_post(post));
    }
    return feed;
}

// post

app.post('/upload', (req, res) => {
    upload(req, res, err => {
        if (err) {
            if (err instanceof multer.MulterError) {
                res.send({
                    message: err.message
                })
            } else {
                res.send({ message: "error" })
            }
        } else {
            res.send({
                message: "success",
                path: req.file.path
            })
        }
    })
});

app.post('/publish', multer().none(), (req, res) => {
    try {
        var replying_to = req.body.replying_to.trim();
        if (replying_to == "") {
            replying_to = null;
        }

        var name = req.body.name.trim();
        name = name == "" ? "anonymous" : name;

        const body = req.body.post.trim();
        const path = get_author_path(name) + '/' + nanoid(8);
        
        sqlite.insert(sqlite.db, "posts", {
            author: name,
            author_path: get_author_path(name),
            body: body,
            timestamp: create_timestamp(),
            path: path,
            replying_to: replying_to
        });

        if (replying_to) {
            const reply_author = sqlite.query(sqlite.db, "posts", { path: replying_to }).author;
            push.broadcast(name, "replied to " + reply_author + "'s post.", '/posts/'+path);
        } else {
            push.broadcast(name, "wrote a new post.", '/posts/'+path);
        }

        res.send({
            message: "post published!",
            path: 'posts/' + path
        })
    }
    catch (error) {
        console.log(error);
        res.send({ message: "error" });
    }
});

app.post('/subscribe', multer().none(), (req, res) => {
    try {
        var sub = JSON.parse(req.body.data);
        var sub_exists = sqlite.query(sqlite.db, "subscriptions", { endpoint: sub.endpoint });

        if (sub_exists) {
            sqlite.update(sqlite.db, "subscriptions", { endpoint: sub.endpoint }, {
                timestamp: create_timestamp()
            })

            push.send(sub, "notifications already enabled.", "to turn them off, consult your site or app settings.");
        } else {
            sqlite.insert(sqlite.db, "subscriptions", {
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
        console.log(error);
        res.send({ message: "error" });
    }
})

function get_author_path(name) {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function parse_post(post) {
    const replies = sqlite.queryall(sqlite.db, "posts", { replying_to: post.path }, "ORDER BY timestamp DESC");
    var reply_posts = [];
    for (let reply of replies) {
        reply_posts.push(parse_post_minimal(reply));
    }

    return {
        title: get_post_title(post),
        timestamp: post.timestamp,
        date: post.timestamp.split(" ")[0].replaceAll("-", "/"),
        date_relative: get_relative_date(post.timestamp),
        author: post.author,
        author_path: post.author_path,
        preview_body: get_body_preview(post.body),
        body: parse_markdown(post.body),
        path: post.path,
        replies: reply_posts,
        reply_count: replies.length,
        replying_to: post.replying_to ? parse_post_minimal(sqlite.query(sqlite.db, "posts", { path: post.replying_to })) : null
    }
}

function parse_post_minimal(post) {
    return {
        title: get_post_title(post),
        timestamp: post.timestamp,
        date: post.timestamp.split(" ")[0].replaceAll("-", "/"),
        date_relative: get_relative_date(post.timestamp),
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

            src = '/' + src;

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
    var date = new Date();

    var month = format_number(date.getMonth() + 1);
    var day = format_number(date.getDate());
    var hour = format_number(date.getHours());
    var min = format_number(date.getMinutes());
    var sec = format_number(date.getSeconds());

    return date.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec
}

function get_relative_date(timestamp) {
    var date;

    var current_date = new Date();
    var post_date = new Date();

    let a = timestamp.split(" ");
    let tdate = a[0].split("-");
    let ttime = a[1].split(":");
    post_date.setFullYear(tdate[0]);
    post_date.setMonth(Number(tdate[1]) - 1);
    post_date.setDate(tdate[2]);
    post_date.setHours(ttime[0]);
    post_date.setMinutes(ttime[1]);
    post_date.setSeconds(ttime[2]);

    var ampm_time = 
        (Number(ttime[0]) > 12 ? Number(ttime[0]) - 12 : Number(ttime[0])) +
        (Number(ttime[0]) > 12 ? "pm" : "am");
    if (ampm_time == "12am") ampm_time = "midnight";

    let current_year = current_date.getFullYear();
    if (current_year == tdate[0]) {
        if (current_date.getMonth() == post_date.getMonth()) {
            let current_day = current_date.getDate();
            if (current_day == tdate[2]) {
                var seconds_elapsed = (current_date - post_date) / 1000;
                var minutes_elapsed = seconds_elapsed / 60;
                var hours_elapsed = minutes_elapsed / 60;

                if (hours_elapsed < 1) {
                    if (minutes_elapsed < 1) {
                        if (seconds_elapsed < 5) {
                            date = "now"
                        } else {
                            date = Math.floor(seconds_elapsed) + " seconds ago"
                        }
                    } else {
                        if (minutes_elapsed < 2) {
                            date = "a minute ago";
                        } else {
                            date = Math.floor(minutes_elapsed) + " minutes ago";
                        }
                    }
                } else {
                    if (hours_elapsed < 2) {
                        date = "an hour ago";
                    } else {
                        date = ampm_time;
                    }
                }
            } else {
                var days_passed = current_day - Number(tdate[2]);
                if (days_passed == 1) {
                    date = ampm_time + ", yesterday";
                } else if (days_passed < 7) {
                    var weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    date = ampm_time + ", " + weekdays[post_date.getDay()];
                } else {
                    date = ampm_time + ", " + days_passed + " days ago";
                }
            }
        } else {
            date = tdate[1] + "/" + tdate[2];
        }
    } else {
        var years_passed = current_year - tdate[0];
        if (years_passed == 1) {
            date = "last year";
        } else {
            date = years_passed + " years ago";
        }
    }

    return date;
}

function format_number(n) {
    if (n < 10) return '0' + n;
    return n;
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
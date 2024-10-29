const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const marked = require('marked');
const sqlite = require('./sqlite.js');

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

app.get('/', (req, res) => {
    res.render('home', { feed: get_feed(0), page: 1, max_page: get_max_page() });
})

app.get('/posts', (req, res) => {
    const posts = sqlite.queryall(sqlite.db, "posts", {}, "ORDER BY timestamp DESC");

    var feed = [];
    for (let post of posts) {
        feed.push(parse_post_minimal(post));
    }

    res.render('index', { posts: feed });
})

app.get('/posts/:author', (req, res) => {
    const posts = sqlite.queryall(sqlite.db, "posts", {}, "ORDER BY timestamp DESC");

    var feed = [];
    for (let post of posts) {
        if (post.author_path == req.params.author) {
            feed.push(parse_post_minimal(post));
        }
    }

    res.render('index', { posts: feed });
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

function get_author_path(name) {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function parse_post(post) {
    const replies = sqlite.queryall(sqlite.db, "posts", { replying_to: post.path }, "ORDER BY timestamp DESC");
    var reply_posts = [];
    for (let reply of replies) {
        reply_posts.push(parse_post_minimal(reply));
    }

    var date;
    var today = create_timestamp().split(" ")[0];
    var post_day = post.timestamp.split(" ")[0];

    var ptime = post.timestamp.split(" ")[1].split(":");
    var hour = ptime[0] > 12 ? ptime[0] - 12 : ptime[0];
    var ampm = ptime[0] > 12 ? "pm" : "am";

    if (today == post_day) {
        date = hour + ":" + ptime[1] + ampm;
    } else {
        var ts = today.split("-");
        var ps = post_day.split("-");

        if (ts[0] == ps[0]) {
            if (Number(ts[2]) - Number(ps[2]) == 1) {
                date = "yesterday";
            } else {
                date = ps[1] + "/" + ps[2];
            }
        } else {
            date = post_day.replaceAll("-", "/");
        }
        
        var time = hour +  ampm;
        if (time == "12am") time = "midnight";

        date = time + ", " + date;
    }

    return {
        title: get_post_title(post.body),
        timestamp: post.timestamp,
        date: post_day.replaceAll("-", "/"),
        date_informal: date,
        author: post.author,
        author_path: post.author_path,
        preview_body: parse_markdown(post.body.split("\r\n---\r\n")[0]),
        body: parse_markdown(post.body),
        path: post.path,
        replies: reply_posts,
        reply_count: replies.length,
        replying_to: post.replying_to ? parse_post_minimal(sqlite.query(sqlite.db, "posts", { path: post.replying_to })) : null
    }
}

function parse_post_minimal(post) {
    return {
        title: get_post_title(post.body),
        timestamp: post.timestamp,
        date: post.timestamp.split(" ")[0].replaceAll("-", "/"),
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
                    element += `<audio controls><source src='${src}'></audio>`;
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

function get_post_title(body) {
    var title = body.split("\n")[0];
    if (title != "") {
        title = title.substring(0, max_title_length);
    }
    return title.trim();
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

// upload post
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

app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                res.send({
                    message: err.message
                })
            }
        } else {
            try {
                res.send({
                    message: 'success',
                    path: req.file.path
                })
            }
            catch {
                res.send();
            }
        }
    })
});

app.post('/publish', multer().none(), (req, res) => {
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
    })

    res.send({
        message: "post received!",
        path: 'posts/' + path
    })
});

app.listen(port, () => {
    console.log(`server listening on port ${port}.`);
})
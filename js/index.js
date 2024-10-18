const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const sqlite = require('./sqlite.js');

const port = process.env.PORT || 3000;
const app = express();

// settings

const posts_per_page = 10;
const max_title_length = 40;
const max_file_size = 1000 * 1000 * 10; //10mb

//

app.use('/media', express.static(path.join(__dirname, '../media')));
app.use('/', express.static(path.join(__dirname, '../public')));
    // use form data
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    // ejs
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../public/views'));

app.get('/', async (req, res) => {
    res.render('home', { root: '/', feed: await get_feed(0) });
})

app.get('/posts', async (req, res) => {
    const posts = await sqlite.queryall(sqlite.db, "posts", {}, "ORDER BY timestamp DESC");

    var feed = [];
    for (let post of posts) {
        let parsed = parse_post(post);
        parsed.author_path = 'posts/' + parsed.author_path;
        parsed.path = 'posts/' + parsed.path;
        feed.push(parsed);
    }

    res.render('index', { root: '../', posts: feed });
})

app.get('/posts/:author', async (req, res) => {
    const posts = await sqlite.queryall(sqlite.db, "posts", {}, "ORDER BY timestamp DESC");

    var feed = [];
    for (let post of posts) {
        if (post.author_path == req.params.author) {
            let parsed = parse_post(post);
            parsed.author_path = '../posts/' + parsed.author_path;
            parsed.path = '../posts/' + parsed.path;
            feed.push(parsed);
        }
    }

    res.render('index', { root: '../../', posts: feed });
})

app.get('/posts/:author/:id', async (req, res) => {
    res.locals.root = '../../../';

    const path = req.params.author + '/' + req.params.id;
    const post = await sqlite.query(sqlite.db, "posts", { path: path });
    if (post) {
        res.render('post', parse_post(post));
    } else {
        res.render('post', {
            title: '?',
            date: '?',
            author: req.params.author,
            body: 'this post does not exist!',
            path: path
        })
    }
})

app.get('/new', (req, res) => {
    res.render('new', { root: '../../' });
})

app.get('/reply/:author/:id', async (req, res) => {
    res.locals.root = '../../../';

    const path = req.params.author + '/' + req.params.id;
    const post = await sqlite.query(sqlite.db, "posts", { path: path });

    if (post) {
        res.render('new', {
            replying_to: parse_post(post)
        })
    } else {
        res.render('new');
    }
})

app.get('/page/:pagenumber', async (req, res) => {
    const page = req.params.pagenumber - 1;
    const feed = await get_feed(page);
    res.render('home', { root: '../../', feed: feed });
})

async function get_feed(page) {
    const posts = await sqlite.queryall(sqlite.db, "posts", {}, "ORDER BY timestamp DESC LIMIT " + posts_per_page + " OFFSET " + page * posts_per_page);
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
    return {
        title: get_post_title(post.body),
        date: post.timestamp.split(" ")[0].replaceAll("-", "/"),
        author: post.author,
        author_path: post.author_path,
        body: parse_markdown(post.body),
        path: post.path
    }
}

function parse_markdown(markdown) {
    // search for albums
    let search = '![album]';
    let index = markdown.indexOf(search);
    while (index != -1) {
        let split = markdown.split(search);
        let split2 = split[1].split(')\n)');
        let in_between = split2[0].split(')\r\n)')[0].slice(3);
        let before = split[0];
        let after = split2.length > 1 ? split2.slice(1).join('') : '';

        in_between = in_between.trim().split(",").join('');

        markdown = `${before}<div class='album block' data-type='album'>${in_between}</div>${after}`;

        index = markdown.indexOf(search);
    }

    console.log(markdown);

    const media_tags = ['image', 'audio', 'video'];

    for (let tag of media_tags) {
        let search = '![' + tag + ']';
        let index = markdown.indexOf(search);
        while (index != -1) {
            let split = markdown.split(search);
            let split2 = split[1].split(/[()]/g);
            let src = split2[1];
            let before = split[0];
            let after = split2.length > 2 ? split2.slice(2).join('') : '';

            let element = `<div class='${tag} block' data-type='${tag}'>`;
            
            switch (tag) {
                case "image":
                    element += `<img src='${src}'></img>`;
                    break;
                case "audio":
                    element += `<audio controls><source src='${src}'></audio>`;
                    break;
                case "video":
                    element += `<video src='${src}'></video>`;
                    break;
            }
            
            element += `</div>`;

            markdown = before + element + after;

            index = markdown.indexOf(search);
        }
    }

    return marked.parse(markdown);
}

function get_post_title(body) {
    var title = body.split("\n")[0];
    if (title != "") {
        title = title.substring(0, max_title_length);
    }
    return title;
}

function create_timestamp() {
    var date = new Date();
    return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDay() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
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
    destination: 'media/temp',
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
            res.send({
                message: 'success',
                path: req.file.path
            })
        }
    })
});

app.post('/publish', multer().none(), async (req, res) => {
    const name = req.body.name.trim();
    const body = req.body.post.trim();
    const path = get_author_path(name) + '/' + nanoid(8);
    
    await sqlite.insert(sqlite.db, "posts", {
        author: name,
        author_path: get_author_path(name),
        body: body,
        timestamp: create_timestamp(),
        path: path
    })

    res.send({
        message: "post received!",
        path: 'posts/' + path
    })
});

app.listen(port, () => {
    console.log(`server listening on port ${port}.`);
})
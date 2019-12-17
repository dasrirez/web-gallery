/* jshint esversion: 6*/
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');
const Datastore = require('nedb');
const cookie = require('cookie');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = 3000;

let users = new Datastore({ filename: path.join(__dirname, 'db', 'users.db'), autoload: true, timestampData: true });
let images = new Datastore({ filename: path.join(__dirname, 'db', 'images.db'), autoload: true, timestampData: true });
let comments = new Datastore({ filename: path.join(__dirname, 'db', 'comments.db'), autoload: true, timestampData: true });

let upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    secret: '',
    resave: false,
    saveUninitialized: true
}));

let isAuthenticated = function(req, res, next) {
    if (!req.username) return res.status(401).end("access denied");
    next();
};

app.use(function (req, res, next){
    let cookies = cookie.parse(req.headers.cookie || '');
    req.username = (req.session.username) ? req.session.username : null;
    console.log('HTTP request', req.method, req.url, req.body);
    next();
});

app.use(express.static('frontend'));

app.post('/signup/', function(req, res, next) {
    let username = req.body.username;
    let password = req.body.password;
    let salt = crypto.randomBytes(16).toString('base64');
    let hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    let saltedHash = hash.digest('base64');
    users.findOne({ _id: username }, function(err, user) {
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end(`user ${username} already exists`);
        users.update({ _id: username }, { _id: username, salt: salt, saltedHash: saltedHash}, { upsert: true }, function(err) {
            if (err) return res.status(500).end(err);
            req.session.username = username;
            res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7
            }));
            return res.json (`user ${username} signed up`);
        });
    });
});

app.post('/signin/', function(req, res, next) {
    let username = req.body.username;
    let password = req.body.password;
    users.findOne({ _id: username }, function(err, user) {
        if (err) return res.status(500).end(err);
        else if (!user) return res.status(401).end('access denied');
        let salt = user.salt;
        let hash = crypto.createHmac('sha512', salt);
        hash.update(password);
        let saltedHash = hash.digest('base64');
        if (user.saltedHash != saltedHash) return res.status(401).end('access denied');
        req.session.username = username;
        res.setHeader('Set-Cookie', cookie.serialize('username', username, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7
        }));
        return res.json(`user ${username} signed in`);
    });
});

app.get('/signout/', function(req, res, next) {
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
        path: '/',
        maxAge: 0
    }));
    res.redirect('/');
});

app.get('/api/users/', isAuthenticated, function(req, res, next) {
    //?page=blah
    req.query.page = req.query.page || 1;
    users.find({}, {salt: 0, saltedHash: 0}).skip((req.query.page - 1) * 5).limit(5).sort({ createdAt: -1 }).exec(function(err, users) {
        if (err) return res.status(500).end(err);
        res.json(users);
    });
});

app.get('/api/users/count/', isAuthenticated, function(req, res, next) {
    //?page=blah
    users.count({}, function(err, count) {
        if (err) return res.status(500).end(err);
        res.json(count);
    });
});


app.post('/api/images/', upload.single('file'), isAuthenticated, function (req, res, next) {
    if (!req.file)
        return res.status(400).end('Failed to fetch file');
    let image = {
        author: req.username,
        title: req.body.title,
        file: req.file
    };
    images.insert(image, function(err, newImage) {
        if (err) return res.status(500).end(err);
        res.json(newImage);
    });
});

app.delete('/api/images/:id', isAuthenticated, function (req, res, next) {
    /* check image owner first */
    images.findOne({ _id: req.params.id }, function(err, image) {
        if (image == null) return res.status(404).end('image not found');
        else if (image.author != req.username) return res.status(401).end('access denied');
        else req.image = image;
        next();
    });
}, function(req, res, next) {
    /* remove the comments here */
    comments.remove({ imageId: req.params.id }, { multi: true }, function(err, numRemoved) {
        if (err) return res.status(500).end(err);
        next();
    });
}, function(req, res, next) {
    /* remove the image here */
    images.remove({ _id: req.params.id }, function(err, numRemoved) {
        if (err) return res.status(500).end(err);
        else if (numRemoved == 0) return res.status(404).end('image not found');
        /* clean up files */
        fs.unlink(req.image.file.path, function(err) {
            if (err) console.log(`failed to delete file ${req.image.file.path}`);
        });
        res.json(req.image);
    });
});

app.get('/api/images/:id/', isAuthenticated, function(req, res, next) {
    images.findOne({ _id: req.params.id }, function(err, image) {
        if (err) return res.status(500).end(err);
        else if (image == null) return res.status(404).end('image not found');
        res.json(image);
    });
});

app.get('/api/images/:id/file', isAuthenticated, function(req, res, next) {
    images.findOne({ _id: req.params.id }, function(err, image) {
        if (err) return res.status(500).end(err);
        else if (image == null) return res.status(404).end('image not found');
        res.setHeader('Content-Type', image.file.mimetype);
        res.sendFile(image.file.path, { root: __dirname });
    });
});

app.get('/api/images/', isAuthenticated, function(req, res, next) {
    /* which user's images are we getting? req.body.username */
    /* date uri query -> date db query */
    /* for now the only operators are $gt and $lt */
    req.dbQuery = {};
    req.dbQuery.find = {};
    if (req.query.username)
        req.dbQuery.find.author = req.query.username;
    if (req.query.createdAt) {
        /* parsing uri */
        req.query.createdAt = req.query.createdAt.match(/(lt|gt):(.*)/);
        let op = req.query.createdAt[1];
        let val = req.query.createdAt[2];
        /* build db query */
        switch (op) {
        case 'gt':
            req.dbQuery.find.createdAt = { $gt: new Date(val) };
            break;
        case 'lt':
            req.dbQuery.find.createdAt = { $lt: new Date(val) };
        }
    }
    next();

}, function(req, res, next) {
    /* sort */
    req.dbQuery.sort = {};
    if (req.query.sort) {
        req.query.sort = req.query.sort.split('.');
        let field = req.query.sort[0];
        let order = req.query.sort[1] == 'asc' ? 1 : -1;
        req.dbQuery.sort = { [field]: order };
    }
    next();

}, function(req, res, next) {
    /* limit */
    if (req.query.limit)
        req.dbQuery.limit = parseInt((req.query.limit));
    next();

}, function(req, res){
    /* exec */
    images
        .find(req.dbQuery.find)
        .sort(req.dbQuery.sort)
        .limit(req.dbQuery.limit)
        .exec(function(err, images) {
            if (err) return res.status(500).end(err);
            res.json(images);
        });
});

app.post('/api/comments/', isAuthenticated, function (req, res, next) {
    let comment = {
        author: req.username,
        imageId: req.body.imageId,
        content: req.body.content
    };
    /* do a check for the image first */
    images.findOne({ _id: comment.imageId }, function(err, image) {
        if (err) return res.status(500).end(err);
        else if (image == null) return res.status(404).end('image not found');
        comments.insert(comment, function(err, newComment) {
            if (err) return res.status(500).end(err);
            res.json(newComment);
        });
    });
});

app.delete('/api/comments/:id', isAuthenticated, function(req, res, next) {
    /* check if comment is being deleted by comment owner */
    comments.findOne({ _id: req.params.id }, function(err, comment) {
        req.comment = comment;
        if (err) return res.status(500).end(err);
        else if (comment == null) return res.status(404).end('comment not found');
        else if (comment.author != req.username) {
            /* check if comment is being deleted by image owner */
            images.findOne({ _id: comment.imageId }, function(err, image) {
                if (err) return res.status(500).end(err);
                else if (image == null) return res.status(404).end('image not found'); // should never happen
                else if (image.author != req.username) return res.status(401).end('access denied');
                /* the image of the comment is owned by requester we're good*/
                else next();
            });
        }
        /* the comment is owned by requester we're good */
        else next();
    });
}, function (req, res, next) {
    /* search for comment first before deleting, then return it */
        comments.remove({ _id: req.params.id }, function(err, numRemoved) {
            if (err) return res.status(500).end(err);
            res.json(req.comment);
    });
});

app.get('/api/comments/', isAuthenticated, function (req, res, next) {
    /* imageId URI query -> DB query */
    req.dbQuery = {};
    req.dbQuery.find = {};
    if (req.query.imageId)
        req.dbQuery.find.imageId = req.query.imageId;
    return next();
}, function(req, res, next) {
    /* sort */
    req.dbQuery.sort = {};
    if (req.query.sort) {
        req.query.sort = req.query.sort.split('.');
        let field = req.query.sort[0];
        let order = req.query.sort[1] == 'asc' ? 1 : -1;
        req.dbQuery.sort = { [field]: order };
    }
    return next();
}, function(req, res, next) {
    /* exec */
    comments.count(req.dbQuery.find, function(err, count) {
        comments
            .find(req.dbQuery.find)
            .sort(req.dbQuery.sort)
            .skip(Math.max(0, Math.floor(count / 5) - 5))
            .limit(5)
            .exec(function(err, comments) {
                if (err)
                    return res.status(500).end(err);
                res.json(comments);
            });
    });
});

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log('HTTP server on http://localhost:%s', PORT);
});

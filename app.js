const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const http = require('http');
const ws = require('ws');
const mongodb = require('mongodb')
const {MONGO_URL} = require('./secret')

const app = express();

let mongo_db = new mongodb.MongoClient(MONGO_URL, {useUnifiedTopology: true})
let mongo_client;

mongo_db.connect((err, client) => {
    if (err) return console.log(err);
    mongo_client = client;
    app.locals.messages = client.db("chat").collection("messages");
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'front/dist')));

app.get('/', (req, res) => {
    res.sendFile('public/index.html');
});

app.use((req, res, next) => {
    next(createError(404));
});

app.use((err, req, res) => {
    res.status(err.status || 500);
    res.send('error');
});

let server = http.createServer(app);

const webSocketServer = new ws.Server({server});

webSocketServer.on('connection', (ws) => {
    ws.on('message', m => {
        let json = JSON.parse(m);
        switch (json.event) {
            case 'msg':
                let msg = {"time": new Date(), 'text': json.text};
                app.locals.messages.insertOne(msg, (err) => {
                    if (err) console.log(err);
                });
                ws.send(JSON.stringify({'event': 'added', 'message': msg}));

                webSocketServer.clients.forEach(client => {
                    if (client !== ws)
                        client.send(JSON.stringify({'event': 'msg', 'message': msg}));
                });
        }
    });

    app.locals.messages.find().sort({'time': -1}).limit(20).toArray((err, messages) => {
        if (typeof messages === "undefined")
            messages = []
        ws.send(JSON.stringify({'event': 'all', 'messages': messages.reverse()}));
    });
});

if (module === require.main) {
    if (typeof process.env.PORT !== "undefined")
        server.listen(process.env.PORT);
    else
        server.listen(8080);
}

module.exports = server;

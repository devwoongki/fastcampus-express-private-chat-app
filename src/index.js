const express = require('express');
const {default : mongoose} = require('mongoose');

const app = express();
const crypto = require('crypto');
const http = require('http');
const {Server} = require('socket.io');
const {saveMessages, fetchMessages} = require('./utils/messages');
const server = http.createServer(app);

const io = new Server(server);

const path = require('path');
const publicDirectoryPath = path.join(__dirname,'../public');

require('dotenv').config();

app.use(express.json());
app.use(express.static(publicDirectoryPath));

mongoose.set('strictQuery',false);
mongoose.connect(process.env.MONGO_URI)
    .then(()=> console.log('Connected to MongoDB'))
    .catch(err => console.log(err));

const randomId = () => crypto.randomBytes(8).toString('hex');
app.post('/session', (req,res) => {
    const data = {
        username: req.body.username,
        userID: randomId()
    }

    res.send(data);
})

io.use((socket, next) => {
    const username = socket.handshake.auth.username;
    const userID = socket.handshake.auth.userID;
    if(!username){
        return next(new Error('Username is required'));
    }

    socket.username = username;
    socket.id = userID;

    next();
})


let users = [];
io.on('connection', async socket => {
    let userData = {
        username: socket.username,
        userID : socket.id
    };
    users.push(userData);
    io.emit('users-data',{users});

    //client send message to server
    socket.on('message-to-server', (payload)=>{
        io.to(payload.to).emit('message-to-client', payload);
        saveMessages(payload);
    })

    //fetch messages from database
    socket.on('fetch-messages', ({receiver})=>{
        fetchMessages(io, socket.id, receiver);
    });

    //user leave 
    socket.on('disconnect', ()=>{
        users = users.filter(user => user.userID !== socket.id);
        //sidebar list에 서 없애기
        io.emit('users-data',{users});
        //대화 중이면 대화창 없애기
        io.emit('user-away', socket.id);
    });
})

const port =4000;
server.listen(port,() => {
    console.log(`Server is running on port ${port}`);
})
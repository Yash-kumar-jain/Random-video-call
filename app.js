const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const socketIo = require("socket.io");
const io = socketIo(server);

const indexRouter = require('./routes/index');

let waitingUsers = [];
let rooms = {};

io.on('connection', (socket) => {
    socket.on('joinroom', (room) => {
        if(waitingUsers.length > 0){
            let partner = waitingUsers.shift();
            const roomname = `${socket.id}-${partner.id}`;
            socket.join(roomname);
            partner.join(roomname);
            rooms[socket.id] = roomname;
            io.to(roomname).emit('joined', roomname);
        }
        else{
            waitingUsers.push(socket);
        }
    });

    socket.on('message', (data) => {
        let {room, message} = data;
        socket.broadcast.to(room).emit('message', message);
    });

    socket.on('disconnect', () => {
        // console.log(rooms);
        
        if(rooms[socket.id]){
            io.to(rooms[socket.id]).emit('userLeft', rooms[socket.id]);
            delete rooms[socket.id];
            // console.log("User left");
            
        }
        let index = waitingUsers.findIndex(waitingUser => waitingUser.id === socket.id);
        if(index > -1){
            waitingUsers.splice(index, 1);
        }
    });

    socket.on('signalingMessage', (data) => {
        socket.broadcast.to(data.room).emit('signalingMessage', data.message)

    })
    socket.on('startVideoCall', (data) => {
        socket.broadcast.to(data.room).emit('incomingCall')
    })
    socket.on('acceptCall', (data) => {
        socket.broadcast.to(data.room).emit('callAccepted')
    })
    socket.on('rejectCall', (data) => {
        socket.broadcast.to(data.room).emit('callRejected')
    })
});

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);


server.listen(3000)

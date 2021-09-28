const path = require('path')
const http = require("http")

const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)
const port = process.env.PORT || 3000

//Define Paths for app config
const publicDirPath = path.join(__dirname, '../public')


//Set up static directory to server
app.use(express.static(publicDirPath))

// let count = 0

io.on('connection', (socket) => {
    console.log('New Websocket Connection!')

    socket.on('join', ({username, room}, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        } 
        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (msg, callback) => {
        console.log('Received new message!')
        const filter = new Filter()

        if (filter.isProfane(msg)) {
            return callback('Profanity is now allowed!')
        }
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left the room.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        
    })

    socket.on('sendLocation', (position, callback) => {
        console.log(position)
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${position.latitude},${position.longitude}`))
        callback()
    })
})



server.listen(port, () => {
    console.log('Server listening on port ' + port)
})
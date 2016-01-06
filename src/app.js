const express = require('express')
const logger = require('morgan')

const app = express()

app.use(logger('dev'))

app.post('/sensordata/:id', require('./reciever.js'))
app.get('/command/:id', require('./sender.js'))
app.get('/actionlog/:id', require('./displayer.js'))

app.listen(3000, ()=>console.info('listening on 3000'))

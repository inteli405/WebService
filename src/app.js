const express = require('express')
const logger = require('morgan')

const app = express()

app.use(logger('dev'))

app.post('/sensordata/:id', require('./reciever.js'))

app.listen(3000, ()=>console.info('listening on 3000'))

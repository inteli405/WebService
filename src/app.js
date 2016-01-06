const express = require('express')
const logger = require('morgan')

const app = express()

app.use(logger('dev'))

app.post('/sensordata/:id', require('./reciever.js'))
app.get('/command/:id', require('./sender.js'))
app.get('/statistic/:action/:type', require('./displayer.js'))

app.listen(80, ()=>console.info('listening on 80'))

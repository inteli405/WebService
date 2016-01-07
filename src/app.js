'use strict'

const express = require('express')
const logger = require('morgan')
const serveStatic = require('serve-static')

const app = express()

const util = require('./util.js')

app.use(logger('dev'))

app.use(serveStatic('www'))

app.post('/sensordata/:id', require('./reciever.js'))
app.get('/command/:id', require('./sender.js'))
app.get('/statistic/:action/:type'/*, util.cors*/, require('./displayer.js'))
app.post('/debug/:id', require('./debug.js'))

app.listen(80, ()=>console.info('listening on 80'))

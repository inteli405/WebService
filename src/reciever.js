const express = require('express')
const co = require('co')
const parse = require('co-body')

const model = require('./model.js')
const util = require('./util.js')

module.exports = function(req, res, next){
    co(function*(){
        const data = yield parse.json(req)
        data.timestamp = data.timestamp || +new Date
        yield model.react(req.params.id, data).catch(util.error)
    }).catch(console.log.bind(console)).then(next)
}

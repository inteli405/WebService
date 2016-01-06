const express = require('express')
const co = require('co')
const parse = require('co-body')

const model = require('./model.js')
const util = require('./util.js')

module.exports = function(req, res, next){
    co(function*(){
        const data = yield parse.json(req)
        data.timestamp = data.timestamp || +new Date
        status = yield model.react('debug', {content: data, id: req.params.id}).catch(util.error)
        res.status(status || 200).end()
    }).catch(function(err){
        res.status(500).end()
        console.error(err)
    }).then(next)
}

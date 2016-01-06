const express = require('express')
const co = require('co')
const parse = require('co-body')

const model = require('./model.js')
const util = require('./util.js')

module.exports = function(req, res, next){
    co(function*(){
        const data = yield parse.json(req)
        status = yield model.react('debug', {command: data.command, id: req.params.id}).catch(util.error)
        res.status(status || 200).end()
    }).catch(function(err){
        res.status(500).end()
        console.error(err)
    }).then(next)
}

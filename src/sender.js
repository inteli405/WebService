'use strict'

const express = require('express')
const co = require('co')
const parse = require('co-body')

const model = require('./model.js')
const util = require('./util.js')

module.exports = function(req, res, next){
    co(function*(){
        const data = yield parse.json(req)
        data.timestamp = data.timestamp || +new Date
        yield model.save(req.params.id, data).catch(util.error)
        yield model.react(req.params.id, data).catch(util.error)
        res.status(200).end()
    }).catch(function(err){
        res.status(500).end()
        console.error(err)
    }).then(next)
}

const express = require('express')
const co = require('co')

const model = require('./model.js')
const util = require('./util.js')

module.exports = function(req, res, next){
    co(function*(){
        switch(req.param.type){
            case 'history':
                const data = yield model.load(req.param.id)
                res.json(data)
                break
            case 'lateast':
                break
        }
    }).catch(function(err){
        res.status(500).end()
        console.error(err)
    }).then(next)
}

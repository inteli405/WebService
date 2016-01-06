'use strict'

const express = require('express')
const co = require('co')

const model = require('./model.js')
const util = require('./util.js')

module.exports = function(req, res, next){
    let race = false
    model.listen(req.params.id, (data) => {
        if(!race){
            res.json(data)
            race = true
        }
    })
    setTimeout(()=>{
        if(!race){
            res.sendStatus(204)
            race = true
        }
    }, 30000)
}

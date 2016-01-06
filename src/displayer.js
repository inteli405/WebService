'use strict'

const express = require('express')
const co = require('co')

const model = require('./model.js')
const util = require('./util.js')
const config = require('./config.json')

module.exports = function(req, res){
    res.set('Access-Control-Allow-Origin', '*')
    co(function*(){
        switch(req.params.type){
            case 'history':
                const data = yield model.load(req.params.action)
                res.json(data)
                break
            case 'lateast':
                let race = false
                model.listen(req.params.action, (data) => {
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
                }, config.timeout.reply)
                break
        }
    }).catch(function(err){
        res.status(500).end()
        console.error(err)
    })
}

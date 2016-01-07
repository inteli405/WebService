'use strict'

const co = require('co')

const model = require('./model.js')
const config = require('./config.json')

module.exports = function(req, res){
    console.log("GET COMMAND")
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
    }, config.timeout.reply)
}

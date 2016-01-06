'use strict'

const db = require('monk')('localhost/inteli405')
const co = require('co')

const util = require('util')

let door = 'closed'
let bookdoor = 'closed'
let User = []
let Book = []

co(function*(){
    User = yield db.get('user').find({})
    Bser = yield db.get('book').find({})
})

const react = function(msg){

}

module.exports = {
    react: react
}

const save = co.wrap(function*(type, record){
    yield db.get(type).insert(record).on('error', util.error)
})

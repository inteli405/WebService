'use strict'

const db = require('monk')('localhost/inteli405')
const co = require('co')

const util = require('./util.js')
const config = require('./config.js')

let door = 'closed'
let bookdoor = 'closed'
let User = []
let Book = []
const listener = {
    temperature: [],
    humidity: [],
    pressure: [],
    mq2: []
}

co(function*(){
    User = yield db.get('user').find({})
    Bser = yield db.get('book').find({})
})

const save = co.wrap(function*(sensor, record){
    yield db.get(sensor).insert(record).on('error', util.error)
})

const react = co.wrap(function*(sensor, data){
    switch(sensor){
        case 'th':
            let st = false, sh = false
            if(data.temperature > config.threshold.temperature.upper){
                st = true
                console.log('temperature_high', data.temperature)
            }else if(data.temperature < config.threshold.temperature.lower){
                st = true
                console.log('temperature_low', data.temperature)
            }
            if(data.humidity > config.threshold.humidity.upper){
                sh = true
                console.log('humidity_high', data.humidity)
            }else if(data.humidity < config.threshold.humidity.lower){
                sh = true
                console.log('humidity_low', data.humidity)
            }
            yield actTemperature(data.timestamp, data.temperature, st).catch(util.error)
            yield actHumidity(data.timestamp, data.humidity, sh).catch(util.error)
            break
        case 'pressure':
            let s = false
            if(data.pressure > config.threshold.pressure.upper){
                s = true
                console.log('pressure_high', data.pressure)
            }else if(data.pressure < config.threshold.pressure.lower){
                s = true
                console.log('pressure_low', data.pressure)
            }
            yield actPressure(data.timestamp, data.pressure, s).catch(util.error)
            break
        case 'mq2':
            let s = false
            if(data.mq2 > config.threshold.mq2.upper){
                s = true
                console.log('mq2_high', data.mq2)
            }else if(data.mq2 < config.threshold.mq2.lower){
                s = true
                console.log('mq2_low', data.mq2)
            }
            yield actMQ2(data.timestamp, data.mq2, s).catch(util.error)
            break
    }
})

const listen = function(e, f){
    listener[e].push(f)
}

module.exports = {
    save: save,
    react: react,
    listen: listen
}

const actTemperature = co.wrap(function*(t, v, s){
    yield db.get('temperature').insert({timestamp:t, value:v, isSpecial:s}).catch(util.error)
    listener.temperature.forEach((f)=>f(t,v,s))
})

const actHumidity = co.wrap(function*(t, v, s){
    yield db.get('humidity').insert({timestamp:t, value:v, isSpecial:s}).catch(util.error)
    listener.humidity.forEach((f)=>f(t,v,s))
})

const actPressure = co.wrap(function*(t, v, s){
    yield db.get('pressure').insert({timestamp:t, value:v, isSpecial:s}).catch(util.error)
    listener.pressure.forEach((f)=>f(t,v,s))
})

const actMQ2 = co.wrap(function*(t, v, s){
    yield db.get('mq2').insert({timestamp:t, value:v, isSpecial:s}).catch(util.error)
    listener.mq2.forEach((f)=>f(t,v,s))
})

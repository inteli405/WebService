'use strict'

const db = require('monk')('localhost/inteli405')
const co = require('co')

const util = require('./util.js')
const config = require('./config.json')

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

const load = co.wrap(function*(collection){
    return yield db.get(collection).find({}).on('error', util.error)
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
            let sp = false
            if(data.pressure > config.threshold.pressure.upper){
                sp = true
                console.log('pressure_high', data.pressure)
            }else if(data.pressure < config.threshold.pressure.lower){
                sp = true
                console.log('pressure_low', data.pressure)
            }
            yield actPressure(data.timestamp, data.pressure, sp).catch(util.error)
            break
        case 'mq2':
            let sm = false
            if(data.mq2 > config.threshold.mq2.upper){
                sm = true
                console.log('mq2_high', data.mq2)
            }else if(data.mq2 < config.threshold.mq2.lower){
                sm = true
                console.log('mq2_low', data.mq2)
            }
            yield actMQ2(data.timestamp, data.mq2, sm).catch(util.error)
            break
    }
})

const listen = function(e, f){
    listener[e].push(f)
}

module.exports = {
    save: save,
    react: react,
    listen: listen,
    load: load
}

const actTemperature = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('temperature').insert(data).on('error', util.error)
    listener.temperature.forEach((f)=>f(data))
    listener.temperature = []
})

const actHumidity = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('humidity').insert(data).on('error', util.error)
    listener.humidity.forEach((f)=>f(data))
    listener.temperature = []
})

const actPressure = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('pressure').insert(data).on('error', util.error)
    listener.pressure.forEach((f)=>f(data))
    listener.temperature = []
})

const actMQ2 = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('mq2').insert(data).on('error', util.error)
    listener.mq2.forEach((f)=>f(data))
    listener.temperature = []
})

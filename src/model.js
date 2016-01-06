'use strict'

const db = require('monk')('localhost/inteli405')
const co = require('co')

const util = require('./util.js')
const config = require('./config.json')

let door = 'lock'
let bookdoor = 'lock'
let doorHandle = null
let doorExceeding = null
let bookdoorHandle = null
let bookdoorExceeding = null
let User = []
let Book = []
const listener = {
    Temperature: [],
    Humidity: [],
    Pressure: [],
    MQ2: [],
    Alert: [],

    relaydoor: [],
    relayshelf: []
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
        case 'halldoor':
            switch(door){
                case 'lock':
                    console.log(`hall changed to ${data.hallstatus?'close':'open'} while door locked`)
                    break
                case 'close':
                    if(data.hallstatus){
                        console.log('hall changed to close but it is closed')
                    }else{
                        door = 'open'
                        clearTimeout(doorHandle)
                    }
                    break
                case 'open':
                    if(data.hallstatus){
                        door = 'close'
                        actCloseDoor().catch(util.error)
                    }else{
                        console.log('hall changed to open but it is opened')
                    }
                    break
            }
        case 'hallshelf':
            switch(bookdoor){
                case 'lock':
                    console.log(`hall changed to ${data.hallstatus?'close':'open'} while door locked`)
                    break
                case 'close':
                    if(data.hallstatus){
                        console.log('hall changed to close but it is closed')
                    }else{
                        door = 'open'
                        clearTimeout(bookdoorHandle)
                    }
                    break
                case 'open':
                    if(data.hallstatus){
                        door = 'close'
                        actCloseBookdoor().catch(util.error)
                    }else{
                        console.log('hall changed to open but it is opened')
                    }
                    break
            }
        case 'rfiddooruser':
            if(!User.filter((x)=>x.id==data.id).length){
                return 403
            }
            switch(door){
                case 'lock':
                    actOpenDoor(data.id).catch(util.error)
                    break
                case 'close':
                case 'open':
                    //TODO: 刷新timeout
                    break
            }
            break
        case 'rfidshelfuser':
            if(!User.filter((x)=>x.id==data.id).length){
                return 403
            }
            switch(door){
                case 'lock':
                    actOpenBookdoor(data.id).catch(util.error)
                    break
                case 'close':
                case 'open':
                    //TODO: 刷新timeout
                    break
            }
            break
        case 'debug':
            actDebug(data)
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
    yield db.get('Temperature').insert(data).on('error', util.error)
    listener.Temperature.forEach((f)=>f(data))
    listener.Temperature = []
})

const actHumidity = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('Humidity').insert(data).on('error', util.error)
    listener.Humidity.forEach((f)=>f(data))
    listener.Humidity = []
})

const actPressure = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('Pressure').insert(data).on('error', util.error)
    listener.Pressure.forEach((f)=>f(data))
    listener.Pressure = []
})

const actMQ2 = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('MQ2').insert(data).on('error', util.error)
    listener.MQ2.forEach((f)=>f(data))
    listener.MQ2 = []
})

const actCloseDoor = co.wrap(function*(){
    doorHandle = setTimeout(()=>{
        db.get('Door_Close').insert({timestamp: +new Date}, errorlogger)
        listener.relaydoor.forEach((f)=>f({timestamp: +new Date, command:1}))
    },config.timeout.closedoor)
})

const actCloseBookdoor = co.wrap(function*(){
    bookdoorHandle = setTimeout(()=>{
        db.get('Bookdoor_Close').insert({timestamp: +new Date}, errorlogger)
        listener.relayshelf.forEach((f)=>f({timestamp: +new Date, command:1}))
    },config.timeout.closedoor)
})

const actOpenDoor = co.wrap(function*(user){
    doorHandle = setTimeout(()=>{
        db.get('Door_Open').insert({timestamp: +new Date, user: user}, errorlogger)
        listener.relaydoor.forEach((f)=>f({timestamp: +new Date, command:0}))
    },config.timeout.closedoor)
})

const actOpenBookdoor = co.wrap(function*(user){
    bookdoorHandle = setTimeout(()=>{
        db.get('Bookdoor_Open').insert({timestamp: +new Date, user: user}, errorlogger)
        listener.relayshelf.forEach((f)=>f({timestamp: +new Date, command:0}))
    },config.timeout.closedoor)
})

const actAlert = co.wrap(function*(type, value){
    const data = {timestamp:+new Date, type:type, value:value}
    yield db.get('Alert').insert(data).on('error', util.error)
    listener.Alert.forEach((f)=>f(data))
    listener.Alert = []
})

const actDebug = co.wrap(function*(data){
    db.get('Debug').insert({timestamp: +new Date, command: data.command}, errorlogger)
    listener[data.id].forEach((f)=>f({timestamp: +new Date, command:data.command}))
})

const errorlogger = (err) => {if(err){console.log(err)}}


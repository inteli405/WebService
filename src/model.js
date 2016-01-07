'use strict'
// a known bug: 在门已经准备锁上(doorHandle已启动)时门超时计时器到时，此时推开门，门将不会再超时
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
let shelfUser = null
let User = {}
let Book = {}
const listener = {
    Temperature: [],
    Humidity: [],
    Pressure: [],
    MQ2: [],
    Alert: [],

    relaydoor: [],
    relayshelf: []
}

co(function*(){ // init
    (yield db.get('User').find({}).on('error', util.error))
        .forEach((user) => User[user.card_num] = user);
    (yield db.get('Book').find({}).on('error', util.error))
        .forEach((book) => Book[book.id] = book);
    [
        "Temperature", "Humidity", "Pressure",
        "MQ2", "Alert", "Debug", "Door_Open",
        "Door_Close", "Book_Return", "Book_Borrow",
        "Bookdoor_Open", "Bookdoor_Close"
    ].forEach((x)=>db.get(x).index('timestamp'))
}).catch(util.error)

const save = co.wrap(function*(sensor, record){
    yield db.get(sensor).insert(record).on('error', util.error)
})

const load = co.wrap(function*(collection, limits){
    return yield db.get(collection).find({},{
        limit:limits||100,
        sort:{timestamp: -1}
    }).on('error', util.error)
})

const react = co.wrap(function*(sensor, data){
    switch(sensor){
        case 'th':
            let st = false, sh = false
            if(data.temperature > config.threshold.temperature.upper){
                st = true
                actAlert('temperature_high', data.temperature)
            }else if(data.temperature < config.threshold.temperature.lower){
                st = true
                actAlert('temperature_low', data.temperature)
            }
            if(data.humidity > config.threshold.humidity.upper){
                sh = true
                actAlert('humidity_high', data.humidity)
            }else if(data.humidity < config.threshold.humidity.lower){
                sh = true
                actAlert('humidity_low', data.humidity)
            }
            yield actTemperature(data.timestamp, data.temperature, st).catch(util.error)
            yield actHumidity(data.timestamp, data.humidity, sh).catch(util.error)
            break
        case 'pressure':
            let sp = false
            if(data.pressure > config.threshold.pressure.upper){
                sp = true
                actAlert('pressure_high', data.pressure)
            }else if(data.pressure < config.threshold.pressure.lower){
                sp = true
                actAlert('pressure_low', data.pressure)
            }
            yield actPressure(data.timestamp, data.pressure, sp).catch(util.error)
            break
        case 'mq2':
            let sm = false
            if(data.mq2 > config.threshold.mq2.upper){
                sm = true
                actAlert('mq2_high', data.mq2)
            }else if(data.mq2 < config.threshold.mq2.lower){
                sm = true
                actAlert('mq2_low', data.mq2)
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
            break
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
            break
        case 'rfiddooruser':
            if(!User[data.id]){
                return 403
            }
            switch(door){
                case 'lock':
                    actOpenDoor(data.id).catch(util.error)
                    break
                case 'close':
                case 'open':
                    // TODO: 重置超时计时器
                    break
            }
            break
        case 'rfidshelfuser':
            if(!User[data.id]){
                return 403
            }
            switch(bookdoor){
                case 'lock':
                    actOpenBookdoor(data.id).catch(util.error)
                    break
                case 'close':
                case 'open':
                    // TODO: 重置超时计时器
                    break
            }
            break
        case 'rfiddoorbook':
            actAlert('book_take_out_door', data.id)
            break
        case 'rfidshelfbook':
            let book = Book[data.id]
            if(!book){
                return 400
            }
            if(book.position){
                actReturnBook(book)
            }else{
                actBorrowBook(book)
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

const status = function(){
    return {
        door: door,
        bookdoor: bookdoor,
        doorHandle: doorHandle,
        bookdoorHandle: bookdoorHandle,
        shelfUser: shelfUser,
        User: User,
        Book: Book
    }
}

module.exports = {
    save: save,
    react: react,
    listen: listen,
    load: load,
    status: status
}

const publish = (l, d) => {
    listener[l].forEach((f)=>f(d))
    listener[l] = []
}

const actTemperature = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('Temperature').insert(data).on('error', util.error)
    publish('Temperature', data)
})

const actHumidity = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('Humidity').insert(data).on('error', util.error)
    publish('Humidity', data)
})

const actPressure = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('Pressure').insert(data).on('error', util.error)
    publish('Pressure', data)
})

const actMQ2 = co.wrap(function*(t, v, s){
    const data = {timestamp:t, value:v, isSpecial:s}
    yield db.get('MQ2').insert(data).on('error', util.error)
    publish('MQ2', data)
})

const actCloseDoor = co.wrap(function*(){
    doorHandle = setTimeout(()=>{
        db.get('Door_Close').insert({timestamp: +new Date}).on('error', util.error)
        publish('relaydoor', {timestamp: +new Date, command:1})
        door = 'lock'
        clearTimeout(doorExceeding)
    },config.timeout.closedoor)
})

const actCloseBookdoor = co.wrap(function*(){
    shelfUser = null
    bookdoorHandle = setTimeout(()=>{
        db.get('Bookdoor_Close').insert({timestamp: +new Date}).on('error', util.error)
        publish('relayshelf', {timestamp: +new Date, command:1})
        bookdoor = 'lock'
        clearTimeout(bookdoorExceeding)
    },config.timeout.closedoor)
})

const actOpenDoor = co.wrap(function*(user){
    door = 'close'
    db.get('Door_Open').insert({timestamp: +new Date, user: user}).on('error', util.error)
    publish('relaydoor', {timestamp: +new Date, command:0})
    doorExceeding = setTimeout(()=>{
        if(door == 'close'){
            actCloseDoor()
        }else if(door == 'open'){
            actAlert('door_exceeding')
        }else{
            console.log('door exceed while locked')
        }
    },config.timeout.doorexceeding)
})

const actOpenBookdoor = co.wrap(function*(user){
    shelfUser = user
    bookdoor = 'close'
    db.get('Bookdoor_Open').insert({timestamp: +new Date, user: user}).on('error', util.error)
    publish('relayshelf', {timestamp: +new Date, command:0})
    bookdoorExceeding = setTimeout(()=>{
        if(bookdoor == 'close'){
            actCloseBookdoor()
        }else if(bookdoor == 'open'){
            actAlert('bookdoor_exceeding')
        }else{
            console.log('bookdoor exceed while locked')
        }
    },config.timeout.doorexceeding)
})

const actAlert = co.wrap(function*(type, value){
    console.log(type, value)
    const data = {timestamp:+new Date, type:type, value:value}
    yield db.get('Alert').insert(data).on('error', util.error)
    publish('Alert', data)
})

const actReturnBook = co.wrap(function*(book){
    book.position = null
    db.get('Book').updateById(book._id, {'$set':{position: null}}).on('error', util.error)
    db.get('Book_Return').insert({timestamp: +new Date, book: book.id}).on('error', util.error)
})

const actBorrowBook = co.wrap(function*(book){
    book.position = shelfUser
    db.get('Book').updateById(book._id, {'$set':{position: shelfUser}})
    db.get('Book_Borrow').insert({timestamp: +new Date, book: book.id, user: shelfUser}).on('error', util.error)
})

const actDebug = co.wrap(function*(data){
    db.get('Debug').insert(data.content).on('error', util.error)
    publish(data.id, data.content)
})

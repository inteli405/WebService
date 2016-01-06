const error = function(err){
    if(!err.printed){
        console.error(err.stack)
        err.printed = true
    }
    throw err
}

const cors = function(req, res, next){
    res.set('Access-Control-Allow-Origin', '*')
    next(req, res)
}

module.exports = {
    error: error,
    cors: cors
}

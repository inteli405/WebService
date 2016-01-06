const error = function(err){
    if(!err.printed){
        console.error(err.stack)
        err.printed = true
    }
    throw err
}

module.exports = {
    error: error
}

module.exports = function parseWithZero(n){
    if(n < 10) return '0'+n;
    return ''+n;
}
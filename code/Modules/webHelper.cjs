const https = require("https")

var defaultRequestOptions = {
  port: 443,
  path: "",
  method: "GET",
}

function httpGet(url, callback) {
    return https.get(url, (res) => {
        callback(res)
    })
}

function httpRequest(options, callback) {
    var mergedOptions = { ...defaultRequestOptions, ...options }
    return https.request(mergedOptions, res => {
        callback(res)
    })
}

function setDefaultRequestOptions(options) {
    defaultRequestOptions = options
}

module.exports = {
    httpGet,
    httpRequest,
    setDefaultRequestOptions
}
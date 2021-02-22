const fs = require('fs')
const path = require('path')

exports.isFileExisted = function (filePath) {
    return new Promise(function (resolve, reject) {
        fs.access(filePath, (err) => {
            if (err) {
                reject(err.message);
            } else {
                resolve('existed');
            }
        })
    })
}


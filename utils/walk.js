'use strict';

const fs = require('fs');
const path = require('path');

function walk(current) {
    if (!fs.lstatSync(current).isDirectory()) {
        return [current];
    }

    const files = fs.readdirSync(current).map(child => {
        child = path.join(current, child);
        return walk(child);
    });
    return [].concat.apply([current], files);
}

exports.walk = walk;
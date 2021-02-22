var fs = require('fs')
const { walk } = require('../utils')
const path = require('path')

const binaryExtensions = ['.png', '.jar'];

exports.generate = function (srcPath, destPath, newProjectName, options) {
    walk(srcPath).forEach(absoluteSrcFilePath => {
        const relativeFilePath = path.relative(srcPath, absoluteSrcFilePath);
        const relativeRenamedPath = dotFilePath(relativeFilePath)
            .replace(/HelloZerod/g, newProjectName)
            .replace(/hellozerod/g, newProjectName.toLowerCase());

        let contentChangedCallback = null;
        copyAndReplace(
            absoluteSrcFilePath,
            path.resolve(destPath, relativeRenamedPath),
            {
                'Hello App Display Name': options.displayName || newProjectName,
                HelloZerod: newProjectName,
                hellozerod: newProjectName.toLowerCase(),
            },
            contentChangedCallback,
        );
    })
}

function copyAndReplace(srcPath, destPath, replacements, contentChangedCallback,) {
    if (fs.lstatSync(srcPath).isDirectory()) {
        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath);
        }
        // Not recursive
        return;
    }

    const extension = path.extname(srcPath);
    if (binaryExtensions.indexOf(extension) !== -1) {
        // Binary file
        let shouldOverwrite = 'overwrite';
        if (contentChangedCallback) {
            const newContentBuffer = fs.readFileSync(srcPath);
            let contentChanged = 'identical';
            try {
                const origContentBuffer = fs.readFileSync(destPath);
                if (Buffer.compare(origContentBuffer, newContentBuffer) !== 0) {
                    contentChanged = 'changed';
                }
            } catch (err) {
                if (err.code === 'ENOENT') {
                    contentChanged = 'new';
                } else {
                    throw err;
                }
            }
            shouldOverwrite = contentChangedCallback(destPath, contentChanged);
        }
        if (shouldOverwrite === 'overwrite') {
            copyBinaryFile(srcPath, destPath, err => {
                if (err) {
                    throw err;
                }
            });
        }
    } else {
        // Text file
        const srcPermissions = fs.statSync(srcPath).mode;
        let content = fs.readFileSync(srcPath, 'utf8');
        Object.keys(replacements).forEach(
            regex =>
                (content = content.replace(
                    new RegExp(regex, 'g'),
                    replacements[regex],
                )),
        );

        let shouldOverwrite = 'overwrite';
        if (contentChangedCallback) {
            // Check if contents changed and ask to overwrite
            let contentChanged = 'identical';
            try {
                const origContent = fs.readFileSync(destPath, 'utf8');
                if (content !== origContent) {
                    //console.log('Content changed: ' + destPath);
                    contentChanged = 'changed';
                }
            } catch (err) {
                if (err.code === 'ENOENT') {
                    contentChanged = 'new';
                } else {
                    throw err;
                }
            }
            shouldOverwrite = contentChangedCallback(destPath, contentChanged);
        }
        if (shouldOverwrite === 'overwrite') {
            fs.writeFileSync(destPath, content, {
                encoding: 'utf8',
                mode: srcPermissions,
            });
        }
    }
}

/**
 * Same as 'cp' on Unix. Don't do any replacements.
 */
function copyBinaryFile(srcPath, destPath, cb) {
    let cbCalled = false;
    const srcPermissions = fs.statSync(srcPath).mode;
    const readStream = fs.createReadStream(srcPath);
    readStream.on('error', function (err) {
        done(err);
    });
    const writeStream = fs.createWriteStream(destPath, {
        mode: srcPermissions,
    });
    writeStream.on('error', function (err) {
        done(err);
    });
    writeStream.on('close', function (ex) {
        done();
    });
    readStream.pipe(writeStream);
    function done(err) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}

function dotFilePath(path) {
    if (!path) {
        return path;
    }
    return path
        .replace('_gitignore', '.gitignore')
        .replace('_gitattributes', '.gitattributes')
        .replace('_babelrc', '.babelrc')
        .replace('_flowconfig', '.flowconfig')
        .replace('_buckconfig', '.buckconfig')
        .replace('_watchmanconfig', '.watchmanconfig');
}
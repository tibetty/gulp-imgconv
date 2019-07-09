'use strict';

// depencies
const BufferStreams = require('bufferstreams'),
    chalk = require('chalk'),
    log = require('fancy-log'),
    PluginError = require('plugin-error'),
    prettyBytes = require('pretty-bytes'),
    sharp = require('sharp'),
    through = require('through2-concurrent');
    
// plugin names
const PLUGIN_NAME = 'gulp-imgconv';

// module exports
module.exports = (pipeline) => {
    const execPlan = [];
    let compositeIndex = -1;
    for (const stage of pipeline) {
        execPlan.push(stage);
        // only one composite invocation will take effect, so we need to combine many composite calling to one with combined pipeline 
        if (stage.func === 'composite') {                
            execPlan.pop();
            if (compositeIndex < 0) {
                compositeIndex = execPlan.length;
                stage.args = [stage.args];
                execPlan.push(stage);
            } else {
                execPlan[compositeIndex].args[0].push(stage.args[0]);
            }
        }
    }

    execPlan.push({func: 'toBuffer', args: [{resolveWithObject: true}]});

    let totalFiles = 0;
    let originalBytes = 0;
    let convertedBytes = 0;
    // don't use arrow function, otherwise 'this' will become undefined
    return through.obj(function(file, enc, cb) {
        const self = this;
        
        function convertImage(buf, done) {
            const image = sharp(buf);
            (async () => {
                try {
                    const meta = await image.metadata();
                    const {data: contents, info} = await execPlan.reduce((o, stage) => o[stage.func].apply(o, stage.args), image);
                    contents.ext = info.format;
                    totalFiles++;
                    originalBytes += buf.length;
                    convertedBytes += info.size;
                    done(null, contents);
                } catch (err) {
                    done(new PluginError(PLUGIN_NAME, `[${file.path}] ${err}`));
                }
            })();
        }

        if (file.isNull()) {
            return cb(null, file);
        }

        if (file.isStream()) {
            file.contents.pipe(new BufferStreams((err, buf, done) => {
                if (err) {
                    self.emit('error', new PluginError(PLUGIN_NAME, err));
                    cb();
                } else {
                    convertImage(buf, (err, contents) => {
                        if (err) {
                            done(err);
                            self.emit('error', err);
                        } else {
                            done(null, contents);
                            file.path = file.path.replace(/[^\.]+$/, contents.ext);
                            file.contents = contents;
                            self.push(file);
                        }
                        cb();
                    });
                }
            }));
            return;
        }

        convertImage(file.contents, (err, contents) => {
            if (err) {
                self.emit('error', err);
            } else {
                file.path = file.path.replace(/[^\.]+$/, contents.ext);
                file.contents = contents;
                self.push(file);
            }
            cb();
        });
    }, callback => {
        let msg = `In total processed ${chalk.cyan.bold(totalFiles)} image(s)`;
        log(`${PLUGIN_NAME}:`, msg);
        msg = `${chalk.gray.bold(prettyBytes(originalBytes))} -> ${chalk.green.bold(prettyBytes(convertedBytes))}`;
        log(`${PLUGIN_NAME}:`, msg);
        callback();
    });
}


// IIFE to integrate other package fields
(() => {
    // make an object really immutable, prevented from modification and extension
    function constantize(proto) {
        if (proto instanceof Object) {
            const result = {};
            for (const key of Object.keys(proto)) {
                const value = proto[key];
                if (value instanceof Object) {
                    if (value instanceof Array) {
                        result[key] = new Proxy(value, {
                            set: (target, property, value, receiver) => true
                        })
                    } else if (value instanceof Function) { 
                        result[key] = value;
                    } else {
                        result[key] = constantize(value);
                    }
                } else {
                    result[key] = value;
                }
                Object.defineProperty(result, key, {writable: false});
            }
            Object.preventExtensions(result);
            return result;
        }
        return proto;
    }

    const proto = {
        resizeOptsHelper: {
            fit: ['cover', 'contain', 'fill', 'inside', 'outside'],
            kernel: ['nearest', 'cubic', 'mitchell', 'lanczos2', 'lanczos3'],
            position: ['centre', 'top left', 'top right', 'bottom left', 'bottom right'],
            background: 'placeholder<a color object like {r:0,g:0,b:0,alpha:1} or a string like \'#rrbbggaa\'>',
            withoutEnlargement: 'placeholder<whether to enlarge, as a boolean>',
            fastShrinkOnLoad: 'placeholder<whether to do fast shrink, as a boolean>'
        },

        compositeOptsHelper: {
            blend: ['clear', 'source', 'over', 'in', 'out', 'atop', 'dest', 'dest-over', 'dest-in', 'dest-out', 'dest-atop', 'xor', 'add', 'saturate',
                'multoply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'],
            gravity: ['centre', 'east', 'west', 'south', 'north', 'southeast', 'southwest', 'northeast', 'northwest'],
            raw: {
                width: 'placeholder<raw width, as a number>',
                height: 'placeholder<raw height, as a number>',
                channel: 'placeholder<raw channel, as a number>',
            },
            top: 'placeholder<pixel offset, as a number>',
            left: 'placeholder<pixel offset, as a number>',
            tile: 'placeholder<whether to repeat overlaying, as a boolean>',
            density: 'placeholder<DPI for vector image, as a number>'
        },

        // basic functions
        toFormat: (fmt, ...args) => {
            return {func: fmt, args};
        },

        // featured functions
        cutin: (src, opts) => {
            return {func: 'composite', args: [Object.assign({input: src, blend: 'dest-in'}, opts || {})]};
        },

        cutout: (src, opts) => {
            return {func: 'composite', args: [Object.assign({input: src, blend: 'dest-out'}, opts || {})]};
        },

        watermark: (src, opts) => {
            return {func: 'composite', args: [Object.assign({input: src, blend: 'over'}, opts || {})]};
        }
    };

    const directFuncs = ['resize', 'rotate', 'flip', 'flop', 'sharpen', 'median', 'blur', 'flatten', 'gamma', 'negate', 'linear', 'normalize', 'convolve', 'threshould', 'boolean', 'recomb', 'modulate',
        'extend', 'extract', 'trim', 'tint', 'grayscale', 'toColorspace', 'removeAlpha', 'ensureAlpha', 'extractChannel', 'joinChannel', 'bandbool', 'composite'];

    for (const func of directFuncs) {
        proto[func] = new Function('...args', `return {func: '${func}', args};`);
    }

    Object.assign(module.exports, constantize(proto));
})();

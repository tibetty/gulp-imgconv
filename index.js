'use strict';

// depencies
const BufferStreams = require('bufferstreams'),
    PluginError = require('plugin-error'),
    through = require('through2'),
    sharp = require('sharp');

// plugin names
const PLUGIN_NAME = 'gulp-imgconv';

// module exports
module.exports = (pipeline) => {
    let ext = 'png';
    const ctx = this;

    const executePlan = [];
    let compositeIndex = -1;
    for (const stage of pipeline) {
        executePlan.push(stage);
        if (stage.func === 'resize') {
            stage.args[0].width = stage.args[0].width || meta.width;
            stage.args[0].height = stage.args[0].height || meta.height;
        } else if (stage.func === 'composite') {
            executePlan.pop();
            if (compositeIndex < 0) {
                compositeIndex = executePlan.length;
                stage.args = [stage.args];
                executePlan.push(stage);
            } else {
                executePlan[compositeIndex].args[0].push(stage.args[0]);
            }
        }
    }

    executePlan.push({func: 'toBuffer', args: []});

    // don't use arrow function, otherwise 'this' will become undefined
    return through.obj(function(file, enc, cb) {
        const self = this;
        function convertImage(buf, done) {
            const image = sharp(buf);
            image.metadata().then(meta => {
                ext = ctx.format;
                if (['jpeg', 'png', 'webp'].indexOf(ctx.format) >= 0) {
                    executePlan.reduce((o, stage) => {
                        try {
                            return o[stage.func].apply(o, stage.args);
                        } catch (err) {
                            console.error(err);
                            done(new PluginError(PLUGIN_NAME, `[${file.path}] ${err}`));
                        }
                    }, image).then(buffer => {
                        done(null, buffer);
                    }).catch(err => {
                        done(new PluginError(PLUGIN_NAME, `[${file.path}] ${err}`));
                    });
                } else {
                    done(new PluginError(PLUGIN_NAME, `[${file.path}] Unsupported image format`));
                }
            }).catch(err => {
                done(new PluginError(PLUGIN_NAME, `[${file.path}] ${err}`));
            });
        }

        if (file.isNull()) return cb(null, file);

        if (file.isStream()) {
            file.contents.pipe(new BufferStreams((err, buf, done) => {
                if (err) {
                    console.error(err);
                    self.emit('error', new PluginError(PLUGIN_NAME, err));
                    cb();
                } else {
                    convertImage(buf, (err, contents) => {
                        if (err) {
                            done(err);
                            self.emit('error', err);
                        } else {
                            done(null, contents);
                            file.path = file.path.replace(/[^\.]+$/, ext);
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
                console.error(err);
                self.emit('error', err);
            } else {
                file.path = file.path.replace(/[^\.]+$/, ext);
                file.contents = contents;
                self.push(file);
            }
            cb();
        });
    });
}

(() => {
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
            withoutEnlargement: 'placeholder<whether to enlarge, in Boolean>',
            fastShrinkOnLoad: 'placeholder<whether to do fast shrink, in Boolean>'
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
        resize: (width, height, opts) => {
            return {func: 'resize', args: [Object.assign({width, height}, opts || {})]};
        },

        toFormat: (fmt, ...args) => {
            this.format = fmt;
            return {func: fmt, args};
        },

        // featured function
        cutin: (src, opts) => {
            return {func: 'composite', args: [Object.assign({input: src, blend: 'dest-in'}, opts || {})]};
        },

        cutout: (src, opts) => {
            return {func: 'composite', args: [Object.assign({input: src, blend: 'dest-out'}, opts || {})]};
        },

        watermark: (src, opts) => {
            return {func: 'composite', args: [Object.assign({input: src, blend: 'over'}, opts || {})]};
        },
    };

    const directFuncs = ['rotate', 'flip', 'flop', 'sharpen', 'median', 'blur', 'flatten', 'gamma', 'negate', 'linear', 'normalise', 'convolve', 'threshould', 'boolean', 'recomb', 'modulate',
        'extend', 'extract', 'trim', 'tint', 'grayscale', 'toColorspace', 'removeAlpha', 'ensureAlpha', 'extractChannel', 'joinChannel', 'bandbool', 'composite'];

    for (const func of directFuncs) {
        proto[func] = new Function('...args', `return {func: '${func}', args};`);
    }

    Object.assign(module.exports, constantize(proto));
})();

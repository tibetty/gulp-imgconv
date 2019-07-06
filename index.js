'use strict';

// depencies
const BufferStreams = require('bufferstreams'),
    PluginError = require('plugin-error'),
    through = require('through2'),
    sharp = require('sharp');

// consts
const PLUGIN_NAME = 'gulp-imgconv';

// inbound parameter opts have below fields:
// + format: the output format, right now supports jpeg, png & webp
// + formatOpts: conversion options for output format
// + width/height: size for resizing operation, if only one field was specified, the other field will use the original one
// + resizeOpts: the options of sharp.resize(), please find more details from http://sharp.dimens.io/
// + cutin: follows the the svg to cut-in the image, more options can be set in cutinOpts (please refer to composite function of sharp)
// + cutout: follows the the svg to cut-out the image, more options can be set in cutoutOpts (please refer to composite function of sharp)
// + watermark: follows the the png image (file name) to put over the image, more options can be set in watermarkOpts (please refer to composite function of sharp)

// module exports
module.exports = (opts) => {
    opts = opts || {};
    
    // don't use arrow function, otherwise this will become undefined
    return through.obj(function(file, enc, cb) {
		const ext = (opts.format || file.path.match(/[^\.]+$/)[0]).toLowerCase();
        const self = this;
        function convertImage(buf, done) {
            const image = sharp(buf);
            image.metadata().then(meta => {
            	let format = opts.format || meta.format;
            	if (['jpeg', 'png', 'webp'].indexOf(format) >= 0) {
                    let pipeline = [];
                    const resizeOpts = opts.resizeOpts || {};
                    resizeOpts.width = opts.width? opts.width : meta.width;
                    resizeOpts.height = opts.width? opts.height : meta.height;
                    pipeline.push(['resize', [resizeOpts]]);

                    const compositePipeline = [];
                    const dispatchTable = {
                        cutin: () => compositePipeline.push(Object.assign({input: opts.cutin, blend: 'dest-in'}, opts.cutinOpts || {})),
                        cutout: () => compositePipeline.push(Object.assign({input: opts.cutout, blend: 'dest-out'}, opts.cutoutOpts || {})),
                        watermark: () => compositePipeline.push(Object.assign({input: opts.watermark, blend: 'over'}, opts.watermarkOpts || {}))
                    };

                    // sequence sensitive operations, right now only support cutin, cutout, watermark
                    Object.keys(opts).forEach((field) => {
                        if (dispatchTable[field]) {
                            dispatchTable[field].call();
                        }
                    });

                    if (compositePipeline.length > 0) {
                        pipeline.push(['composite', [compositePipeline]]);
                    }
                    
                    if (opts.formatOpts) {
                        pipeline.push([format, [opts.formatOpts]]);
                    }

                    pipeline.push(['toBuffer']);

                    // for advanced user only, need to understand sharp api pretty well
                    if (opts.pipeline) {
                        pipeline = opts.pipeline.concat(pipeline);
                    }

                    pipeline.reduce((obj, stage) => {
                        try {
                            return obj[stage[0]].apply(obj, stage[1]);
                        } catch (err) {
                            done(new PluginError(PLUGIN_NAME, `[${file.path}] ${err}`));
                        }}, image).then(buffer => {
                        done(null, buffer);
                    }).catch(err => {
                        done(new PluginError(PLUGIN_NAME, `[${file.path}] ${err}`));
                    });
                }  else {
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
                        console.log('case#1');
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

	Object.assign(module.exports, constantize({
		resizeOptsHelper: {
			fit: ['cover', 'contain', 'fill', 'inside', 'outside'],
			kernel: ['nearest', 'cubic', 'mitchell', 'lanczos2', 'lanczos3'],
			position: ['centre', 'top left', 'top right', 'bottom left', 'bottom right'],
			background: 'placeholder<a color object e.g., {r:0,g:0,b:0,alpha:1} or \'#rrbbggaa\' in string>',
			withoutEnlargement: 'placeholder<whether to enlarge, in Boolean>',
			fastShrinkOnLoad: 'placeholder<whether to do fast shrink, in Boolean>'
		},

		compositeOptsHelper: {
			blend: ['over', 'clear', 'source', 'over', 'in', 'out', 'atop', 'dest', 'dest-over', 'dest-in', 'dest-out', 'dest-atop', 'xor', 'add', 'saturate',
				'multoply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'],
			gravity: ['centre', 'east', 'west', 'south', 'north', 'southeast', 'southwest', 'northeast', 'northwest'],
			raw: {
				width: 'placeholder<raw width, in Number>',
				height: 'placeholder<raw height, in Number>',
				channel: 'placeholder<raw channel, in Number>',
			},
			top: 'placeholder<pixel offset, in Number>',
			left: 'placeholder<pixel offset, in Number>',
			tile: 'placeholder<whether to repeat overlaying, in Boolean>',
			density: 'placeholder<DPI for vector image, in Number>'
		}
	}));
})();

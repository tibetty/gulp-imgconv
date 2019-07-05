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
		let format = opts.format || file.path.match(/[^\.]+$/)[0];
		let ext = format = format.toLowerCase();
		if (format === 'jpg') format = 'jpeg';
		else if (format === 'gif' || format === 'svg') ext = format = 'png';
		
		const self = this;
		
		function convertImage(buf, done) {
			if (['jpeg', 'png', 'webp'].indexOf(format) >= 0) {
				const image = sharp(buf);
				image.metadata().then(meta => {
					let pipeline = [];
					const resizeOpts = opts.resizeOpts || {};
					resizeOpts.width = opts.width? opts.width : meta.width;
					resizeOpts.height = opts.width? opts.height : meta.height;
					pipeline.push(['resize', [resizeOpts]]);

					const compositePipeline = [];
					const dispatchTable = {
						cutin: () => compositePipeline.push(Object.assign({input: opts.cutin, blend: 'dest-in'}, opts.cutinOpts | {})),
						cutout: () => compositePipeline.push(Object.assign({input: opts.cutout, blend: 'dest-out'}, opts.cutoutOpts | {})),
						watermark: () => compositePipeline.push(Object.assign({input: opts.watermark, blend: 'over'}, opts.watermarkOpts | {}))
					};

					// sequence sensitive operations, right now only support cutin, cutout, watermark
					const fields = Object.keys(opts);
					fields.forEach((field) => {
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
				}).catch(err => {
					done(new PluginError(PLUGIN_NAME, `[${file.path}] ${err}`));
				});
			} else {
				done(new PluginError(PLUGIN_NAME, `[${file.path}] Unsupported image format`));
			}
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

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
// + overlay: follows the the svg to overlay upon image
// + overlayOpts: the options of sharp.overlayWith(), please find its structure definition from http://sharp.dimens.io/

// module exports
module.exports = (opts) => {
	opts = opts || {};
	
	// don't use arrow function, otherwise this will become undefined
	return through.obj(function(file, enc, cb) {
		let format = opts.format || file.path.match(/[^\.]+$/)[0];
		let ext = format = format.toLowerCase();
		if (format === 'jpg') format = 'jpeg';
		else if (format === 'gif' || format === 'svg') ext = format = 'png';
		
		let self = this;
		
		function convertImage(buf, done) {
			if (['jpeg', 'png', 'webp'].indexOf(format) >= 0) {
				let image = sharp(buf);
				image.metadata().then(meta => {
					let pipeline = [['toFormat', [format]], ['toBuffer']];
					if (opts.formatOpts) pipeline.unshift([format, [opts.formatOpts]]);
					if (opts.overlay) pipeline.unshift(['overlayWith', [opts.overlay, opts.overlayOpts || {cutout: true}]]);
					let resizeOpts = opts.resizeOpts || {};
					resizeOpts.width = opts.width? opts.width : meta.width;
					resizeOpts.height = opts.width? opts.height : meta.height;
					pipeline.unshift(['resize', [resizeOpts]]);
					// for advanced user only, need to understand sharp api pretty well
					if (opts.pipeline) pipeline = opts.pipeline.concat(pipeline);
					pipeline.reduce((obj, stage) => obj[stage[0]].apply(obj, stage[1]), image).then(buffer => {
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
					done(err);
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

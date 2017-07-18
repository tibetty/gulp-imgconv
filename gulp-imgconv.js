'use strict';

// depencies
const BufferStreams = require('bufferstreams'),
	through = require('through2'),
	gutil = require('gulp-util'),
	sharp = require('sharp');

// consts
const PLUGIN_NAME = 'gulp-imgconv';

// inbound parameter opts have below fields:
// + format: the output format, right now supports jpeg, png & webp
// + width/height: size for resizing operation, if only one field was specified, the other field will use the original one
// + resizeOpts:
// +--+ crop/embed/min/max/ignoreAspectRatio/withoutEnlargement: mutual exclusive; crop is followed by options, others are true/false
// + overlay: follows the the svg to overlay upon image
// + overlayOpts: please find its structure definition from http://sharp.dimens.io/
// +--+ overlayWith option object for sharp

// module exports
module.exports = (opts) => {
	opts = opts || {};
	
	let format = opts.format || file.path.match(/[^\.]+$/)[0];
	let ext = format = format.toLowerCase();
	if (format === 'jpg') format = 'jpeg';
	else if (format === 'gif' || format === 'svg') ext = format = 'png';

	return through.obj(function(file, enc, cb) {
		let self = this;
		
		function convertImage(buf, done) {
			if (['jpeg', 'png', 'webp'].indexOf(format) >= 0) {
				let image = sharp(buf);
				image.metadata().then(meta => {
					let pipeline = [['toFormat', [format]], ['toBuffer']];
					if (opts.overlay) pipeline.unshift(['overlayWith', [opts.overlay, opts.overlayOpts || {cutout: true}]]);
					if (opts.resizeOpts) {
						let resizeOpts = opts.resizeOpts;
						if (resizeOpts.crop) pipeline.unshift(['crop', [resizeOpts.crop]]);
						else if (resizeOpts.embed) pipeline.unshift(['embed']);
						else if (resizeOpts.min) pipeline.unshift(['min']);
						else if (resizeOpts.max) pipeline.unshift(['max']);
						else if (resizeOpts.ignoreAspectRatio) pipeline.unshift(['ignoreAspectRatio']);
						else if (resizeOpts.withoutEnlargement) pipeline.unshift(['withoutEnlargement', [true]]);
					}
					if (opts.width || opts.height) pipeline.unshift(['resize', [opts.width? opts.width : meta.width, opts.height? opts.height : meta.height]]);
					
					// for advanced user only, need to understand sharp api pretty well
					if (opts.pipeline) pipeline = opts.pipeline.concat(pipeline);

					pipeline.reduce((obj, stage) => obj[stage[0]].apply(obj, stage[1]), image).then(buffer => {
						done(null, buffer);
					}).catch(err => {
						console.log(err);
						done(new gutil.PluginError(PLUGIN_NAME, err));
					})
				}).catch(err => {
					console.log(err);
					done(new gutil.PluginError(PLUGIN_NAME, err));
				});
			} else {
				done(new gutil.PluginError(PLUGIN_NAME, 'Unsupported image format'));
			}
		}

		if (file.isNull()) return cb(null, file);

		if (file.isStream()) {
			file.contents.pipe(new BufferStreams((err, buf, done) => {
				if (err) {
					done(err);
					self.emit('error', new gutil.PluginError(PLUGIN_NAME, err));
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
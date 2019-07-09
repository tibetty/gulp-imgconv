const gulp = require('gulp'),
    gic = require('../');

exports.cflg = () => {
    return gulp.src('flags/svg/*.svg')
        .pipe(gic([
                gic.resize(480, 360, {
                    fit: 'contain',
                    background: '#00000000'    
                }),
                gic.cutin(Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360">
                        <circle r="180" cx="180" cy="180"/>
                    </svg>`)),
                gic.watermark('flags/watermark.png', {
                    left: 320,
                    top: 240
                }),
                // gic.blur(2),
                gic.sharpen(),
                gic.grayscale(),
                // gic.recomb([
                //    [0.3588, 0.7044, 0.1368],
                //    [0.2990, 0.5870, 0.1140],
                //    [0.2392, 0.4696, 0.0912],
                // ]),
                gic.boolean(Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="255" height="240" viewBox="0 0 51 48">
                        <title>Five Pointed Star</title>
                        <path fill="none" stroke="#000" d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"/>
                    </svg>`),
                    'eor'
                ),
                gic.toFormat('png', {
                    quality: 80
                })
            ]))
        .pipe(gulp.dest('flags/png'));
};


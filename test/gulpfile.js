const gulp = require('gulp'),
    gic = require('../');

exports.cflg = () => {
    return gulp.src('src/*')
        .pipe(gic(gic
            .begin()
            .resize({
                width: 640,
                height: 480,
                fit: 'contain',
                background: '#00000000'    
            })
            .cutin(Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
                <svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 480 480">
                    <circle r="240" cx="240" cy="240"/>
                </svg>`))
            .watermark('png/watermark.png', {
                left: 400,
                top: 280
            })
            .blur(2)
            .sharpen()
            .grayscale()
            .recomb([
                [0.3588, 0.7044, 0.1368],
                [0.2990, 0.5870, 0.1140],
                [0.2392, 0.4696, 0.0912],
            ])
            .boolean(Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
                <svg xmlns="http://www.w3.org/2000/svg" width="255" height="240" viewBox="-20 0 71 48">
                    <title>Five Pointed Star</title>
                    <path fill="none" stroke="#000" d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"/>
                </svg>`),
                'eor'
            )
            .toFormat('png', {
                quality: 80
            })
            .commit()
        ))
        .pipe(gulp.dest('dst'));
};


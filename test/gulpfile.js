const gulp = require('gulp'),
    convert = require('../');

exports.cflg = () => {
    return gulp.src('flags/svg/*.svg')
        .pipe(convert({
            format: 'png',
            width: 480,
            height: 360,
            cutin: Buffer.from('<svg><circle r="180" cx="180" cy="180"/></svg>'),
            watermark: 'flags/watermark.png',
            resizeOpts: {
                fit: 'contain',
                background: '#00000000'
            }
        }))
        .pipe(gulp.dest('flags/png'));
};


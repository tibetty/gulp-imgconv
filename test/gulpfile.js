const gulp = require('gulp'),
    gic = require('../');

exports.cflg = () => {
    return gulp.src('flags/svg/*.svg')
        .pipe(gic([
                gic.resize(480, 360, {
                    fit: 'contain',
                    background: '#00000000'    
                }),
                gic.cutin(Buffer.from('<svg><circle r="180" cx="180" cy="180"/></svg>')),
                gic.watermark('flags/watermark.png', {
                    left: 320,
                    top: 240
                }),
                gic.blur(2),
                gic.grayscale(),
                gic.toFormat('png')
            ]))
        .pipe(gulp.dest('flags/png'));
};


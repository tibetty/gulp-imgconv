gulp-imgconv
==========

A gulp plugin to convert images (format conversion, resizing, cutting in/out, watermarking etc.) for distribution or batch image processing

Installation
---

```
npm install gulp-imgconv --save-dev
```

Usage
---
- DISTRIBUTION: resize all images under `src/`, cutin with a round shape, add a watermark, sharpen, grascale, boolean with a 5-pointed star and save them to `dst/` in PNG format
```javascript
const gulp = require('gulp'), 
    gic = require('gulp-imgconv');

exports.imgconv = () => {
    gulp.src('src/*')
    .pipe(gic([
        gic.resize({
            width: 640,
            height: 480,
            fit: 'contain',
            background: '#00000000'    
        }),
        gic.cutin(Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
            <svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 480 480">
                <circle r="240" cx="240" cy="240"/>
            </svg>`)),
        gic.watermark('png/watermark.png', {
            left: 400,
            top: 280
        }),
        gic.sharpen(),
        gic.grayscale(),
        gic.boolean(Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
            <svg xmlns="http://www.w3.org/2000/svg" width="255" height="240" viewBox="-20 0 71 48">
                <title>Five Pointed Star</title>
                <path fill="none" stroke="#000" d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"/>
            </svg>`),
            'eor'
        ),
        gic.toFormat('png', {
            quality: 80
        })
    ]))
    .pipe(gulp.dest('dst/')); 
};
```
*Click below links to see the conversion effect*

[Original](https://raw.githubusercontent.com/tibetty/gulp-imgconv/master/test/src/beach.jpg)

[Converted](https://raw.githubusercontent.com/tibetty/gulp-imgconv/master/test/dst/beach.png)

- PROCESSING: resize the original images in `src/` to width = 800, sharpen, grayscale them and save in `dst/` in corresponding formats (SVG, GIF -> PNG, otherwise the old format)
```javascript
const gulp = require('gulp'), 
gic = require('gulp-imgconv');

exports.imgconv = () => {
gulp.src('src/*')
    .pipe(
        gic.resize({
            width: 800, 
            fit: 'contain',
            background: '#00000000'    
        }),
        gic.sharpen(),
        gic.grayscale()
    ]))
    .pipe(gulp.dest('dst/')); 
};
```

Arguments
---
#### The argument is a pipeline in *Array* design, and there're 2 basic internal functions:
- *resize(widith?: number, height?: number, opts?: {[k: string]: any})*
    - Where `width` and `height` are size to resize to; when any parameter is ommitted, the value of the original image will be used. Please refer to `resizeOptsHelper` object of this package to learn how to make up a correct *opts* object.
- *toFormat(fmt: string, opts?: {[k: string]: any})*
    - Where `fmt` is the format to convert to (right now supports **jpeg**, **png**, **tiff** and **webp**). There are quite a few option choices for each format, please find more details from [sharp official document](http://sharp.dimens.io)
    
#### And 3 overlaying related featured functions inspired by my past experiences:
- *cutin/cutout/watermark(src: Buffer | string, opts?: {[k: string]: any})*
    - Where `src` is either the svg/png file name (in string) or the data (in Buffer) to overlay upon the original image, and you can learn how to construct the basic `opts` argument with the help of `compositeOptsHelper`, or read sharp official document to comprehensively understand the exact meaning of each option.
    
#### Moreover, almost all other transformation related functions of [sharp](http://sharp.dimens.io) are supported with the same function prototype, please feel free to use like what I did in the test:
- *extend*, *extract*, *trim*
- *rotate*, *flip*, *flop*
- *sharpen*, *median*, *blur*
- *flatten*, *gamma*, *negate*, *linear*, *normalize*, *convolve*, *threshould*, *recomb*, *modulate*
- *tint*, *grayscale*, *toColorspace*
- *removeAlpha*, *ensureAlpha*, *extractChannel*, *joinChannel*, *bandbool*
- *composite*, *boolean*

Thanks
---
Special gratitude to [sharp](https://www.npmjs.com/package/sharp) and other dependencies 

Author
---
tibetty <xihua.duan@gmail.com>

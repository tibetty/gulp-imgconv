gulp-imgconv
==========

A gulp plugin to convert images including format conversion, resizing, overlaying, etc. for distribution powered by sharp.

Installation
---

```
npm install gulp-imgconv --save-dev
```

Usage
---
```javascript
// A sample gulpfile.js in gulp 4.0 style
const gulp = require('gulp'), 
    gic = require('gulp-imgconv');

exports.imgconv = () => {
    gulp.src('dev/images/*.jpg')
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
    .pipe(gulp.dest('dist/images')); 
};
```
Arguments
---
### The argument is a pipeline in `Array` design, and there're 2 basic internal functions:
- **resize(widith?: number, height?: number, opts?: {[k: string]: any})**
    Where `width` and `height` are size to resize to; when any parameter is ommitted, the value of the original image will be used. Please refer to `resizeOptsHelper` object of this package to learn how to make up a correct `opts` object.
- **toFormat(fmt: string, opts?: {[k: string]: any})**
    Where `fmt` are format to convert to (right now supports 'jpeg', 'png' and 'webp'). There are quite a few option choices for each format, please find more details from [sharp official document] (http://sharp.dimens.io)
    
### And 3 overlaying related featured functions inspired by my past experiences:
- **cutin/cutout/watermark(src: Buffer | string, opts: {[k: string]: any})**
    Where `src` is either the svg/png file name (in string) or the data (in Buffer) to overlay upon the original image, and you can learn how to construct the basic `opts` argument with the help of `compositeOptsHelper`, or read sharp official document to comprehensively understand the exact meaning of each option.
    
### Moreover, almost all other transformation related functions of [sharp](http://sharp.dimens.io) are supported with the same function prototype, please feel free to use like what I did in our example.

Thanks
---
Special gratitude to [sharp](https://www.npmjs.com/package/sharp) and other dependencies 

Author
---
tibetty <xihua.duan@gmail.com>

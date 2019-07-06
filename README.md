gulp-imgconv
==========

A gulp plugin to convert images including format conversion, resizing, overlaying, etc. for distribution

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
    convert = require('gulp-imgconv');

exports.imgconv = () => {
    gulp.src('dev/images/*.jpg')
        .pipe(convert({
            format: 'png',
            width: 100,
            height: 100,
            // CAUTION: the overlaying functions are sequence sensitive
            cutin: new Buffer('<svg><circle r="50" cx="50" cy="50"/></svg>'),
            // cutout: new Buffer('<svg><circle r="50" cx="50" cy="50"/></svg>'), 
            watermark: '/path/to/watermark.png',    // need to be smaller than original picture;
            resizeOpts: {
                fit: 'contain',
                background: '#00000000'
            }
    }))
    .pipe(gulp.dest('dist/images')); 
};
```
Options
---
- **format**
    Image format to convert to, right now supports jpeg, png and webp; when it's ommitted, the format will be derived from the orginal file extension.
    - **formatOpts**
    format options for advanced users, please find more details from http://sharp.dimens.io/.

- **width**, **height**
    Width and height to resize to; when an attribute is ommitted, the value of the original image will be used.  
    - **resizeOpts?**
        You can find a simple help from the `resizeOptsHelper` object of this package, please  turn to `sharp.resize()`(http://sharp.dimens.io) for more details.

- **cutin/cutout/watermark**
    String or Buffer, the svg/png file name (String) or the data (Buffer) to overlay upon the original image.
    - **cutinOpts/cutoutOpts/watermarkOpts?**
        You can find a simple help from the `compositeOptsHelper` object of this package, please turn to `sharp.composite()` http://sharp.dimens.io/) for more details.

- **pipeline**
    A simple encapsulation for other sharp methods, an `Array` comprised of the method name (in `string`), and calling args in `Array` as the 2nd element.

Author
---
tibetty <xihua.duan@gmail.com>

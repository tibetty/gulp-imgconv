gulp-imgconv
==========

a gulp plugin to convert images including format conversion, resizing, overlaying, etc.) for distribution

## Installation

```
npm i gulp-imgconv --save-dev
```

## Usage
```javascript
const gulp = require('gulp'), 
    convert = require('gulp-imgconv');

gulp.task('convert', done => {
    gulp.src('dev/images/*.jpg')
        .pipe(convert({
            format: 'png',
            width: 100,
            height: 100,
            overlay: new Buffer('<svg><circle r="50" cx="50" cy="50"/></svg>'),
            resizeOpts: {
                fit: 'contain',
                background: '#00000000'
            }
    }))
    .pipe(gulp.dest('dist/images'));
    done();
});
```
## Options
- `format`
    Image format to convert to, right now supports jpeg, png and webp; when it's ommitted, the format will be derived from the orginal file extension.
    - `formatOpts`
      format options for advanced users, please find more details from http://sharp.dimens.io/.

- `width`, `height`
    Width and height to resize to; when an attribute is ommitted, the value of the original image will be used.  
    - `resizeOpts`
      `options` parameters for `sharp.resize()`, please visit http://sharp.dimens.io for more details.

- `overlay`
    String or Buffer, the svg/png file name (String) or the data (Buffer) to overlay upon original image.
    - `overlayOpts`
      You can find the structure definition from http://sharp.dimens.io/.

- `pipeline`
    A simple encapsulation for other sharp methods, an `Array` comprised of the method name (in string), and calling args in `Array` as the 2nd element.

Credits
---------------

This plugin depends on the following Node.JS modules:
* [sharp]
* [bufferstreams]
* [through2]
* [gulp]
* [gulp-util]

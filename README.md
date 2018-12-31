gulp-imgconv
==========

a gulp plugin to convert images (usually format conversion, resizing, overlaying, etc.) for distribution

## Installation

```
npm i gulp-imgconv --save-dev
```

## Usage
```javascript
const gulp = require('gulp'), 
  convert = require('gulp-imgconv');

gulp.task('convert', () => {
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
    .pipe(gulp.dest('dist/images'))
});
```
## Options
- `format`
    Format to convert, right now supports jpeg, png and webp; when it's ommitted, the format will be inferred from orginal file extension.
    - `formatOpts`
      Conversion options for output format for advanced users - the detailed options can be found on http://sharp.dimens.io/.

- `width`, `height`
    The width & height that the image will be resized to; when only one field is specified, the other one will use the image's.  
    - `resizeOpts`
      options parameters for `sharp.resize()`, please visit http://sharp.dimens.io for more details.

- `overlay`
    String or Buffer, the svg/png file name (String) or the data (Buffer) to overlay upon original image.
    - `overlayOpts`
      You can find the structure definition from http://sharp.dimens.io/.

- `pipeline`
    A naive encapsulation for other sharp methods, each element of this array is comprised of method name (in string), and its args as the nested array.

Credits
---------------

This plugin depends on the following Node.JS modules:
* [sharp]
* [bufferstreams]
* [through2]
* [gulp]
* [gulp-util]

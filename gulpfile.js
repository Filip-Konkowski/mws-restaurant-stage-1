const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const imagemin = require('gulp-imagemin');
const imageminPngquant = require('imagemin-pngquant');

let gulp = require('gulp'),
    connect = require('gulp-connect');

gulp.task('webserver', function() {
    connect.server();
});

gulp.task('default', ['webserver']);

gulp.task('styles', function() {
    gulp.src('sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(gulp.dest('./css'))
});

gulp.task('image', function() {
   gulp.src('img/*.jpg')
       .pipe(imagemin({
           progressive: true,
           use: [imageminPngquant()]
       }))
       .pipe(gulp.dest('disk/images'))
});
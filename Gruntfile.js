module.exports = function(grunt) {

  grunt.initConfig({
    responsive_images: {
      dev: {
        options: {
          engine: 'im',
          sizes: [{
              name: 'small',
              width: 320,
              height: 240
          },{
              name: 'medium',
              width: 640,
              quality: 80
          },{
              width: 800,
              suffix: '_large_1x',
              quality: 70
          },{
              width: 1600,
              suffix: "_large_x2",
              quality: 60
          }]
        },
        files: [{
          expand: true,
          src: ['*.{gif,jpg,png}'],
          cwd: 'images_src/',
          dest: 'img/'
        }]
      }
    },
  });

  grunt.loadNpmTasks('grunt-responsive-images');
  grunt.registerTask('default', ['responsive_images']);

};

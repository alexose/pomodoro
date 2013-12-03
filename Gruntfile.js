module.exports = function(grunt){
    'use strict';

    var shell = require('shelljs'),
        ractive = require('ractive');

    grunt.initConfig({
        watch: {
            files: ['templates/**'],
            tasks: ['compile_templates'],
        },
    }); 

    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', []);
    grunt.registerTask('compile_templates', 'compile templates using Ractive.parse', function(){
        console.log('hey');
    }); 

};

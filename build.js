'use strict';

var pkg = require('package.json');
var fs = require('fs');

function genManifest() {
  var manifest = {
    'manifest_version': 2,

    'name'        : pkg.name,
    'version'     : pkg.version,
    'description' : pkg.description,
    'homepage_url': pkg.homepage,

    'icons': {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    },

    'content_scripts': [{
      'matches': [ 'https://github.com/*' ],
      'js':      [ 'inject/inject.js' ]
    }]
  };

  return manifest;
}

function build() {
  fs.mkdir('dist', function (err) {
    
  });
}

module.exports = build;

if (require.main === module) return build();

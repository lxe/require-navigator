'use strict';

var natives = require('./natives');

// For non-chrome browsers, register immediately
if (!window.chrome) return tryRegisterInjector();

// Otherwise, attempt to register the injector
// at an interval, until it suceeds (From http://extensionizr.com/)
window.chrome.extension.sendMessage({ }, function tryRegisterInjector() {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === 'complete') {
      clearInterval(readyStateCheckInterval);
      registerInjector();
    }
  }, 10);
});

function registerInjector() {

  // Start observing DOM mutation events on the pjax conteiner.
  // GitHub uses pjax to load code pages, so we need to detect
  // when new content is loaded, and re-run the injector logic.
  var $target = document.getElementById('#js-repo-pjax-container');
  new MutationObserver(function onEvents(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      // Only need to detect observe the childList mutation
      // when content (nodes) have been added, and
      // forget about the rest.
      if (m.type === 'childList' && m.addedNodes.length) {
        inject();
        break;
      }
    }
  }).observe($target, {
    attributes:    false,
    childList:     true,
    characterData: false
  });

  // Inject on the page load, as some pages
  // don't use pushState ajax loading.
  inject();
}

function inject() {
  var file = document.querySelector('.final-path');

  if (file && file.innerHTML === 'package.json') {
    var tokens = document.querySelectorAll('.blob-code.js-file-line');
    var isPkg = false;

    [].forEach.call(tokens, function(line) {
      var pkgEl = line.querySelector('.pl-s1');

      if (!pkgEl) {
        // no inner span means no dependency or end of list
        isPkg = false;
        return;
      }

      if (!isPkg && line.innerText.match(/"(dev)?dependencies"\s*:/i)) {
        // set isPkg flag if dependency list is found
        isPkg = true;
      } else if (isPkg) {
        var pkg = pkgEl.innerText.replace(/"/g, '');
        var url = 'http://ghub.io/' + pkg;
        pkgEl.innerHTML = pkgEl.innerHTML
          .replace(pkg, '<a class="pl-pds" href="' +
            url + '">' + pkg + '</a>');
      }
    });

  } else {
    var tokens = document.querySelectorAll('.blob-code.js-file-line .pl-s3');

    [].forEach.call(tokens, function(line) {
      if (line.innerHTML === 'require') {
        var pkgEl = line.nextSibling.nextSibling;
        if (!pkgEl) return;
        var pkg = pkgEl.innerHTML.match(/span>([^<]+)/);
        if (!pkg || !pkg[1]) return; // continue if we have invalid input
        pkg = pkg[1];

        var url;
        if (pkg.indexOf('.') === 0) {
          url = pkg;

          // check for lack of extension
          var regex = /\.\w+$/i;
          if (!pkg.match(regex)) {
            // if there's no extension, do a HEAD request on the path
            // we use a HEAD request so we don't fetch the whole page (faster, less bandwidth)
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false); // would be nice to make this async
            xhr.onreadystatechange = function () {
              if (this.readyState === 4) {
                if (this.status === 404) {
                  // if it doesn't exist, we'll assume it's a js file
                  url = pkg + '.js';
                }
              }
            }
            xhr.send();
          }
        } else if (natives.indexOf(pkg) >= 0) {
          url = 'http://nodejs.org/api/' + pkg + '.html';
        } else {
          // split on `/` for cases like `require('foo/bar')`
          url = 'http://ghub.io/' + pkg.split('/')[0];
        }

        pkgEl.innerHTML = pkgEl.innerHTML
          .replace(pkg, '<a class="pl-pds" href="' +
            url + '">' + pkg + '</a>');
      }
    });
  }
}

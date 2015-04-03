var natives = [
  '_debugger',
  '_linklist',
  'assert',
  'buffer',
  'child_process',
  'console',
  'constants',
  'crypto',
  'cluster',
  'dgram',
  'dns',
  'domain',
  'events',
  'freelist',
  'fs',
  'http',
  'https',
  'module',
  'net',
  'os',
  'path',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  '_stream_readable',
  '_stream_writable',
  '_stream_duplex',
  '_stream_transform',
  '_stream_passthrough',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'vm',
  'zlib'
];

function tryRegisterInjector() {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === 'complete') {
      clearInterval(readyStateCheckInterval);
      registerInjector();
    }
  }, 10);
}

if (window.chrome) {
  window.chrome.extension.sendMessage({}, tryRegisterInjector);
} else {
  tryRegisterInjector();
}

function registerInjector() {
  var target = document.querySelector('#js-repo-pjax-container');

  new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'childList' && m.addedNodes.length) {
        inject();
      }
    });
  }).observe(target, {
    attributes:    false,
    childList:     true,
    characterData: false
  });

  inject();
}

function inject() {
  var modified = document.querySelector('.require-navigator');
  var file = document.querySelector('.final-path');

  if (!modified) {
    if (file && file.innerHTML === 'package.json') {
      var tokens = document.querySelectorAll('.blob-code.js-file-line');
      var isPkg = false;

      [].forEach.call(tokens, function(line) {
        var pkgEl = line.querySelector('.pl-s');

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
            .replace(pkg, '<a class="pl-pds require-navigator" href="' +
              url + '">' + pkg + '</a>');
        }
      });

    } else {
      var tokens = document.querySelectorAll('.blob-code.js-file-line');

      [].forEach.call(tokens, function(line) {
        if (line.innerHTML.indexOf('require') > -1) {
          var pkgEl = line.querySelector('.pl-s');
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
            .replace(pkg, '<a class="pl-pds require-navigator" href="' +
              url + '">' + pkg + '</a>');
        }
      });
    }
  }
}

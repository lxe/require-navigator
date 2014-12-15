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

chrome.extension.sendMessage({}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === 'complete') {
      clearInterval(readyStateCheckInterval);
      registerInjector();
    }
  }, 10);
});

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
  var tokens = document.querySelectorAll('.blob-code.js-file-line .pl-s3');

  [].forEach.call(tokens, function(line) {
    if (line.innerHTML === 'require') {
      var pkgEl = line.nextSibling.nextSibling;
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

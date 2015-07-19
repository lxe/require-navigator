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

var config = {
  extensions: [
    'js',
    'ts',
    'coffee',
    'json'
  ]
};

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
} else if (window.safari) {
  window.safari.self.addEventListener("message", function (msgEvent) {
    if (msgEvent.name === "afterLoaded") {
      config.extensions = msgEvent.message.settings.extensions,
      registerInjector();
    }
  }, false);
  safari.self.tab.dispatchMessage("loaded", null);
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

function qualifyURL(url) {
  var a = document.createElement('a');
  a.href = url;
  return a.href;
}

function xhrPromise(method, url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        resolve({
          status: this.status,
          method: method,
          url: url,
          responseText: this.responseText
        });
      }
    }
    xhr.send();
  });
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
              var urls = [url]; // Always try extensionless (unlikely to work, but maybe)
              var extMatch;
              if ((extMatch = location.pathname.match(ext))) {
                urls.push(pkg + extMatch[1]); // If the current page has an extension try that
              }
              config.extensions.forEach(function (extension) {
                urls.push(pkg + '.' + extension); // Try all additional extensions the user has configured
              });
              Promise.all(urls.map(function (url) {
                return xhrPromise('HEAD', url);
              })).then(function (requests) {
                var request = requests.find(function (request) {
                  return request.status < 300;
                });
                if (request) {
                  url = request.url;
                } else {
                  var html = [].concat([
                    '<html>',
                      '<body>',
                        '<p>Could not find a url for ' + pkg + ', urls that were attempted:</p>',
                        '<ul>',
                  ], urls.map(function (url) {
                          return '<li><a href=&quot;' + qualifyURL(url) + '&quot;>' + qualifyURL(url) + '</a></li>'
                  }), [
                        '</ul>',
                      '</body>',
                    '</html>'
                  ]).join('');

                  var url = 'data:text/html,' + html;
                }
                pkgEl.innerHTML = pkgEl.innerHTML
                  .replace(pkg, '<a class="pl-pds require-navigator" href="' +
                    url + '">' + pkg + '</a>');
              });
              return;
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

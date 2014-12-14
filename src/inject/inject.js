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
  console.log('injecting');

  var tokens = document.querySelectorAll('.blob-code.js-file-line .pl-s3');

  [].forEach.call(tokens, function(line) {
    if (line.innerHTML === 'require') {
      var pkgEl = line.nextSibling.nextSibling;
      var pkg = pkgEl.innerHTML.match(/span>([^<]+)/)[1];

      var url;
      if (pkg.indexOf('.') === 0) {
        url = pkg;
      } else if (natives.indexOf(pkg) >= 0) {
        url = 'http://nodejs.org/api/' + pkg + '.html';
      } else {
        url = 'http://ghub.io/' + pkg;
      }

      pkgEl.innerHTML = pkgEl.innerHTML
        .replace(pkg, '<a class="pl-pds" href="' +
          url + '">' + pkg + '</a>');
    }
  });
}

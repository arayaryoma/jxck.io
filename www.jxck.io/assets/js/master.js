(() => {
  // stale-while-revalidate.js
  'use strict';

  const DEBUG = true;
  const KEY = '/assets/js/master.js?ver=0';

  let log = DEBUG ? console.log.bind(console) : () => {};

  let controllerChange = new Promise((resolve, reject) => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      return resolve(registration);
    });
  });


  // window
  if (typeof window !== 'undefined') {
    if(location.search !== '?sw') return;
    navigator.serviceWorker.register(KEY, { scope: '/' }).then((registration) => {
      registration.addEventListener('updatefound', (e) => {
        log('updatefound', e);
        log('registration.installing', registration.installing);
        log('registration.waiting', registration.waiting);
        log('registration.active', registration.active);
      });
      log(navigator.serviceWorker.controller);
      return navigator.serviceWorker.ready;
    }).then((registration) => {
      if (navigator.serviceWorker.controller) {
        return registration;
      }
      return controllerChange;
    }).then(() => {
      log(navigator.serviceWorker.controller);
    }).catch(console.error.bind(console));
  }

  // worker
  if ('ServiceWorkerGlobalScope' in self && self instanceof ServiceWorkerGlobalScope) {
    self.addEventListener('install', (e) => {
      log('install > skipWaiting', e);
      e.waitUntil(skipWaiting());
    });

    self.addEventListener('activate', (e) => {
      log('activate > claim', e);

      e.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log('remove cache', cacheName);
              return caches.delete(cacheName);
            })
          );
        }).then(() => {
          return fetch('/feeds/atom.json');
        }).then((res) => {
          return res.json();
        }).then((json) => {
          let urls = json.entry.map((e) => {
            return new URL(e.href).pathname;
          });
          return caches.open(KEY).then((cache) => {
            console.log('addAll', urls, cache);
            return cache.addAll(urls);
          });
        }).then(() => self.clients.claim())
      );
    });

    self.addEventListener('fetch', (e) => {
      const request = e.request;
      console.log('%crequest  :', 'color: blue', request.url, request.type);

      const url = new URL(request.url);
      if (url.pathname === KEY) return;

      e.respondWith(
        caches.open(KEY).then((cache) => {
          return cache.match(request).then((response) => {
            const update = fetch(request).then((update) => {
              console.info('%cupdate   :', 'color: red',  update.url, update.type);
              cache.put(request, update.clone());
              return update;
            });

            return Promise.race([
              new Promise((resolve, reject) => {
                if (response) {
                  console.warn('%ccache hit:', 'color: green', response.url, response.type);
                }
                resolve(response);
              }),
              update
            ]);
          });
        })
      );
    });
  }
})();

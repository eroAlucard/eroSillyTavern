const CACHE_NAME = 'ero-sillytavern-pwa-v2.3.0';
const STATIC_CACHE = 'ero-st-static-v6';
const DYNAMIC_CACHE = 'ero-st-dynamic-v6';

// 需要缓存的核心静态资源
// 注意：不缓存 index.html、pwa-shim.js、script.js，确保每次都从网络获取最新版本
const STATIC_ASSETS = [
  '/style.css',
  '/css/st-tailwind.css',
  '/css/rm-groups.css',
  '/css/group-avatars.css',
  '/css/world-info.css',
  '/css/mobile-styles.css',
  '/lib.js',
];

// 永远不缓存的路径（始终从网络获取）
const NEVER_CACHE_PATTERNS = [
  '/index.html',
  '/pwa-shim.js',
  '/script.js',
  '/csrf-token',
  '/version',
];

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.error('[SW] Cache failed:', err);
    })
  );
  self.skipWaiting();
});

// Service Worker 激活事件
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Service Worker 请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 检查是否在永不缓存列表中
  const shouldNeverCache = NEVER_CACHE_PATTERNS.some(pattern => url.pathname === pattern || url.pathname.endsWith(pattern));
  if (shouldNeverCache) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // API 请求始终从网络获取
  if (url.pathname.startsWith('/api/') || url.pathname === '/csrf-token' || url.pathname === '/version') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Network unavailable' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        });
      })
    );
    return;
  }

  // HTML 页面：网络优先
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch(() => {
        // 离线时返回默认页面
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

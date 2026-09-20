const CACHE_NAME = 'ero-sillytavern-pwa-v2.6.0';
const STATIC_CACHE = 'ero-st-static-v9';
const DYNAMIC_CACHE = 'ero-st-dynamic-v9';

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

// ============================================================
// Service Worker 中的 IndexedDB 访问（SW 无法访问 window 对象）
// ============================================================
const SW_DB_NAME = 'eroSillyTavern';
const SW_DB_VERSION = 3;
const SW_STORES = {
  chats: 'chats', characters: 'characters', settings: 'settings',
  worldInfo: 'worldInfo', backgrounds: 'backgrounds', avatars: 'avatars', groups: 'groups',
  images: 'images', backups: 'backups',
};

function openSwDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SW_DB_NAME, SW_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const storeName of Object.values(SW_STORES)) {
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function getSwCharacter(key) {
  const db = await openSwDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SW_STORES.characters], 'readonly');
    const store = tx.objectStore(SW_STORES.characters);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 处理缩略图请求
 * <img src="/thumbnail?type=avatar&file=xxx"> 发起的请求不经过 window.fetch，
 * 只有 Service Worker 能拦截
 */
async function handleThumbnailRequest(url) {
  const type = url.searchParams.get('type');
  const file = url.searchParams.get('file');

  if (type === 'avatar' && file) {
    try {
      const char = await getSwCharacter(file);
      if (char && char._pwaAvatarData) {
        const base64 = char._pwaAvatarData;
        const mimeMatch = base64.match(/^data:(image\/\w+);base64,/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const binaryStr = atob(base64.split(',')[1]);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        return new Response(new Blob([bytes], { type: mime }), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' },
        });
      }
    } catch (e) {
      console.error('[SW] Thumbnail error:', e);
    }
    // 没有找到头像数据，返回 404 让前端显示默认占位图
    return new Response(null, { status: 404, statusText: 'Not Found' });
  }

  // 背景图缩略图：直接 fetch 静态文件并返回（避免 302 重定向导致 URL 编码问题）
  if (type === 'bg' && file) {
    try {
      const bgPath = '/backgrounds/' + encodeURIComponent(file);
      const bgResponse = await fetch(bgPath);
      if (bgResponse.ok) {
        return bgResponse;
      }
    } catch (e) {
      console.error('[SW] Background thumbnail fetch error:', e);
    }
    return new Response(null, { status: 404, statusText: 'Not Found' });
  }

  return new Response(null, { status: 404, statusText: 'Not Found' });
}

// ============================================================
// Service Worker 安装事件
// ============================================================
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

// ============================================================
// Service Worker 激活事件
// ============================================================
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

// ============================================================
// Service Worker 请求拦截
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 特殊处理：缩略图 API（从 IndexedDB 读取头像数据）
  if (url.pathname === '/thumbnail') {
    event.respondWith(handleThumbnailRequest(url));
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

        // 只缓存 http/https 协议的资源，跳过 chrome-extension:// 等非标准协议
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          }).catch(() => { /* ignore cache errors for unsupported schemes */ });
        }

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

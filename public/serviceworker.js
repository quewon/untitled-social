// should be versioned to update cached resources

const static_cache_name = 'site-static-v2';
const dynamic_cache_name = 'site-dynamic-v2';
const dynamic_cache_limit = 30;

const static_assets = [
    '/new',
    '/fallback.html', // <-- make sure it's up to date!
    '/manifest.json',

    '/css/global.css',
    '/css/index.css',
    '/css/new.css',
    '/css/post.css',
    '/css/responsive.css',
    
    '/js/app.js',
    '/js/post.js',
    '/js/postbuilder.js',

    '/res/icons/32.png',
    '/res/download.svg',
    '/res/eraser.png',
    '/res/microphone.png',
    '/res/pause.svg',
    '/res/pencil.png',
    '/res/play.svg'
]

//

function limit_cache_size(name, size) {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > size) {
                cache.delete(keys[0]).then(limit_cache_size(name, size))
            }
        })
    })
}

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(static_cache_name).then((cache) => {
            cache.addAll(static_assets);
        })
    )
})

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== static_cache_name && key !== dynamic_cache_name)
                .map(key => caches.delete(key))
            )
        })
    )
})

self.addEventListener('fetch', (e) => {
    const prioritize_cached = e.request.url.includes('media/') || e.request.url.includes('res/') || static_assets.includes(e.request.url);

    e.respondWith(
        caches.match(e.request).then(cacheRes => {
            if (prioritize_cached) {
                return cacheRes || fetch(e.request).then(fetchRes => {
                    return caches.open(dynamic_cache_name).then(cache => {
                        cache.put(e.request.url, fetchRes.clone());
                        limit_cache_size(dynamic_cache_name, dynamic_cache_limit);
                        return fetchRes;
                    })
                })
            } else {
                return fetch(e.request).then(fetchRes => {
                    return caches.open(dynamic_cache_name).then(cache => {
                        cache.put(e.request.url, fetchRes.clone());
                        limit_cache_size(dynamic_cache_name, dynamic_cache_limit);
                        return fetchRes;
                    })
                })
                .catch(() => {
                    return cacheRes || caches.match('/fallback.html')
                })
            }
        }).catch(() => {
            if (!e.request.url.includes('media/') && !e.request.url.includes('res/'))
                return caches.match('/fallback.html')
        })
    )
})
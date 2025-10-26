// should be versioned to update cached resources

const static_cache_name = 'site-static-v1-3-01';
const dynamic_cache_name = 'site-dynamic-v1-3-01';
const dynamic_cache_limit = 50;

const static_assets = [
    '/fallback.html', // <-- make sure it looks like the other pages!
    '/manifest.json',

    '/new',
    '/how-to-install',

    '/css/global.css',
    '/css/index.css',
    '/css/new.css',
    '/css/post.css',
    '/css/responsive.css',
    
    '/js/app.js',
    '/js/index.js',
    '/js/post.js',
    '/js/postbuilder.js',
    '/js/lib/heic2any.min.js',

    '/res/icons/32.png',
    '/res/icons/512.png',
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

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(static_cache_name).then((cache) => {
            cache.addAll(static_assets);
        })
        .then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== static_cache_name && key !== dynamic_cache_name)
                .map(key => caches.delete(key))
            )
        })
    )
})

self.addEventListener('fetch', e => {
    const is_static = static_assets.includes(e.request.url.replace(self.location.origin, ''));
    const is_media = e.request.url.includes('backblazeb2.com') || e.request.url.includes('res/');
    const prioritize_cached = is_media || is_static;

    e.respondWith(
        caches.match(e.request).then(cacheRes => {
            if (prioritize_cached) {
                return cacheRes || fetch(e.request).then(fetchRes => {
                    return caches.open(is_static ? static_cache_name : dynamic_cache_name).then(cache => {
                        cache.put(e.request.url, fetchRes.clone());
                        if (is_static) limit_cache_size(dynamic_cache_name, dynamic_cache_limit);
                        return fetchRes;
                    })
                })
                .catch((err) => {
                    return err;
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
        }).catch((err) => {
            if (!is_media) {
                return caches.match('/fallback.html')
            } else {
                return err;
            }
        })
    )
})

// push

self.addEventListener('push', e => {
    const data = e.data?.json() ?? {};
    const title = data.title;
    const body = data.body;

    self.registration.showNotification(title, {
        body: body,
        icon: '/res/icons/512.png',
        silent: true,
        data: {
            url: data.url ? self.location.origin + data.url : null
        }
    });
})

self.addEventListener('notificationclick', e => {
    const url = e.notification.data.url ? e.notification.data.url : self.location.origin;
    clients.openWindow(url);
})
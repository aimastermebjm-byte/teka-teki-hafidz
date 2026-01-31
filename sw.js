const CACHE_NAME = 'hafidz-app-v6'; // Force Update for 3D Badges
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './voice-quiz.js',
    './assets/app.js',
    './assets/firebase-config.js',
    './assets/quran-data.js',
    './assets/google-tts-service.js',
    './assets/gemini-service.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Quicksand:wght@300;400;500;600;700&display=swap',
    './assets/app-icon.jpg'
];

// Install Event
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force active immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // IGNORE Firestore & Google API requests (let them go to network directly)
    if (url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('googleapis.com') ||
        url.href.includes('firebase')) {
        return; // Do not call respondWith, let browser handle it
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

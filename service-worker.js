self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("smart-health-v1").then((cache) => {
      return cache.addAll([
        "index.html",
        "home.html",
        "style.css",
        "home.css",
        "script.js",
        "home.js"
      ]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
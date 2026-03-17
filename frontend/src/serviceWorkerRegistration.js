// src/serviceWorkerRegistration.js

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
  window.location.hostname === "[::1]" ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export function register() {

  if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl);
      } else {
        registerValidSW(swUrl);
      }

    });

  }

}

/* =========================
   MAIN REGISTER FUNCTION
========================= */

function registerValidSW(swUrl) {

  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {

      console.log("✅ Service Worker registered");

      /* 🔥 UPDATE DETECTION */
      registration.onupdatefound = () => {

        const installingWorker = registration.installing;

        if (!installingWorker) return;

        installingWorker.onstatechange = () => {

          if (installingWorker.state === "installed") {

            if (navigator.serviceWorker.controller) {

              console.log("🚀 New update available");

              // ✅ FINAL: USER CONTROLLED UPDATE
              const shouldUpdate = window.confirm(
                "🚀 New update available.\nClick OK to update now."
              );

              if (shouldUpdate) {
                window.location.reload();
              }

            } else {

              console.log("✅ Content cached for offline use");

            }

          }

        };

      };

    })
    .catch((error) => {
      console.error("❌ SW registration failed:", error);
    });

}

/* =========================
   LOCALHOST CHECK
========================= */

function checkValidServiceWorker(swUrl) {

  fetch(swUrl)
    .then((response) => {

      const contentType = response.headers.get("content-type");

      if (
        response.status === 404 ||
        (contentType && contentType.indexOf("javascript") === -1)
      ) {

        navigator.serviceWorker.ready.then((registration) => {

          registration.unregister().then(() => {
            console.log("♻️ Old Service Worker removed");
            window.location.reload();
          });

        });

      } else {
        registerValidSW(swUrl);
      }

    })
    .catch(() => {
      console.log("⚠️ No internet — running in offline mode");
    });

}
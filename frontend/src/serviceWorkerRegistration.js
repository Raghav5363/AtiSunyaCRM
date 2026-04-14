const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      checkValidServiceWorker(swUrl);
      return;
    }

    registerValidSW(swUrl);
  });
}

function registerValidSW(swUrl) {
  navigator.serviceWorker.register(swUrl).catch((error) => {
    console.error("Service worker registration failed:", error);
  });
}

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
            window.location.reload();
          });
        });
        return;
      }

      registerValidSW(swUrl);
    })
    .catch(() => {
      console.log("No internet. Running in offline mode.");
    });
}

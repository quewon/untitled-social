if (navigator.serviceWorker) {
    navigator.serviceWorker.register('/serviceworker.js')
        .catch((err) => console.error(err))
}
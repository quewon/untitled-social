if (navigator.serviceWorker) {
    navigator.serviceWorker.register('/serviceworker.js')
        .then((reg) => console.log(reg))
        .catch((err) => console.error(err))
}
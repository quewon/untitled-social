if (navigator.serviceWorker) {
    navigator.serviceWorker.register('/serviceworker.js')
        .catch((err) => console.error(err))
}

// enable push notifications
async function subscribe() {
    let service_worker = await navigator.serviceWorker.ready;
    let push = await service_worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BL2l-t4IJf73pZL9wd_SJ1SNQJ0wdB84KJ1L9Dzki8-NGRQtJNGmeH5HBWAyQaAPDSkaMU30TSb54aR8EI9lasU'
    });

    let form = new FormData();
    form.append("data", JSON.stringify(push));

    let result = await fetch('/subscribe', {
        method: 'POST',
        body: form
    })
    .then(res => res.json())
    .catch(err => console.log(err))

    if (result) {
        console.log(result);
    } else {
        alert("error subscribing to push notifications--try again later?");
    }
}
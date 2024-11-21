if (navigator.serviceWorker) {
    navigator.serviceWorker.register('/serviceworker.js')
        .catch((err) => console.error(err))
}

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    set_dark_mode();
} else {
    set_light_mode();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const newColorScheme = event.matches ? "dark" : "light";
    if (newColorScheme == "dark") {
        set_dark_mode();
    } else {
        set_light_mode();
    }
});

function set_dark_mode() {
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#1b1b1c');
    document.querySelector('meta[name="background-color"]').setAttribute('content', '#1b1b1c');
}

function set_light_mode() {
    document.querySelector('meta[name="theme-color"]').setAttribute('content', 'white');
    document.querySelector('meta[name="background-color"]').setAttribute('content', 'white');
}
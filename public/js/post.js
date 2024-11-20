function treat_posts() {
    for (let el of document.querySelectorAll(".date-relative")) {
        const timestamp = Number(el.textContent);
        el.textContent = get_relative_date(timestamp);
        el.title = get_absolute_date(timestamp);
    }

    for (let album of document.querySelectorAll(".album")) {
        treat_album(album);
    }

    for (let audio of document.querySelectorAll(".audio")) {
        treat_audio(audio);
    }

    for (let image of document.querySelectorAll("img")) {
        if (image.src && image.src.endsWith("-doodle")) image.classList.add("doodle");
    }
}

function treat_album(block) {
    var wrapper = block.querySelector(".slides-wrapper");
    var slides = block.querySelector(".slides");

    block.dataset.slides_count = slides.children.length;
    block.dataset.slide_index = 1;

    // slide counter

    var counter = document.createElement("div");
    counter.className = "counter";
    counter.textContent = "1/" + slides.children.length;

    // nav bubbles

    var bubbles = document.createElement("div");
    bubbles.className = "bubbles";
    for (let i=0; i<slides.children.length; i++) {
        var bubble = document.createElement("div");
        if (slides.children.length > 5) bubble.classList.add("hidden");
        bubbles.appendChild(bubble);
    }

    wrapper.onscroll = function() {
        block.dataset.slide_index = Math.round(this.scrollLeft / this.clientWidth) + 1;
        counter.textContent = block.dataset.slide_index + "/" + block.dataset.slides_count;

        let index = Number(block.dataset.slide_index) - 1;
        let slides = Number(block.dataset.slides_count);
        for (let i=0; i<bubbles.children.length; i++) {
            let bubble = bubbles.children[i];
            if (i == index) {
                bubble.classList.add("selected");
            } else {
                bubble.classList.remove("selected");
            }
            if (slides > 5) {
                if (
                    index < slides - 2 && i == index + 3 ||
                    index > 2 && i == index - 3
                ) {
                    bubble.classList.remove("hidden");
                    bubble.classList.add("small");
                } else {
                    bubble.classList.remove("small");
                    if (i < index - 2.5 || i > index + 2.5) {
                        bubble.classList.add("hidden");
                    } else {
                        bubble.classList.remove("hidden");
                    }
                }
            }
        }
    }

    block.appendChild(counter);
    block.appendChild(bubbles);

    wrapper.onscroll();
}

function treat_audio(block) {
    var audio = block.querySelector("audio");

    var controls = document.createElement("div");
    controls.className = "controls";
    controls.innerHTML = `
        <button class="play-button icon-button paused">
            <img class="play-icon" src="/res/play.svg" title="play" alt="play" draggable="false">
            <img class="pause-icon" src="/res/pause.svg" title="pause" alt="pause" draggable="false">
        </button>
        <input type="range" min="0" max="100" value="0" disabled="true">
        <div class="time">0:00 / 0:00</div>
        <a class="download-button icon-button" href="${audio.querySelector('source').src}"><img src="/res/download.svg" title="download" alt="download" draggable="false"></a>
    `;

    audio.classList.add("hidden");
    block.prepend(controls);

    var play_button = controls.querySelector(".play-button");
    play_button.onclick = () => {
        if (play_button.classList.contains("paused")) {
            if (audio.currentTime >= audio.duration) {
                audio.pause();
                audio.currentTime = 0.0001;
            }
            audio.play();
        } else {
            audio.pause();
        }
    }

    audio.onplay = () => {
        play_button.classList.remove("paused");
        play_button.classList.add("playing");
    }

    audio.onended = audio.onpause = () => {
        play_button.classList.add("paused");
        play_button.classList.remove("playing");
    }

    var seeking = false;

    var time_element = controls.querySelector(".time");
    audio.ontimeupdate = audio.onloadedmetadata = audio.ondurationchange = () => {
        if (!isNaN(audio.duration) && audio.duration != Infinity && audio.duration > 0.0001) slider.disabled = false;
        if (play_button.classList.contains("playing")) {
            if (audio.duration == Infinity) {
                slider.value = 0;
            } else if (!isNaN(audio.duration) && audio.duration > 0.0001 && !seeking) {
                slider.value = (audio.currentTime / audio.duration) * 100;
            }
        }
        time_element.textContent = get_audio_time_string(audio.currentTime) + " / " + get_audio_time_string(audio.duration == Infinity ? 0 : audio.duration);
    };

    var slider = controls.querySelector("input[type='range']");
    slider.onmousedown = slider.ontouchstart = () => { seeking = true; }
    slider.onmouseup = slider.ontouchend = () => { seeking = false; }
    slider.onchange = () => {
        audio.currentTime = audio.duration * (slider.value / 100) || 0;
        time_element.textContent = get_audio_time_string(audio.currentTime) + " / " + get_audio_time_string(audio.duration);
    }
}

function get_audio_time_string(seconds) {
    seconds = Math.floor(seconds);

    var sec = seconds % 60;
    var min = Math.floor(seconds / 60) % 60;
    var hour = Math.floor(seconds / 60 / 60);
    if (sec < 10) sec = '0'+sec;
    if (hour > 0 && min < 10) min = '0'+min;

    if (hour > 0) {
        return hour + ':' + min + ':' + sec;
    } else {
        return min + ':' + sec;
    }
}

function get_absolute_date(timestamp) {
    var date = new Date(Number(timestamp));

    var month = format_number(date.getMonth() + 1);
    var day = format_number(date.getDate());
    var hour = format_number(date.getHours());
    var min = format_number(date.getMinutes());
    var sec = format_number(date.getSeconds());

    return date.getFullYear() + '/' + month + '/' + day + ' ' + hour + ':' + min + ':' + sec
}

function get_relative_date(timestamp) {
    if (timestamp == 0) return "soon";

    var date;

    var current_date = new Date();
    var post_date = new Date(Number(timestamp));

    let a = get_absolute_date(timestamp).split(" ");
    let hours = post_date.getHours();

    var ampm_time = 
        (hours > 12 ? hours - 12 : hours) +
        (hours > 12 ? "pm" : "am");
    if (ampm_time == "12am") ampm_time = "midnight";

    let current_year = current_date.getFullYear();
    if (current_year == post_date.getFullYear()) {
        if (current_date.getMonth() == post_date.getMonth()) {
            let current_day = current_date.getDate();
            if (current_day == post_date.getDate()) {
                var seconds_elapsed = (current_date - post_date) / 1000;
                var minutes_elapsed = seconds_elapsed / 60;
                var hours_elapsed = minutes_elapsed / 60;

                if (hours_elapsed < 1) {
                    if (minutes_elapsed < 1) {
                        if (seconds_elapsed < 5) {
                            date = "now"
                        } else {
                            date = Math.floor(seconds_elapsed) + " seconds ago"
                        }
                    } else {
                        if (minutes_elapsed < 2) {
                            date = "a minute ago";
                        } else {
                            date = Math.floor(minutes_elapsed) + " minutes ago";
                        }
                    }
                } else {
                    if (hours_elapsed < 2) {
                        date = "an hour ago";
                    } else {
                        date = ampm_time;
                    }
                }
            } else {
                var days_passed = current_day - Number(post_date.getDate());
                if (days_passed == 1) {
                    date = ampm_time + ", yesterday";
                } else if (days_passed < 7) {
                    var weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    date = ampm_time + ", " + weekdays[post_date.getDay()];
                } else {
                    date = ampm_time + ", " + days_passed + " days ago";
                }
            }
        } else {
            date = (post_date.getMonth() + 1) + "/" + post_date.getDate();
        }
    } else {
        var years_passed = current_year - post_date.getFullYear();
        if (years_passed == 1) {
            date = "last year";
        } else {
            date = years_passed + " years ago";
        }
    }

    return date;
}

function format_number(n) {
    if (n < 10) return '0' + n;
    return n;
}
function treat_posts() {
    for (let album of document.querySelectorAll(".album")) {
        treat_album(album);
    }

    for (let audio of document.querySelectorAll(".audio")) {
        treat_audio(audio);
    }
}

function treat_album(block) {
    var wrapper = block.querySelector(".slides-wrapper");
    var slides = block.querySelector(".slides");

    // slide counter

    var counter = document.createElement("div");
    counter.className = "counter";
    counter.textContent = "1/" + slides.children.length;
    block.appendChild(counter);

    // navigation buttons

    block.dataset.slides_count = slides.children.length;
    block.dataset.slide_index = 1;

    var nav = document.createElement("div");
    nav.className = "navigation";

    var button_prev = document.createElement("button");
    var button_next = document.createElement("button");
    button_prev.textContent = "<";
    button_next.textContent = ">";
    nav.appendChild(button_prev);
    nav.appendChild(button_next);

    button_prev.onclick = () => {
        let index = Number(block.dataset.slide_index);
        index--;
        if (index < 1) index = Number(block.dataset.slides_count);

        wrapper.scrollLeft = (index - 1) * wrapper.clientWidth;
        block.dataset.slide_index = index;
    }

    button_next.onclick = () => {
        let index = Number(block.dataset.slide_index);
        index++;
        if (index > Number(block.dataset.slides_count)) index = 1;

        wrapper.scrollLeft = (index - 1) * wrapper.clientWidth;
        block.dataset.slide_index = index;
    }

    wrapper.onscroll = function() {
        block.dataset.slide_index = Math.round(this.scrollLeft / this.clientWidth) + 1;
        counter.textContent = block.dataset.slide_index + "/" + block.dataset.slides_count;
    }

    block.appendChild(nav);
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
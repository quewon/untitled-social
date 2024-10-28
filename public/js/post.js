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
        <a class="play-button paused">
            <img class="play-icon" src="/res/play.svg" title="play" alt="play">
            <img class="pause-icon" src="/res/pause.svg" title="pause" alt="pause">
        </a>
        <input type="range" class="slider" max="100" value="0">
        <div class="time">0:00 / 0:00</div>
        <a class="download-button" href="${audio.querySelector('source').src}"><img src="/res/download.svg" title="download" alt="download"></a>
    `;

    audio.classList.add("hidden");
    block.appendChild(controls);

    var play_button = controls.querySelector(".play-button");
    play_button.onclick = () => {
        if (audio.paused) {
            audio.play();
            play_button.className = "play-button playing";
        } else {
            audio.pause();
            play_button.className = "play-button paused";
        }
    }

    var seeking = false;

    var time_element = controls.querySelector(".time");
    audio.addEventListener("timeupdate", () => {
        if (!seeking) slider.value = (audio.currentTime / audio.duration) * 100;
        time_element.textContent = get_audio_time_string(audio.currentTime) + " / " + get_audio_time_string(audio.duration);
    })

    var slider = controls.querySelector(".slider");
    slider.onmousedown = slider.ontouchstart = () => { seeking = true; }
    slider.onmouseup = slider.ontouchend = () => { seeking = false; }
    slider.onchange = () => {
        audio.currentTime = audio.duration * (slider.value / 100);
        time_element.textContent = get_audio_time_string(audio.currentTime) + " / " + get_audio_time_string(audio.duration);
    }

    audio.load();
    audio.onloadeddata = slider.onchange;

    audio.onended = () => {
        play_button.className = "play-button paused";
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
function treat_posts() {
    var albums = document.querySelectorAll(".album");
    for (let album of albums) {
        treat_album(album);
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
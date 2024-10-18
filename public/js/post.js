function treat_posts() {
    var albums = document.querySelectorAll(".album");
    for (let album of albums) {
        treat_album(album);
    }
}

function treat_album(block) {
    var navigation = block.querySelector(".navigation");
    var buttons = navigation.querySelectorAll(".nav-button");
    var counter = navigation.querySelector(".counter");
    var slides = block.querySelector(".slides");

    counter.textContent = "1/" + slides.children.length;
    counter.dataset.count = 1;
    counter.dataset.length = slides.children.length;

    buttons[0].onclick = () => {
        slides.appendChild(slides.firstElementChild);
        var count = Number(counter.dataset.count) - 1;
        if (count < 1) count = counter.dataset.length;
        counter.dataset.count = count;
        counter.textContent = count + "/" + counter.dataset.length;
    }
    buttons[1].onclick = () => {
        slides.prepend(slides.lastElementChild);
        var count = Number(counter.dataset.count) + 1;
        if (count > Number(counter.dataset.length)) count = 1;
        counter.dataset.count = count;
        counter.textContent = count + "/" + counter.dataset.length;
    }
}
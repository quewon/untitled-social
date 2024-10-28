const max_file_size = 1000 * 1000 * 10;

const replying_to = document.getElementById("replying_to").textContent;

const block_templates = {
    upload: document.getElementById("upload-block-template"),
    rec: document.getElementById("rec-block-template"),
    draw: document.getElementById("draw-block-template"),

    text: document.getElementById("text-block-template"),
    image: document.getElementById("image-block-template"),
    video: document.getElementById("video-block-template"),
    audio: document.getElementById("audio-block-template"),
    album: document.getElementById("album-block-template")
}

const media_tags = ['image', 'video', 'audio'];

var file_of_objecturl = {};

// build post

const post_builder = document.getElementById("post-builder");
var reordering_post = false;

function add_post_block(type) {
    var template = block_templates[type];
    var clone = template.content.firstElementChild.cloneNode(true);
    var element = post_builder.appendChild(clone);

    if (type == 'text') {
        element.querySelector("textarea").focus();
    } else if (type == 'rec') {
        start_recording(element);
    } else if (type == 'draw') {
        setup_canvas(element);
    } else if (type == 'audio') {
        treat_audio(element);
    }

    return element;
}

function post_to_markdown() {
    var markdown = "";

    var blocks = post_builder.getElementsByClassName("block");
    for (let i=0; i<blocks.length; i++) {
        var block = blocks[i];
        var src = block.dataset.src;

        switch (block.dataset.type) {
            case "text":
                markdown += block.querySelector("textarea").value + "\n\n";
                break;
            case "image":
                markdown += "![image](" + src + ")\n\n";
                break;
            case "audio":
                markdown += "![audio](" + src + ")\n\n";
                break;
            case "video":
                markdown += "![video](" + src + ")\n\n";
                break;
            case "album":
                markdown += "![album](\n";
                var slides = block.querySelector(".slides");
                for (let i=0; i<slides.children.length; i++) {
                    let b = slides.children[i];
                    markdown += "    ![" + b.dataset.type + "](" + b.dataset.src + ")";
                    if (i < slides.children.length - 1) markdown += ",\n"
                }
                markdown += "\n)\n\n";
                break;
        }
    }

    return markdown.trim();
}

// publish post

const confirm_dialog = document.getElementById("confirm-dialog");
const upload_dialog = document.getElementById("upload-dialog");
const post_name = document.getElementById("post-name");

async function upload_post() {
    upload_dialog.showModal();
    uploading_post = true;

    console.log("uploading files...");

    await upload_all_files();

    if (!uploading_post) return;

    var form = new FormData();
    form.append("name", post_name.value);
    form.append("post", post_to_markdown());
    form.append("replying_to", replying_to);

    var res = await fetch('/publish', {
        method: 'POST',
        body: form
    });
    var json = await res.json();
    
    uploading_post = false;
    upload_dialog.close();
    
    if (json && json.path) {
        location.href = '/' + json.path;
    } else {
        alert("error? try again!");
    }
}

// file blocks

function dragover(element, e) {
    element.classList.add('dragover');
    e.preventDefault();
}

function drop(file_block, element, e) {
    if (element) element.classList.remove('dragover');

    var files = [];
    if (e.dataTransfer.items) {
            [...e.dataTransfer.items].forEach((item) => {
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    files.push(file);
                }
            })
    } else {
        files = e.dataTransfer.files;
    }

    add_files(file_block, files);

    e.preventDefault();
    e.stopPropagation();
}

var filereader = new FileReader();

function get_file_block_src_element(block) {
    let type = block.dataset.type;
    switch (type) {
        case "image":
            if (block.classList.contains("draw")) {
                return null;
            } else {
                return block.querySelector("img");
            }
            break;
        case "video":
        case "audio":
            return block.querySelector("source");
            break;
    }
    return null;
}

function add_files(file_block, files) {
    var new_blocks = [];

    [...files].forEach((file) => {
        var block = add_file(file_block, file);
        if (block) {
            file_block = block;
            new_blocks.push(block);
        }
    });

    if (new_blocks.length > 1) {
        // create album
        var album = add_post_block('album');
        var slides = album.querySelector(".slides");
        file_block.after(album);

        for (let block of new_blocks) {
            block.classList.remove("block");
            block.querySelector(".options").remove();
            slides.appendChild(block);
        }

        treat_album(album);
    }
}

function add_file(file_block, file) {
    if (file.size > max_file_size) {
        alert("File too large :(\n(max file size: 10 MB)");
        file_block.after(add_post_block('upload'));
        file_block.remove();
        return;
    }

    const type = file.type.split("/")[0];

    if (block_templates[type]) {
        var block = add_post_block(type);

        if (file_block) {
            if (file_block.dataset.type == "upload") {
                file_block.replaceWith(block);
            } else {
                file_block.after(block);
            }
        }

        var object_url = URL.createObjectURL(file);
        var element_with_src;

        switch (type) {
            case "text":
                var textarea = block.querySelector("textarea");
                filereader.readAsText(file, "UTF-8");
                filereader.onload = (e) => {
                    textarea.value = e.target.result;
                }
                filereader.onerror = (e) => {
                    textarea.value = "error reading file";
                }
                break;
            case "video":
            case "audio":
                var source = block.querySelector("source");
                source.src = object_url;
                source.type = file.type;
                element_with_src = source;
                break;
            default:
                element_with_src = get_file_block_src_element(block);
                element_with_src.src = object_url;
                break;
        }

        block.dataset.src = object_url;
        file_of_objecturl[object_url] = file;

        return block;
    } else {
        alert("file type " + file.type + " not supported :(");
    }
}

function all_file_blocks() {
    var query = "";
    for (let tag of media_tags) {
        query += "[data-type='"+tag+"'],";
    }
    query = query.slice(0, -1);
    return post_builder.querySelectorAll(query);
}

function all_files_uploaded() {
    var blocks = all_file_blocks();
    for (let block of blocks) {
        if (!block.classList.contains("upload-complete")) return false;
    }
    return true;
}

var uploading_post = false;

async function upload_all_files() {
    var blocks = all_file_blocks();

    var failed_upload_count = 0;
    
    while (!all_files_uploaded()) {
        var counted_failed_upload = false;

        // attempt to re-upload failed uploads
        for (let block of blocks) {
            if (!uploading_post) return;
            if (block.classList.contains("upload-failed")) {
                if (!counted_failed_upload) {
                    failed_upload_count++;
                    counted_failed_upload = true;

                    if (failed_upload_count > 3) {
                        alert("failed to upload media up to 3 times in a row. check your network connection--otherwise, the server might be down!");
                        uploading_post = false;
                        upload_dialog.close();
                        return;
                    }
                }

                block.classList.remove("upload-failed");
            }
            if (!block.classList.contains("upload-complete")) {
                let file = file_of_objecturl[block.dataset.src];
                await upload_file(file, get_file_block_src_element(block), block);
            }
        }

        await wait(500);

        console.log(failed_upload_count);
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function upload_file(file, src_element, block) {
    var form = new FormData();
    form.append("file", file);

    var res = await fetch('/upload', {
        method: 'POST',
        body: form
    });
    var json = await res.json();

    if (json && json.path) {
        block.dataset.src = json.path;
        if (src_element) src_element.src = json.path;
        if (block) block.classList.add("upload-complete");
    } else {
        if (block) block.classList.add("upload-failed");

        if (json && json.message) {
            console.error(json.message);

            if (json.message == 'File too large') {
                alert("File too large :(\n(max file size: 10 MB)");
                uploading_post = false;
                upload_dialog.close();
                if (block) {
                    block.after(add_post_block('upload'));
                    block.remove();
                }
            }
        }
    }
}

// recording

function start_recording(block) {
    var stop_button = block.querySelector("button");
    var time_counter = block.querySelector(".time");

    if (navigator.mediaDevices.getUserMedia) {
        let chunks = [];
        let time = 0;
        let onSuccess = (stream) => {
            const recorder = new MediaRecorder(stream);
            block.classList.add("recording");
            recorder.start();

            var interval = setInterval(() => {
                time += 1;
                time_counter.textContent = get_audio_time_string(time);
            }, 1000);

            stop_button.onclick = () => {
                recorder.stop();
                block.classList.remove("recording");
            }

            recorder.onstop = (e) => {
                clearInterval(interval);

                // create block
                var audio_block = add_post_block('audio');
                block.after(audio_block);
                block.remove();

                const blob = new Blob(chunks);
                chunks = [];

                var extension = '';
                switch (recorder.mimeType) {
                    case 'audio/mpeg':
                        extension = ".mp3";
                        break;
                    default:
                        if (recorder.mimeType.trim() == '') {
                            extension = ".webm";
                        } else {
                            extension = "." + recorder.mimeType.split('/')[1];
                        }
                        break;
                }

                const url = URL.createObjectURL(blob);
                file_of_objecturl[url] = new File([blob], "recording" + extension, { type: recorder.mimeType });
                audio_block.dataset.src = url;

                let source = audio_block.querySelector("source");
                source.src = url;
                source.type = recorder.mimeType;
            }

            recorder.ondataavailable = (e) => {
                chunks.push(e.data);
            }
        }

        let onError = (error) => {
            console.log(error);
            alert("error occured while recording :(");
            block.remove();
        }

        navigator.mediaDevices.getUserMedia({ audio: true }).then(onSuccess, onError);
    } else {
        alert("recording not supported on this browser");
        block.remove();
    }
}

// drawing

function setup_canvas(block) {
    var canvas = block.querySelector("canvas");
    var pencil = block.querySelector(".pencil");
    var eraser = block.querySelector(".eraser");

    var context = canvas.getContext("2d");

    var mode = 0;
    var mousedown = false;
    var radius = [5, 3];
    var prev_point;

    context.lineCap = "round";
    context.fillStyle = context.strokeStyle = "black";

    pencil.onclick = () => {
        eraser.classList.remove("selected");
        pencil.classList.add("selected");
        mode = 1;
        context.lineWidth = radius[mode] * 1.2;
        context.globalCompositeOperation = "source-over";
    }
    eraser.onclick = () => {
        pencil.classList.remove("selected");
        eraser.classList.add("selected");
        mode = 0;
        context.lineWidth = radius[mode] * 2;
        context.globalCompositeOperation = "destination-out";
    }

    pencil.onclick();

    canvas.onmousedown = canvas.ontouchstart = (e) => {
        mousedown = true;
        canvas.classList.add("drawing");

        let touch = e.touches ? e.touches[0] : e;
        let rect = canvas.getBoundingClientRect();
        let x = touch.pageX - rect.left;
        let y = touch.pageY - rect.top - document.documentElement.scrollTop;
        draw(x, y);
    }
    canvas.onmouseup = canvas.onmouseleave = canvas.ontouchend = () => {
        if (prev_point) {
            let x = prev_point.x;
            let y = prev_point.y;
            prev_point = null;
            draw(x, y);
        }

        mousedown = false;
        prev_point = null;
        canvas.classList.remove("drawing");

        // turn canvas into blob
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            file_of_objecturl[url] = new File([blob], "doodle");
            block.dataset.src = url;
        })
    }
    document.addEventListener("mousemove", (e) => {
        if (mousedown) {
            let rect = canvas.getBoundingClientRect();
            let x = e.pageX - rect.left;
            let y = e.pageY - rect.top - document.documentElement.scrollTop;
            draw(x, y);
        }
    })
    canvas.addEventListener("touchmove", (e) => {
        if (mousedown) {
            let rect = canvas.getBoundingClientRect();
            let x = e.touches[0].pageX - rect.left;
            let y = e.touches[0].pageY - rect.top - document.documentElement.scrollTop;
            draw(x, y);
            e.preventDefault();
        }
    })

    function draw(x, y) {
        if (prev_point) {
            context.beginPath();
            context.moveTo(prev_point.x, prev_point.y);
            context.lineTo(x, y);
            context.stroke();
        } else {
            context.beginPath();
            context.arc(x, y, radius[mode], 0, Math.PI * 2);
            context.fill();
        }

        prev_point = { x: x, y: y };
    }

    canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    })
}
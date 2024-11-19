function treat_index(list) {
    for (let el of list.querySelectorAll(".date")) {
        const timestamp = Number(el.textContent);
        var date = get_absolute_date(timestamp);
        el.textContent = date.split(" ")[0];
        el.title = date;
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

function format_number(n) {
    if (n < 10) return '0' + n;
    return n;
}
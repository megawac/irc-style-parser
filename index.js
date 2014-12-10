/**
 * MIRC compliant colour and style parser
 * Unfortuanately this is a non trivial operation
 * See https://github.com/megawac/irc-style-parser
 */

var regex = {
    color: /\003([0-9]{1,2})[,]?([0-9]{1,2})?([^\003]+)/,
    terminator: /\x0F/,
    styles: [
        [/\002([^\002]+)(\002)?/, ["<span class='bold'>", "</span>"]],
        [/\037([^\037]+)(\037)?/, ["<span class='underline'>", "</span>"]]
    ]
};
function colors(text) {
    if (!text) {
        return text;
    }
    if (regex.terminator.test(text)) {
        return text.split(regex.terminator).map(colors).join("");
    }
    if (regex.color.test(text)) {
        var match, bg;
        while (match = regex.color.exec(text)) {
            var color = "irc-fg" + match[1];
            if (match[2]) {
                bg = match[2];
            }
            if (bg) {
                color += " irc-bg" + bg;
            }
            var text = text.replace(
                match[0],
                "<span class='" + color + "'>" + match[3] + "</span>"
            );
        }
    }
    for (var i in regex.styles) {
        var pattern = regex.styles[i][0];
        var style = regex.styles[i][1];
        if (pattern.test(text)) {
            var match;
            while (match = pattern.exec(text)) {
                text = text.replace(match[0], style[0] + match[1] + style[1]);
            }
        }
    }
    return text.replace(/[\x03\x1F\x0D]/g, "");
}

module.exports = colors;

/**
 * MIRC compliant colour and style parser
 * Unfortuanately this is a non trivial operation
 * See https://github.com/megawac/irc-style-parser
 */
var _ = require("underscore");

var styleCheck_Re = /[\x00-\x1F]/,
    back_re = /^(\d{1,2})(,(\d{1,2}))?/,
    colourKey = "\x03",
    // breaks all open styles ^O (\x0D)
    styleBreak = "\x0D";

var irc = module.exports = function stylize(line) { // more like stylize
    // http://www.mirc.com/colors.html
    // http://www.aviran.org/2011/12/stripremove-irc-client-control-characters/
    // https://github.com/perl6/mu/blob/master/examples/rules/Grammar-IRC.pm
    // regexs are cruel to parse this thing

    // already done?
    if (!styleCheck_Re.test(line)) return line;

    // split up by the irc style break character ^O
    if (line.indexOf(styleBreak) >= 0) {
        return line.split(styleBreak).map(stylize).join("");
    }

    var result = line;

    var parseArr = _.compact(result.split(colourKey));

    // Crude mapper for matching the start of a colour string to its end token
    // Groups each colours into subarrays until the next ^C or background colour
    var colouredarr = _.reduce(parseArr, function(memo, str) {
        var match = str.match(back_re);
        if (!match) { //^C1***
            memo.push([]);
        } else if (isFinite(match[3])) { // fore + background
            memo.push([str]);
        } else { // foreground only
            _.last(memo).push(str);
        }
        return memo;
    }, [[]]);

    _.each(colouredarr, function(colourarr) {
        _.each(colourarr, function(str, index) {
            var match = str.match(back_re);
            var colour = match[1];
            var background = match[3];

            // set the background colour
            // we set this seperate from the fore to allow for nesting
            if (isFinite(background) && irc.colours[background]) {
                var wrapStr = colourarr.slice(index).join(colourKey);
                    textIndex = colour.length + background.length + 1;
                str = colour + str.slice(textIndex);
                result = result.replace(colourKey + wrapStr, irc.template({
                    style: irc.colours[background].back,
                    text: colourKey + colour + wrapStr.slice(textIndex)
                }));
            }

            // set the fore colour
            if (irc.colours[colour]) {
                result = result.replace(colourKey + str, irc.template({
                    "style": irc.colours[colour].fore,
                    "text": str.slice(colour.length)
                }));
            }
        });
    });


    // Matching styles (italics/bold/underline)
    // if only colours were this easy...
    _.each(irc.styles.special, function(style) {
        if (result.indexOf(style.key) < 0) return;
        result = result.replace(style.keyregex, function(match, text) {
            return irc.template({
                "style": style.style,
                "text": text
            });
        });
    });

    //replace the reminent colour terminations and be done with it
    return result.replace(/\x03/g, "");
};

irc.template = _.template("<span class='<%= style %>'><%= text %></span>");

irc.styles = {
    colour: {
        name: "colour",
        style: "", //see below
        key: "\x03"
    }
};

irc.styles.special = _.map([["normal", "\x00", ""], ["underline", "\x1F"], ["bold", "\x02"], ["italic", "\x1D"]], function(style) {
    var escaped = encodeURI(style[1]).replace("%", "\\x");
    return (irc.styles[style[0]] = {
        name: style[0],
        style: style[2] != null ? style[2] : "irc-" + style[0],
        key: style[1],
        keyregex: new RegExp(escaped + "(.*?)(" + escaped + "|$)")
    });
});

//http://www.mirc.com/colors.html
irc.colours = _.reduce(["white", "black", "navy", "green", "red", "brown",
                        "purple", "olive", "yellow", "lightgreen", "teal",
                        "cyan", "blue", "pink", "gray", "lightgrey"],
    function(memo, name, index) {
    memo[index] = {
        name: name,
        fore: "irc-fg" + index,
        back: "irc-bg" + index,
        key: index
    };
    return memo;
}, {});

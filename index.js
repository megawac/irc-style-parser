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
        if (!result.contains(style.key)) return;
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

irc.styles = [
    {
        name: "normal",
        style: "",
        key: "\x00",
        keyregex: /\x00(.*?)(\x00|$)/
    },
    {
        name: "underline",
        style: "underline",
        key: "\x1F",
        keyregex: /\x1F(.*?)(\x1F|$)/
    },
    {
        name: "bold",
        style: "bold",
        key: "\x02",
        keyregex: /\x02(.*?)(\x02|$)/
    },
    {
        name: "italic",
        style: "italic",
        key: "\x1D",
        keyregex: /\x1D(.*?)(\x1D|$)/
    },
    {
        name: "colour",
        style: "", //see below
        key: "\x03",
        fore_re: /^(\d{1,2})/,
        back_re: /^((\d{1,2}),(\d{1,2}))/
    }
];

irc.styles.special = irc.styles.slice(0, 4);
irc.styles.colour = irc.styles[4];

//http://www.mirc.com/colors.html
irc.colours = {
    0: {
        name: "white",
        fore: "col0",
        back: "back0",
        key: 0
    },
    1: {
        name: "black",
        fore: "col1",
        back: "back1",
        key: 1
    },
    2: {
        name: "navy",
        fore: "col2",
        back: "back2",
        key: 2
    },
    3: {
        name: "green",
        fore: "col3",
        back: "back3",
        key: 3
    },
    4: {
        name: "red",
        fore: "col4",
        back: "back4",
        key: 4
    },
    5: {
        name: "brown",
        fore: "col5",
        back: "back5",
        key: 5
    },
    6: {
        name: "purple",
        fore: "col6",
        back: "back6",
        key: 6
    },
    7: {
        name: "olive",
        fore: "col7",
        back: "back7",
        key: 7
    },
    8: {
        name: "yellow",
        fore: "col8",
        back: "back8",
        key: 8
    },
    9: {
        name: "lightgreen",
        fore: "col9",
        back: "back9",
        key: 9
    },
    10: {
        name: "teal",
        fore: "col10",
        back: "back10",
        key: 10
    },
    11: {
        name: "cyan",
        fore: "col11",
        back: "back11",
        key: 11
    },
    12: {
        name: "blue",
        fore: "col12",
        back: "back12",
        key: 12
    },
    13: {
        name: "pink",
        fore: "col13",
        back: "back13",
        key: 13
    },
    14: {
        name: "gray",
        fore: "col14",
        back: "back14",
        key: 14
    },
    15: {
        name: "lightgrey",
        fore: "col15",
        back: "back15",
        key: 15
    }
};

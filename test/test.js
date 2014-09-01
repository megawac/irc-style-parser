var $ = require("cheerio");
var _ = require("underscore");
var test = require("prova");
var ircStylize = require("..");

//@Todo add tests to make sure the result contains the same string
function colourise(msg) {
    return $.parseHTML(ircStylize(msg));
}

function getText(ele) {
    return _.reduce(ele, function(sofar, kid) {
        return sofar + $(kid).text();
    }, "");
}

function $find(selector, target) {
    var $tar = $(target);
    var result = $tar.filter(selector);
    return result.length ? result : $(selector, $tar);
}

test("Colours no match cases", function(t) {
    t.plan(1);

    var msg = colourise("Some text \x03Keep space after\x03 ");
    t.equal(msg.length, 1);
});

test("isn't over eager on ^C", function(t) {
    t.plan(2);

    //Ignore only giving background (^C,B) per spec
    msg = colourise("abc\x03,12coloured text and background\x03");
    t.equal(msg.length, 1);
    t.equal(getText(msg), "abc,12coloured text and background");
});

test("Matches foreground colours", function(t) {
    t.plan(4);

    var msg = colourise("\x035some text\x03");
    t.equal(msg.length, 1);
    t.equal($find(".irc-fg5", msg).text(), "some text");

    //shouldnt kill text outside
    msg = colourise("Some text \x035Keep space after\x03 outside");
    t.equal(msg.length, 3);
    t.equal($find(".irc-fg5", msg).text(), "Keep space after");
});

//background
test("Matches foreground+background", function(t) {
    t.plan(2);

    var msg = colourise("\x035,12coloured text and background\x03");
    t.equal($find(".irc-fg5", msg).text(), "coloured text and background");
    t.equal($find(".irc-bg12", msg).text(), "coloured text and background");
});

test("Isn't over eager with replacing", function(t) {
    t.plan(3);

    var msg = colourise("xxxx\x031x\x03xxx");
    t.equal($(msg[0]).text(), "xxxx");
    t.equal($(msg[1]).text(), "x");
    t.equal($(msg[2]).text(), "xxx");
});

test("breaks out of colour on ^3 character", function(t) {
    t.plan(3);

    var msg = colourise("Text outside\x030,1some text.\x03 no background");
    t.equal(msg.length, 3);
    t.equal($(msg[1]).text(), "some text.");
    t.equal(getText(msg), "Text outsidesome text. no background");
});

test("Supports nesting background colours", function(t) {
    t.plan(1);

    var msg = colourise("Text outside\x030,1some text \x035more text \x031final.\x03 no background");
    t.equal($(msg[1]).text(), "some text more text final.");
});

test("Matches multiple occurences of colours", function(t) {
    t.plan(7);

    var msg = colourise("\x033coloured text \x035,2more coloured text and background\x03");
    t.equal(msg.length, 2);
    t.equal($(msg[0]).text(), "coloured text ");
    t.equal($(msg[1]).text(), "more coloured text and background");

    msg = colourise("\x033,5coloured text and background \x038other coloured text but same background\x03");
    t.equal($find(".irc-fg3", msg).text(), "coloured text and background ");
    t.equal($find(".irc-fg8", msg).text(), "other coloured text but same background");

    msg = colourise("coloured \x033,5text and background \x038,7other coloured text and different\x03 background");
    t.equal(msg.length, 4);
    t.equal(getText(msg), "coloured text and background other coloured text and different background");
});

test("Matches normal style (^0)", function(t) {
    t.plan(1);

    var msg = colourise("this is \x00some text\x00 and some more text");
    t.equal(getText(msg), "this is some text and some more text");
});

test("Matches italic", function(t) {
    t.plan(3);

    var msg = colourise("this is \x1Dsome text\x1D and some more text");
    t.equal(msg.length, 3);
    t.equal($find(".irc-italic", msg).length, 1);
    t.equal(getText(msg), "this is some text and some more text");
});

test("Matches bold", function(t) {
    t.plan(3);

    var msg = colourise("this is \x02some text\x02 and some more text");
    t.equal(msg.length, 3);
    t.equal($find(".irc-bold", msg).length, 1);
    t.equal(getText(msg), "this is some text and some more text");
});

test("Matches underline", function(t) {
    t.plan(3);

    var msg = colourise("this is \x1Fsome text\x1F and some more text");
    t.equal(msg.length, 3);
    t.equal($find(".irc-underline", msg).length, 1);
    t.equal(getText(msg), "this is some text and some more text");
});

test("Mixed styles and colours", function(t) {
    t.plan(4);

    var msg = colourise("\x02this is \x1Fsome text\x1F and \x032,13Keep space after\x03 text\x02");
    t.equal(msg.length, 1);
    t.equal($find(".irc-bold", msg).length, 1);
    t.equal($find(".irc-underline", msg[0]).length, 1);
    t.equal($find(".irc-fg2", msg[0]).text(), 'Keep space after');
});

test("^O breaks open styles and colours", function(t) {
    t.plan(6);

    var msg = colourise("this is \x1Fsome text and\x0D some more\x1F text\x1F");
    t.equal(msg.length, 4);
    t.equal($find(".irc-underline", msg).length, 2);

    msg = colourise("\x02this is \x1Fsome text and\x0D\x032,13Keep space after\x03 text\x02");
    //NOTE: that bold at the end will count as a span
    t.equal(msg.length, 4);
    t.equal($find(".irc-bold", msg).length, 2);
    t.equal($find(".irc-underline", msg).length, 1);
    t.equal($(msg[0]).text(), "this is some text and");
});

test("Catches ^0 at start and end", function(t) {
    t.plan(2);

    t.equal(ircStylize("\x0Dtext"), "text");
    t.equal(ircStylize("text\x0D"), "text");
});

test("Don't require end signal", function(t) {
    t.plan(8);

    //don't require end signal
    var msg = colourise("Some text \x035keep on going ");
    t.equal(msg.length, 2);
    t.equal(getText(msg), "Some text keep on going ");

    msg = colourise("this is \x1Dsome text and some more text");
    t.equal(msg.length, 2);
    t.equal(getText(msg), "this is some text and some more text");

    msg = colourise("this is \x02some text and some more text");
    t.equal(msg.length, 2);
    t.equal(getText(msg), "this is some text and some more text");

    msg = colourise("this is \x1Fsome text and some more text");
    t.equal(msg.length, 2);
    t.equal(getText(msg), "this is some text and some more text");
});

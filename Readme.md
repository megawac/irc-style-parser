IRC Style and Colour Parser
===========

IRC Style parsing is ridiculously tricky as I found writing this for [qwebirc](https://github.com/megawac/qwebirc-enhancements). Besides the numerous edge cases, the spec is semi-ambigous (e.g. will the second x have a background in the string ``"^C1,2x^C3x"``?). This implementation follows the defacto implementations of mibbit and xchat -- however if you want options to handle particular cases cases differently make an issue.

This implementation should work consistently in near any environment (IE6+) and is [well tested](test/test.js)

Handles:
 - Unlimitted nesting
 - Colours (^C): Default outputs as
	```html
	<span class="back3"><span class="col3">message</span></span>
	```
 - Underlines (^u): Default outputs as
	```html
	<span class="underline">message</span>
	```
 - Italics (^i): Default outputs as
	```html
	<span class="italics">message</span>
	```
 - Bold (^B): Default outputs as
	```html
	<span class="bold">message</span>
	```
 - Normal (^o): Default outputs as
	```html
	<span class="">message</span>
	```
 - Escaping (^0): E.g.
	```js
		ircStylize("^Bbolded part ^0 not bolded part");
		// => "<span class="bold">bolded part </span> not bolded part"
	```

**Note:** the ^C/^u/etc isn't used internally - we only replace the UTF8 versions of the string [see here](http://oreilly.com/pub/h/1953)

Usage

```js
var ircStylize = require("irc-style-parser");
var Handlebars = require("Handlebars");
var jQuery 	   = require("jquery");

// Set template of ircStylize if desired called with {style: '', text: msg}
ircStylize.template = Handlebars.compile("<span class='{{style}}'>{{{text}}}</span>");

// Parse a message to HTML or whatever your template outputs
var $parsed = jQuery(ircStylize(msg));
```

Todo
- Drop underscore dependency
- Clean up styles
- Make it easier to add/change a colour

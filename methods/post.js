
/** @file post.js
 * \brief POST method handler
 *
 * This method is not yet implemented.
 */

var URL  = require('url');
var FS   = require('fs');
var spawn  = require('child_process').spawn;

module.exports = function ( request, response ) {
    var responder = this.vicarious.responder;
    var not_implemented = responder.not_implemented.bind( response );
    return not_implemented();
};

// vim:autoindent expandtab sw=4 syntax=javascript

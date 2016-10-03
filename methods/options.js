/** @file options.js
 * \brief OPTIONS method handler
 * 
 * In order to support CORS we need to provide an OPTIONS
 * handler that returns the following headers:
 * Access-Control-Allow-Origin: [the same origin from the request]
 * Access-Control-Allow-Methods: GET, POST, PUT
 * Access-Control-Allow-Headers: [the same ACCESS-CONTROL-REQUEST-HEADERS from request]
 *
 * To be WebDAV compliant we also need to provide an OPTIONS handler that:
 */

var URL  = require('url');
var FS   = require('fs');

module.exports = function ( request, response ) {
    var BASE = this.BASE;

    var responder = this.vicarious.responder;
    var ok = responder.ok.bind( response );

    response.setHeader( "Access-Control-Allow-Origin", "*" );
    response.setHeader( "Access-Control-Allow-Methods", "GET, POST, PUT, PROPFIND, PROPPATCH, DELETE" );
    response.setHeader( "Access-Control-Allow-Headers", "Content-Type" );

    ok( request, null );
};

// vim:autoindent expandtab sw=4 syntax=javascript

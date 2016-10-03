
/** @file get.js
 * \brief GET method handler
 */

var URL  = require('url');
var FS   = require('fs');
var spawn  = require('child_process').spawn;

function root_uri( request, response ) {
    var responder = this.vicarious.responder;
    var ok = responder.ok.bind(response);
    // this.writeHead( 200, {'Content-Type': 'application/rdf+xml'} );
    // this.write('...
    ok( request, '<links>root links</links>' );
}

/*
 * 'this' is bound to the HTTP server object.
 *
 * perhaps should just open and pass a stream to the handler.
 * that way the handler can work for both file read and for
 * the filter.
 *
 * Need to look up FS interface for open file as stream.
 * If stream open fails - then we still need simple "respond()"
 */

module.exports = function ( request, response ) {
    var BASE = this.BASE;
    var SHARE = this.SHARE;

    var gather = this.vicarious.gather;
    gather.prepare.call( response );

    var ok           = this.vicarious.responder.ok.bind(response);
    var not_found    = this.vicarious.responder.not_found.bind(response);

    function finish( code, signal ) {
        if ( code !== 0 ) {
            if ( code === 4 ) {
                return not_found( "404 error in adding live props\n");
            }
            return not_found( "ERROR ADDING LIVE PROPS\n");
        }
        ok( request, '' );
    }

    var url = URL.parse( request.url );
    var route = url.pathname;

    this.logger.log( "GET <"+route+">" );

    var pid;
    if (new RegExp('.*/$').test(route)) {
        // this is a collection or root
        pid = spawn('get-route-content-with-children', [route]);
    } else {
        pid = spawn('get-route-content', [route]);
    }

    pid.stdout.on('data', gather.output.bind(response));
    pid.stderr.on('data', gather.error.bind(response));
    pid.on('close', finish.bind(this));
};

/* vim: set autoindent expandtab sw=4 syntax=javascript: */

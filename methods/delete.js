
/** @file delete.js
 * \brief DELETE method handler
 */

var URL  = require('url');
var FS   = require('fs');
var spawn  = require('child_process').spawn;

/*
 * 1. get list of links for resource - remove each link
 * 2. remove actual resource
 */

module.exports = function ( request, response ) {
    var gather = this.vicarious.gather;
    gather.prepare.call( response );

    var responder = this.vicarious.responder;
    var method_not_allowed = responder.method_not_allowed.bind(response);
    var server_error       = responder.server_error.bind(response);
    var no_content         = responder.no_content.bind(response);

    var BASE = this.BASE;
    var url = URL.parse( request.url );

    // if url is a collection then - 405 method not allowed
    if ( new RegExp('.*/$').test(url.pathname) ) {
        return method_not_allowed( '' );
    }

    var file = BASE + '/' + url.pathname;

    // check if it is a symlink and translate to main resource

    function finish( err ) {
        return no_content();
    }

    function remove_resource( code, signal ) {
        if ( code === 0 ) return FS.unlink( file, finish );

        response.logger.log( "delete links process code=" + code + ' signal="' + signal + '"' );
        server_error( "could not delete resource links" );
    }

    var pid = spawn( "delete-resource-links", [file] );
    pid.on( 'close', remove_resource.bind(this) );
    pid.stdout.on( 'data', gather.output.bind(response) );
    pid.stderr.on( 'data', gather.error.bind(response) );
};

// vim:autoindent expandtab sw=4 syntax=javascript

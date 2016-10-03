
/** @file vicarious.js
 * \brief Main object
 */

var HTTP = require('http');
var FS   = require('fs');
var spawn  = require('child_process').spawn;

/** Vicarious base object.
 * 
 * The Vicarious object wraps the HTTP service object and provides
 * all of the handlers to provide the Vicarious API.
 */

function Vicarious( port, logger ) {
    this.port = port;
    this.server = HTTP.createServer();

    this.server.on( 'request',    this.handler.request );
    this.server.on( 'connection', this.handler.connection );
    this.server.on( 'close',      this.handler.close );

    this.server.logger = logger;

    this.server.BASE = '/var/db/vicarious';
    if ( FS.existsSync(this.server.BASE) == false ) {
        this.server.BASE = '/var/tmp';
    }

    this.server.SHARE = '/usr/share/vicarious/collection';
    if ( FS.existsSync('./share/vicarious/collection') ) {
        this.server.SHARE = './share/vicarious/collection';
    }

    this.server.XSLT = '/usr/share/vicarious/xslt';
    if ( FS.existsSync('./share/vicarious/xslt') ) {
        this.server.XSLT = './share/vicarious/xslt';
    }

    this.server.CATRDF = 'cat-rdf-with-live-props';
    if ( FS.existsSync('./bin/cat-rdf-with-live-props') ) {
        this.server.CATRDF = './bin/cat-rdf-with-live-props';
    }

    this.server.TOP_SHARE = '/usr/share/vicarious';
    if ( FS.existsSync('./share/vicarious') ) {
        this.server.TOP_SHARE = './share/vicarious';
    }
}

/**
 * this must be bound to a response object.
 *
 * Can this create the correct content_type base on the request.
 * Should allow for more specific headers.
 */
Vicarious.prototype.respond = function (code, content_type, data) {
    var headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': content_type
    };
    this.writeHead( code, headers );
    this.end( data );
};

Vicarious.prototype.responder = require( './methods/responses' );
Vicarious.prototype.gather = require( './methods/gather' );

/** Method handlers.
 *
 * Each method handler is a function.  When a request is received
 * the handler is called based on the HTTP method in the request.
 */

Vicarious.prototype.methods = {};

/** HTTP Service Event handlers.
 *
 */

Vicarious.prototype.handler = {};

Vicarious.prototype.handler.connection = function (stream) {
    this.logger.info( 'connection established' );
};

Vicarious.prototype.handler.close = function () {
    this.logger.info( 'connection closed' );
};

/*
 * The request handler splits the URI and looks for the
 * appropriate data.
 */
Vicarious.prototype.handler.request = function (request, response) {
    var responder = this.vicarious.responder;
    var not_implemented = responder.not_implemented.bind( response );

    var method = this.vicarious.methods[ request.method ];
    response.logger = this.logger;

    // This is to allow access to the config values, I may want
    // the config values to be factored out to their own object
    // at some point.
    response.server = this;

    // Set up the output gatherers for all responses
    this.vicarious.gather.prepare.call( response );

    if ( typeof method == 'undefined' ) { // Not implemented
        response.logger.notice( "unimplemented request '" + request.method + "'" );
        return not_implemented();
    }

    this.logger.info( 'request ' + request.method + ' ' + request.url );
    method.call( this, request, response );
};

Vicarious.prototype.start = function () {
    var vicarious = this;
    vicarious.hostname = 'localhost';
    var server = this.server;
    var logger = server.logger;

    server.vicarious = this;

    function start_server() {
        logger.info( 'using hostname ' + vicarious.hostname + ':' + vicarious.port );
        server.listen( vicarious.port, '::', 5 ); // backlog of 5 connections
    }

    function save_hostname( response ) {
        vicarious.hostname = '';
        response.on( 'data', function (chunk) {vicarious.hostname += chunk.toString();} );
        response.on( 'end', start_server );
    }

    var distro = "";
    function gather_output( data ) { distro += data; }

    /*
     * If we cannot run lsb_release or we are not running on an Amazon
     * release, then assume we are on localhost.
     */
    function get_hostname_from_metadata( code, signal ) {
        if ( code !== 0 )  return start_server();
        if ( distro.trim() !== 'AmazonAMI' ) {
            logger.info( 'Not running on AWS - distro is ' + distro.trim() );
            return start_server();
        }

        var options = {
          host: '169.254.169.254',
          path: '/latest/meta-data/public-hostname'
        };

        HTTP.request(options, save_hostname).end();
    }

    function spawn_error( code ) {
        console.log( "Could not determine lsb_release <" + code + "> assume localhost" );
        start_server();
    }

    var pid = spawn('lsb_release', ['-is']);
    pid.on( 'error', spawn_error );
    pid.on( 'close', get_hostname_from_metadata );
    pid.stdout.on( 'data', gather_output );
};

module.exports = Vicarious;

// vim:autoindent expandtab sw=4 syntax=javascript

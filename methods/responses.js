
/** @file responses.js
 * \brief Utility functions for handling responses in a consistent manner.
 */

var HTTP = require('http');
var FS   = require('fs');
var spawn  = require('child_process').spawn;

/** Canonicalize Accept header to something Vicarious understands
 *
 * If it is not present then we use our default.
 * If the client accepts anything then we use our default.
 * Otherwise we attempt to use the type the client requested.
 */
function determine_accept( header ) {
    if ( typeof header == 'undefined' ) return "application/rdf+xml";
    if ( header == null ) return "application/rdf+xml";
    header = header.split(';')[0].trim();  /* through away charset and whitespace */
    if ( header == '*/*' ) return "application/rdf+xml";
    return header;
}

/**
 * this must be bound to a response object.
 *
 * Keep in mind that writeHead does not flush the stream.
 * So this call does not have any effect on the output stream
 * until a write() or end() call is made.
 */
function send_header(code, content_type) {
    var headers = {
        'Server': 'Vicarious/1.0',
        'DAV': '1',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': content_type
    };
    this.writeHead( code, headers );
}

/**
 * this must be bound to a response object.
 *
 * Can this create the correct content_type base on the request.
 * Should allow for more specific headers.
 */
function respond(code, content_type, data) {
    send_header.call( this, code, content_type );
    this.end( data );
}

/**
 * this must be bound to a response object.
 */
function respond_with_error(code, content_type, data) {
    send_header.call( this, code, content_type );
    this.error_chunks.map( this.write.bind(this) );
    this.end( data );
}

function transform( request, accept ) {
    // if output_chunks are missing - then error?
    var stylesheet = this.server.XSLT + '/accept/' + accept + '.xslt';

    function start( exists ) {
        if ( exists === false ) {
            // Respond with "Unacceptable"
            return respond.call( this, 406, 'text/plain', 'NO TRANSFORM' );
        }

        send_header.call( this, 200, accept );

        var args = [ stylesheet, '-' ];
        var pid = spawn( 'xsltproc', args );

        function finish( code, signal ) {
            // ignore errors for now
            this.end();
        }
        pid.on( 'close', finish.bind(this) );

        // stream output of pid to response object
        pid.stdout.pipe( this );

        // write response output chunks to stdin of pid
        this.output_chunks.map( pid.stdin.write.bind(pid.stdin) );
        pid.stdin.end();
    }

    FS.exists( stylesheet, start.bind(this) );
}

function write_data_if_present( data ) {
    if ( typeof data === 'undefined' ) return;
    if ( data === null ) return;
    this.write( data );
}

module.exports = {};

/*
 * bound to response object.
 */
module.exports.ok = function (request, data) {
    this.logger.log( "sending ok response" );

    var accept = determine_accept( request.headers.accept );

    if ( accept != "application/rdf+xml" ) {
        return transform.call( this, request, accept );
    }

    send_header.call( this, 200, accept );
    var write_chunk = this.write.bind(this);

    if ( typeof this.output_chunks != 'undefined' ) this.output_chunks.map( write_chunk );
    write_data_if_present.call( this, data );
    this.end();
};

/*
 * bound to response object.
 */
module.exports.multistatus = function (request, data) {
    // var accept = determine_accept( request.headers.accept );
    // provide error when this is not what is expected

    send_header.call( this, 207, "text/xml" );
    var write_chunk = this.write.bind(this);

    if ( typeof this.output_chunks != 'undefined' ) this.output_chunks.map( write_chunk );
    write_data_if_present.call( this, data );
    this.end();
};

module.exports.no_content = function () {
    respond.call( this, 204, 'text/plain', null );
};

module.exports.forbidden = function (message) {
    respond.call( this, 403, 'text/plain', message );
};

module.exports.not_found = function (message) {
    respond.call( this, 404, 'text/plain', message );
};

module.exports.method_not_allowed = function () {
    respond.call( this, 405, 'text/plain', '' );
};

module.exports.not_acceptable = function () {
    respond.call( this, 406, 'text/plain', '' );
};

module.exports.conflict = function () {
    respond.call( this, 409, 'text/plain', '' );
};

module.exports.precondition_failed = function () {
    respond.call( this, 412, 'text/plain', '' );
};

module.exports.server_error = function (message) {
    respond_with_error.call( this, 500, 'text/plain', message );
};

module.exports.not_implemented = function () {
    respond.call( this, 501, 'text/plain', '<message>not implemented</message>' );
};

/*
 * bound to response object.
 */
module.exports.stream_multistatus = function (request, stream) {
    var accept = determine_accept( request.headers.accept );
    // provide error when this is not what is expected

    send_header.call( this, 207, 'text/xml' );
    // stream.on( 'error', ... );
    stream.pipe( this );
};

// vim:autoindent expandtab sw=4 syntax=javascript

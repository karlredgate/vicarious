
/** @file propfind.js
 * \brief WebDAV PROPFIND method handler
 *
 * PROPFIND responses are not RDF, they are a WebDAV specified
 * XML format and are Content-Type text/xml.
 */

var URL = require('url');
var create_pipeline = require('../lib/pipeline').create_pipeline;
var uuidgen = require('../lib/uuid').v4;
var FS = require('fs');
var spawn  = require('child_process').spawn;

module.exports = function ( request, response ) {
    var BASE = this.BASE;
    var XSLT = this.XSLT;

    var logger = this.logger;
    var responder = this.vicarious.responder;
    var server_error = responder.server_error.bind(response);
    var forbidden = responder.forbidden.bind(response);
    var multistatus = responder.multistatus.bind(response);

    var route = URL.parse(request.url).pathname;
    var headers = request.headers;
    var meta_xslt = XSLT + "/propfind.xslt";
    var uuid = uuidgen();

    var tmpfile = '/tmp/' + uuid + '.rdf';

    /*
     * want to use logger to print the errors to syslog
     * also need to check that the error messages make it to the response
     */
    function send_response( err) {
        if ( err ) return server_error("failed to clean up the tmp file");
        multistatus( request, null );
    }
    function clean_tmp_file( failed) {
        if ( failed ) return server_error("tranformations failed");

        FS.unlink(tmpfile, send_response.bind(response));
    }
    /*
     * Run the meta-xslt (in /usr/share/...) on the request body to
     * generate an XSLT to use on the actual resource.
     *
     * The second command is the transform of the actual data based on the meta-transform
     * created from the original WebDAV/XML request.
     */
    function start_pipeline(){
        var commands = [
            ['xsltproc', [meta_xslt, '-'] ],
            ['xsltproc', ['-', tmpfile] ]
        ];
        logger.log(tmpfile);
        var transform = create_pipeline( commands, response );
        transform.on( 'finish', clean_tmp_file);

        request.pipe( transform );
    }

    var script = '';
    if ( !headers['depth'] ){
        headers['depth'] = 'infinity'
    }

    if (headers['depth'] === 'infinity' ) {
        return forbidden('propfind-finite-depth')
    } else if ( headers['depth'] === '1' ){
        script = 'get-route-content-with-children'
    } else if ( headers['depth'] === '0' ){
        script = 'get-route-content'
    } else{
        return forbidden('no valid depth header')
    }

    var args = [route];
    var pid = spawn(script, args);
    var ws = FS.createWriteStream(tmpfile);

    pid.stdout.pipe(ws);
    pid.stderr.on('data', server_error);
    pid.on('close', start_pipeline);
};

// vim:autoindent expandtab sw=4 syntax=javascript

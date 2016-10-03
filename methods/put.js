
/** @file put.js
 * \brief PUT method handler
 */

var URL  = require('url');
var FS   = require('fs');
var spawn  = require('child_process').spawn;
var uuidgen = require('../lib/uuid').v4;

/** This function is called bound to the server object.
 * To get at the vicarious object, use this.vicarious.
 */
module.exports = function ( request, response ) {
    var BASE = this.BASE;
    var SHARE = this.SHARE;
    var XSLT = this.XSLT;

    var vicarious = this.vicarious;

    var url = URL.parse( request.url );
    var collection = url.pathname.split('/')[1];
    var schema = SHARE + '/' + collection + "/validate.rng";
    var intern = SHARE + '/' + collection + "/intern.xslt";
    var adder = XSLT + '/add-prop.xslt';
    var store = BASE+'/'+collection+'/';

    var uuid = uuidgen();
    var temp_filename = '/var/tmp/' + uuid + '.rdf';

    this.logger.log( "PUT request to: " + collection );

    var output = "";
    function gather_output( data ) { output += data;}

    var error = "";
    function gather_error( data ) { error += data; }
    
    var links_list = [];
    function find_link_fields(element){
        return (element.indexOf(';') > -1);
    }

    function report_error( error ) {
        response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'} );
        response.write("Error during a write file function)");
        response.end();
    }

    function make_links( code, signal ) {
        if ( code !== 0 ) {
            response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'} );
            response.write( "Couldn't make a symlink");
            response.end(error);
            return;     
        }
        var link;
        if (links_list.length === 0) {
            response.writeHead(201, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
            response.write("Successfully put RDF and made links\n");
            response.write(uuid + "\n");
            response.end();
        } else {
            link = links_list[0].trim();
            links_list.splice(0, 1);
            var args = ['-s', store + uuid + '.rdf', store + link];
            var pid = spawn('ln', args);

            output = '';
            pid.stdout.on('data', gather_output);
            error = '';
            pid.stderr.on('data', gather_error);
            pid.on('close', make_links);
        }
    }

    function make_links_list( code, signal ) {
        if ( code !== 0 ) {
            response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'} );
            response.write( "Could not write out rdf file to db");
            response.end(error);
            return;
        }
        var links = output.split('\n');
        links_list = links.filter( find_link_fields );
        links_list[links_list.length] = uuid+';uuid';
        output = '';
        error = '';
        if ( links_list.length < 1 ) {
            make_links(1, "not enough links");
        } else {
            make_links(0, "success");
        }
    }

    function get_links() {
        var args = [SHARE + '/' + collection + '/links.xslt', temp_filename];
        var pid = spawn('xsltproc', args);
        
        output = '';
        pid.stdout.on('data', gather_output);
        error = '';
        pid.stderr.on('data', gather_error);
        pid.on('close', make_links_list);
    }

    function report_writestream_error(error) {
        response.writeHead( 500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'} );
        response.write( "writestream error: " + error );
        response.end();
    }

    function add_create_date( code, signal){
        if ( code !== 0 ) {
            response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'} );
            response.write( "could not intern rdf\n");
            response.end(error);
            return;
        }
        var d = new Date();
        var xslt = output;
        var args = [
            '--stringparam', 'prop', 'D:creationdate',
            '--stringparam', 'value', d.toISOString(),
            adder,  '-'
        ];
        var pid = spawn('xsltproc', args);

        output = '';
        pid.stdout.on('data', gather_output);
        error = '';
        pid.stderr.on('data', gather_error);
        pid.stdin.write(xslt);
        pid.stdin.end();
        pid.on('close', create_resource)
    }

    function create_resource(code, signal){
        if ( code !== 0 ) {
            response.writeHead( 500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'} );
            response.write( "Could add create time\n" );
            response.end( error );
            return;
        }
        var file = store+uuid+'.rdf';
        var ws = FS.createWriteStream(file);
        ws.write(output);
        ws.end();
        ws.on('error', report_writestream_error);
        ws.on('finish', get_links);
    }

    function intern_file( code, signal ) {
        if ( code !== 0 ) { // validation failed
            response.writeHead( 403, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'} );
            response.write( "VALIDATION FAILED\n" );
            response.end( error );
            return;
        }

        var args = [
            '--stringparam', 'uuid', uuid,
            '--stringparam', 'hostname', vicarious.hostname + ':' + vicarious.port,
            intern, temp_filename
        ];
        var pid = spawn( 'xsltproc', args );

        output = '';
        pid.stdout.on( 'data', gather_output );
        error = '';
        pid.stderr.on( 'data', gather_error );
        pid.on('close', add_create_date);
    }

    function validate() {
        var args = [ '--noout', '--relaxng', schema, temp_filename ];
        var pid = spawn( 'xmllint', args );

        output = '';
        pid.stdout.on( 'data', gather_output );
        error = '';
        pid.stderr.on( 'data', gather_error );
        pid.on('close', intern_file );
    }

    var stream = FS.createWriteStream(temp_filename);
    stream.on( 'close', validate );
    // ?? stream.on('error', report_error);

    request.pipe( stream );
    request.on('error', report_error);
    // if the request gets an error - do we have to kill the stream
};

/* vim: set autoindent expandtab sw=4 syntax=javascript: */

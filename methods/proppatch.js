
/** @file proppatch.js
 * \brief WebDAV PROPPATCH method handler
 *
 * Used to modify the properties of a resource.
 */

var URL  = require('url');
var spawn  = require('child_process').spawn;
var FS   = require('fs');
var uuidgen = require('uuid').v4;

module.exports = function ( request, response ) {
    var BASE = this.BASE;
    var XSLT = this.XSLT;
    var TOP_SHARE = this.TOP_SHARE;

    var logger = this.logger;
    var responder = this.vicarious.responder;
    var server_error = responder.server_error.bind(response);
    var stream_multistatus = responder.stream_multistatus.bind(response);

    var url = URL.parse( request.url );
    var rdf = BASE + url.pathname;

    var meta_xslt = XSLT + "/proppatch.xslt";
    var interner = XSLT + "/intern-response.xslt";
    var setter = XSLT + "/set-property.xslt";
    var setter_xml = XSLT + "/set-property-xml.xslt";
    logger.log( "Using xslt " + meta_xslt );

    var base_xml = TOP_SHARE+"/rdf/empty-proppatch-response.xml";

    var tmp_response_file= '';
    var tmp_rdf_file = '';

    var output = "";
    function gather_output( data ) { output += data; }
    function log_err_data( data ) {logger.error(data+"")}

    var prop_list = [];

    var current_prop = null;

    function write_file(filename, data, callback, args) {
        var ws = FS.createWriteStream(filename);

        ws.on('error', logger.error);
        ws.on('finish', function () { callback.apply(null, args); } );
        ws.write(data);
        ws.end();
    }

    function respond(code, signal) {
        if ( code !== 0 ) {
            return server_error("could not save final rdf file");
        }

        var rs = FS.createReadStream(tmp_response_file);
        stream_multistatus( request, rs );
        rs.on('error', logger.error);
    }

    function save_rdf_and_respond() {
        var args = [tmp_rdf_file, rdf];
        var pid = spawn('mv', args);
        pid.stderr.on('data', log_err_data);
        pid.on('close', respond);
    }

    function update_response(status) {
        var args = [
            '--stringparam', 'prop',     current_prop[0],
            '--stringparam', 'response', "HTTP/1.1 "+status,
            interner, tmp_response_file
        ];
        var pid = spawn('xsltproc', args);

        output = '';
        pid.stdout.on('data', gather_output);
        pid.stderr.on('data', log_err_data);
        pid.on('close', function () { write_file(tmp_response_file, output, set_prop, [0, 'from update']) } );
    }

    function validate_rdf(code, signal) {
        if ( code !== 0 ) {
            update_response('424 Failed Dependency');
        }

        //TODO:call out to something to validate the current rdf. If it fails we add a 409 Conflict
        var valid = true;
        if ( valid ) {
            update_response("200 OK");
        } else {
            update_response("409 Conflict");
        }
    }

    function set_prop(code, signal) {
        if ( code !== 0 ) return server_error("could not write to tmp rdf file");
        if ( prop_list.length === 0 ) {
            save_rdf_and_respond();
        } else {
            current_prop = prop_list[0].trim().split(';');
            prop_list.splice(0,1);

            var args = [
                '--stringparam', 'property', current_prop[0],
                '--stringparam', 'value',    current_prop[1],
                setter, tmp_rdf_file
            ];
            var pid = spawn('xsltproc', args);

            output = '';
            pid.stdout.on('data', gather_output);
            pid.stderr.on('data', log_err_data);
            pid.on('close', function () { write_file(tmp_rdf_file, output, validate_rdf, [0, 'none']); } );
        }

    }

    function make_tmp_rdf_file(code, signal) {
        if ( code !== 0 ) return server_error("Failed to update href in temp response file");

        tmp_rdf_file = '/var/tmp/' + uuidgen() + '.rdf';
        var args = [rdf, tmp_rdf_file];
        pid = spawn('cp', args);

        pid.stderr.on('data', log_err_data);
        pid.on('close', set_prop);
    }

    function make_tmp_response_file() {
        var uuid = uuidgen();
        tmp_response_file = '/var/tmp/'+uuid+'.xml';

        var args = [
            '--stringparam', 'property', 'D:href',
            '--stringparam', 'value',    url.pathname.toString(),
            setter_xml, base_xml
        ];
        var temp_response_stream = FS.createWriteStream( tmp_response_file );
        var pid = spawn( 'xsltproc', args );
        temp_response_stream.on('error', logger.error);
        pid.stdout.pipe(temp_response_stream);
        pid.stderr.on('data',  log_err_data);
        pid.on('close', make_tmp_rdf_file);
    }

    function make_prop_list (code, signal) {
        if ( code !== 0 ) return server_error("could not get get the property list");

        function find_prop_fields(element) {
            return (element.indexOf(';') > -1);
        }

        prop_list = output.split('\n').filter(find_prop_fields);
        make_tmp_response_file();
    }

    // Stream the request body in to xsltproc to get the list of properties
    var args = [meta_xslt, '-'];
    var pid = spawn('xsltproc', args);

    output = '';
    pid.stdout.on('data', gather_output);
    pid.stderr.on('data', log_err_data);
    pid.on('close', make_prop_list);

    function pipe_to_meta(data) {
        pid.stdin.write(data);
    }

    function end_meta() {
        pid.stdin.end();
    }

    request.on( 'data', pipe_to_meta );
    request.on( 'end', end_meta );
};

/* vim: set autoindent expandtab sw=4 syntax=javascript: */

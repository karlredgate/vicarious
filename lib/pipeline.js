/** Pipeline module
 * Run the set of commands and send the output and errors to the
 * event callbacks.
 *
 * Passed an array of spawn args:
 * [
 *    [ command-1, [arg1,...argn]],
 *    ...
 *    [ command-n, [arg1,...argn]]
 * ]
 *
 * Usage:
 *
 * This is a simple example with details omitted, just to give an
 * idea of its use.
 *
 * function save_data( chunk ) { output.push( chunk ); }
 * function save_errors( chunk ) { errors.push( chunk ); }
 * function send_response( failed ) {
 *     if ( failed ) {
 *         response.ok( output );
 *     } else {
 *         response.server_error( output );
 *     }
 * }
 * var create_pipeline = require('pipeline').create_pipeline;
 * var commands = [
 *     [ 'cat', ['/var/db/papasan/customer/foo.rdf'] ],
 *     [ 'xsltproc', ['/usr/share/papasan/xslt/example.xslt', '-'] ]
 * ];
 * var foo = create_pipeline( commands );
 * foo.on('data', save_data );
 * foo.on('error-data', save_errors );
 * foo.on('finish', send_response );
 */

module.exports = Pipeline;

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Stream = require('stream').Stream;
var Writable = Stream.Writable;
var spawn  = require('child_process').spawn;

util.inherits( Pipeline, Writable );

function throw_error_unless_valid( commands ) {
    var type_error = new TypeError( 'commands arg must be an array of command specs' );
    if ( typeof commands !== 'object' ) throw type_error;
    if ( commands.constructor !== Array ) throw type_error;
}

/**
 * Create a pipeline of the command array provided.
 * The result_callback is passed the output array, error array, and pass/fail?
 *
 * The initial consumer is a Writable stream that looks like stdin of a process.
 */
function Pipeline(commands) {
    var options = {}; // options = options || {};
    Writable.call( this, options );

    throw_error_unless_valid( commands );

    this.commands = commands;

    /*
     * All processes in the pipeline are tracked in an array of children.
     * The children array object has methods added for checking process
     * status.
     */
    this.children = [];

    this.children.any_still_running = function () {
        function is_running(result, child) {
            return result || (child.running === true);
        }
        return this.reduce( is_running, false );
    };

    this.children.any_failed = function () {
        function is_running(result, child) {
            return result || (child.code !== 0);
        }
        return this.reduce( is_running, false );
    }
}

Pipeline.prototype._write = function (chunk, encoding, callback) {
    this.stdin.write( chunk, encoding, callback );
};

Pipeline.prototype.end = function (chunk, encoding, callback) {
    this.stdin.end( chunk, encoding, callback );
};

Pipeline.prototype.spawn = function () {
    var pipeline = this;
    var children = this.children;
    var output_completed = false;

    /*
     * read each of the children to see if it has completed and
     * respond if they have all exited successfully
     */
    function check_status_of_children() {
        if ( children.any_still_running() )  return;
        // Need to also check if output is complete and then add
        // a timer to wait for it if it does not happen
        pipeline.emit( 'finish', children.any_failed() );
    }

    var merge = new EventEmitter();
    merge.on( 'child-death', check_status_of_children );

    function check_child( code, signal ) {
        this.code = code;
        this.signal = signal;
        this.running = false;
        /* merge is bound from the env of the closure */
        merge.emit( 'child-death' );
    }

    var error = new Writable();
    error._write = function ( chunk, encoding, callback ) {
        pipeline.emit( 'error-data', chunk, encoding );
        callback( null );
    };

    /*
     * The starting point of the pipeline acts like the stdin of a process.
     * The stdin member of a process is a "Writable stream" object.
     * The callback is ---
     */
    var next = new Writable();
    next._write = function ( chunk, encoding, callback ) {
        pipeline.emit( 'data', chunk, encoding );
        callback( null );
    };

    function trigger_output_completed() {
        output_completed = true;
    }
    next.on( 'finish', trigger_output_completed );

    /*
     * At each point in the pipeline we need
     * - the stream to write to
     */
    function start_process( entry ) {
        var command = entry[0];
        var args    = entry[1];

        var child = spawn( command, args );
        child.running = true;

        child.stdout.pipe( next );
        child.stderr.pipe( error );
        child.on( 'exit', check_child.bind(child) );

        children.push( child );

        /*
         * at each point in the pipeline set the next writer to be the
         * stdin of the next process in the pipeline
         */
        next = child.stdin;
    }

    /*
     * The pipeline is constructed in reverse.  The last entry is the first
     * process created.  The command list is sent to us in the order that it
     * is expected to run, so we reverse the list of commands to create the
     * pipeline processes in the correct order.
     */
    this.commands.reverse().map( start_process );
    this.stdin = next;
};

module.exports.create_pipeline = function (commands, response) {
    var obj = new Pipeline( commands );
    obj.spawn();

    if ( response !== undefined ) {
        var gather = response.server.papasan.gather;
        obj.on( 'data',       gather.output.bind(response) );
        obj.on( 'error-data', gather.error.bind(response) );
    }

    return obj;
};

/* vim: set autoindent expandtab sw=4 syntax=javascript: */

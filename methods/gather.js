
/** @file gather.js
 * \brief Utility functions to gather stdout and stderr
 */

var HTTP = require('http');
var FS   = require('fs');

module.exports = {};

/** @brief Prepare a response object for vicarious use
 * Bound to response object.
 */
module.exports.prepare = function () {
    this.output_chunks = [];
    this.error_chunks = [];
};

/**
 * this must be bound to a response object.
 *
 * Usage in a spawn:
 *
 * response.output = [];
 * response.error = [];
 * var pid = spawn( ... );
 * pid.stdout.on( 'data', this.vicarious.gather.output.bind(response) );
 * pid.stderr.on( 'data', this.vicarious.gather.error.bind(response) );
 */
module.exports.output = function (data) {
    this.output_chunks.push( data );
};

/**
 * this must be bound to a response object.
 */
module.exports.error = function (data) {
    this.error_chunks.push( data );
};

// vim:autoindent expandtab sw=4 syntax=javascript

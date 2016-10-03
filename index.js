
module.exports = require( './vicarious' );
module.exports.prototype.methods.HEAD = require( './methods/head' );
module.exports.prototype.methods.GET = require( './methods/get' );
module.exports.prototype.methods.PUT = require( './methods/put' );
module.exports.prototype.methods.POST = require( './methods/post' );
module.exports.prototype.methods.PROPFIND = require( './methods/propfind' );
module.exports.prototype.methods.PROPPATCH = require( './methods/proppatch' );
module.exports.prototype.methods.OPTIONS = require( './methods/options' );
module.exports.prototype.methods.DELETE = require( './methods/delete' );

// vim:autoindent expandtab sw=4 syntax=javascript

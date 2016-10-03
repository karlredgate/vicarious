
module.exports = require( './lib/vicarious' );
module.exports.prototype.methods.HEAD = require( './lib/head' );
module.exports.prototype.methods.GET = require( './lib/get' );
module.exports.prototype.methods.PUT = require( './lib/put' );
module.exports.prototype.methods.POST = require( './lib/post' );
module.exports.prototype.methods.PROPFIND = require( './lib/propfind' );
module.exports.prototype.methods.PROPPATCH = require( './lib/proppatch' );
module.exports.prototype.methods.OPTIONS = require( './lib/options' );
module.exports.prototype.methods.DELETE = require( './lib/delete' );

// vim:autoindent expandtab sw=4 syntax=javascript

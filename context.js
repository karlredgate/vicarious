
/** @file context.js
 * \brief Shared info between request and response.
 *
 */

/** Context base object.
 * 
 */

function Context( request, response ) {
    this.request  = request;
    this.response = response;
}

/**
 */
Context.prototype.clear = function () {
};

module.exports = Context;

// vim:autoindent expandtab sw=4 syntax=javascript

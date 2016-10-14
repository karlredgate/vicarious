
/** @file policy.js
 * \brief 
 *
 * hooks = policy[hostname];
 * stage['request']
 */

var HTTP = require('http');
var FS   = require('fs');
var spawn  = require('child_process').spawn;

/** Policy
 * 
 */

function Policy( ) {
    Policy.init.call(this);
}

Policy.Policy = Policy;

Policy.init = function () {
}

Policy.prototype.run = function (context) {
    console.log( "Policy for " + context.request );
}

module.exports = Policy;

// vim:autoindent expandtab sw=4 syntax=javascript

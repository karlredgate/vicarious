
function asm_util( global, foreign, heap ) {
    //noinspection BadExpressionStatementJS
    "use asm";

    var seed = foreign.seed | 0;

    function _random() {
        var result = (seed * 31010991) | 0;
        result = (result + 1735287159) | 0;
        result = (result & 2147483647) | 0;
        seed = result;
        return result;
    }

    function _create_v4_uuid() {
        var buffer = new ArrayBuffer(16);
        var a = new Int32Array(buffer);

        a[0] = _random() | 0;
        a[1] = _random() | 0;
        a[2] = _random() | 0;
        a[3] = _random() | 0;

        buffer[6] = (buffer[6] & 0x0F) | 0x40;
        buffer[8] = (buffer[8] & 0x3F) | 0x80;

        return buffer;
    }

    var hex = [
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'
    ];
    function _uuid_v4() {
        var uuid = _create_v4_uuid();
        var s = new Array(36);
        s[ 0] = hex[ (uuid[0] & 0xF0) >> 4 ];
        s[ 1] = hex[ (uuid[0] & 0x0F) ];
        s[ 2] = hex[ (uuid[1] & 0xF0) >> 4 ];
        s[ 3] = hex[ (uuid[1] & 0x0F) ];
        s[ 4] = hex[ (uuid[2] & 0xF0) >> 4 ];
        s[ 5] = hex[ (uuid[2] & 0x0F) ];
        s[ 6] = hex[ (uuid[3] & 0xF0) >> 4 ];
        s[ 7] = hex[ (uuid[3] & 0x0F) ];
        s[ 8] = '-';
        s[ 9] = hex[ (uuid[4] & 0xF0) >> 4 ];
        s[10] = hex[ (uuid[4] & 0x0F) ];
        s[11] = hex[ (uuid[5] & 0xF0) >> 4 ];
        s[12] = hex[ (uuid[5] & 0x0F) ];
        s[13] = '-';
        s[14] = hex[ (uuid[6] & 0xF0) >> 4 ];
        s[15] = hex[ (uuid[6] & 0x0F) ];
        s[16] = hex[ (uuid[7] & 0xF0) >> 4 ];
        s[17] = hex[ (uuid[7] & 0x0F) ];
        s[18] = '-';
        s[19] = hex[ (uuid[8] & 0xF0) >> 4 ];
        s[20] = hex[ (uuid[8] & 0x0F) ];
        s[21] = hex[ (uuid[9] & 0xF0) >> 4 ];
        s[22] = hex[ (uuid[9] & 0x0F) ];
        s[23] = '-';
        s[24] = hex[ (uuid[10] & 0xF0) >> 4 ];
        s[25] = hex[ (uuid[10] & 0x0F) ];
        s[26] = hex[ (uuid[11] & 0xF0) >> 4 ];
        s[27] = hex[ (uuid[11] & 0x0F) ];
        s[28] = hex[ (uuid[12] & 0xF0) >> 4 ];
        s[29] = hex[ (uuid[12] & 0x0F) ];
        s[30] = hex[ (uuid[13] & 0xF0) >> 4 ];
        s[31] = hex[ (uuid[13] & 0x0F) ];
        s[32] = hex[ (uuid[14] & 0xF0) >> 4 ];
        s[33] = hex[ (uuid[14] & 0x0F) ];
        s[34] = hex[ (uuid[15] & 0xF0) >> 4 ];
        s[35] = hex[ (uuid[15] & 0x0F) ];

        return s.join('');
    }

    return {
        random: _random,
        uuid_v4: _uuid_v4
    };
}

var now = new Date();

var seed = ((now.getMilliseconds()|0) << 24) +
           ((now.getSeconds()     |0) << 16) +
           process.pid | 0;

var foreign = {
    seed: (seed | 0)
};

var heap = new ArrayBuffer( 1024*1024 );
var mod = asm_util( global, foreign, heap );

// Monkey patch the base Object prototype
Object.prototype.uuidgen = mod.uuid_v4;

module.exports = {};
module.exports.v4 = mod.uuid_v4;

/* vim: set autoindent expandtab sw=4 syntax=javascript: */

var bl = require('bl');
var assert = require('assert');
var fs = require('fs');

fs.createReadStream(__filename).pipe(bl(function(err, buf) {
  if (err) throw err;

  assert.ok(buf.toString().match(/\/\/ Foobar!/)); // Foobar!
}));

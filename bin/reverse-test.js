#!/usr/bin/env node
'use strict';

var argv = require('yargs')
  .option('c', {
    alias: 'count',
    default: 5,
    describe: 'Number of dependents to test',
    type: 'number'
  })
  .argv;

var fs = require('fs');
var reverseTest = require('..');

var packageJSON = JSON.parse(fs.readFileSync('package.json', {
  encoding: 'utf8'
}));

reverseTest({
  name: packageJSON.name,
  installspec: process.cwd(),
  count: argv.count
}, function(err, results) {
  if (err) throw err;

  process.exitCode = 0;
  results.forEach(function(r) {
    console.log(r.name +' -- ' + r.status);
  });

  console.log();

  results.forEach(function(r) {
    if (r.err) {
      console.log('Test for', r.name, 'failed:');
      console.log(r.err);
      process.exitCode = 1;
    }
  });
});

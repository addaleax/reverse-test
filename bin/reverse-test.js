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
var rimraf = require('rimraf');
var reverseTest = require('..');

var packageJSON = JSON.parse(fs.readFileSync('package.json', {
  encoding: 'utf8'
}));

var basedir = reverseTest.defaultBasedir;
reverseTest({
  name: packageJSON.name,
  installspec: process.cwd(),
  count: argv.count,
  basedir: basedir
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
      console.log(r.err.message);
      process.exitCode = 1;
    }
  });

  if (process.exitCode === 0) {
    rimraf.sync(basedir);
  }
});

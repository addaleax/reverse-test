'use strict';

var getTopDependents = require('npm-get-top-dependents');

var https = require('https');
var child_process = require('child_process');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var extend = require('extend');
var bl = require('bl');
var path = require('path');
var async = require('async');

function getPackageInfoDefault(name, callback) {
  var req = https.request('https://skimdb.npmjs.com/registry/' + name,
    function(res) {
      res.pipe(bl(function(err, data) {
        callback(err, !err ? JSON.parse(data) : null);
      }));
    });
  req.on('error', callback);
  req.end();
}

function checkPackageInfo(name, opts, callback) {
  var getPackageInfo = opts.getPackageInfo || getPackageInfoDefault;

  getPackageInfo(name, function(err, result) {
    if (!result.repository || result.repository.type !== 'git') {
      var err = new Error('No git repository available');
      err.fatal = false;
      return callback(err, null);
    }

    var latestVersion = result['dist-tags'] && result['dist-tags'].latest;
    if (!latestVersion) {
      var err = new Error('No latest version dist-tag present');
      err.fatal = false;
      return callback(err, null);
    }

    var info = result.versions[latestVersion];
    if (!info) {
      return callback(new Error('Version from latest dist-tag not found'), null);
    }

    if (!info.scripts ||
        !info.scripts.test ||
        /no test specified/.test(info.scripts.test)) {
      var err = new Error('No test script in latest version');
      err.fatal = false;
      return callback(err, null);
    }

    callback(null, {
      info: result,
      repository: result.repository.url
    });
  })
}

function runTests(cwd, name, spawn, opts, callback) {
  spawn('npm', ['install'], { cwd: cwd, stdio: 'inherit' })
    .on('exit', function(code, signal) {
    if (code !== 0)
      return callback(new Error('npm install for ' + name + ' failed'));

    async.eachSeries(opts.reversedPackages, function(p, cb) {
      spawn('npm', ['rm', p.name], { cwd: cwd, stdio: 'inherit' })
        .on('exit', function(code, signal) {
        if (code !== 0)
          return cb(new Error('npm rm ' + p.name + ' for ' + name + ' failed'));

        cb(null);
      });
    }, function(err) {
      if (err) return callback(err);

      async.eachSeries(opts.reversedPackages, function(p, cb) {
        spawn('npm', ['install', p.installspec], { cwd: cwd, stdio: 'inherit' })
          .on('exit', function(code, signal) {
          if (code !== 0)
            return cb(new Error('npm install ' + p.installspec +
                                ' for ' + name + ' failed'));

          cb(null);
        });
      }, function(err) {
        if (err) return callback(err);

        spawn('npm', ['test'], { cwd: cwd, stdio: 'inherit' })
          .on('exit', function(code, signal) {
            if (code !== 0)
              return callback(new Error('npm test for ' + name + ' failed'));

            callback();
          });
      });
    });
  });
}

function reverseTestSinglePackage(name, opts, callback) {
  opts = opts || {};

  checkPackageInfo(name, opts, function(err, result) {
    if (err) {
      if (err.fatal !== false)
        return callback(err);

      return callback(null, {
        name: name,
        status: 'skipped',
        err: err
      });
    }

    var spawn = opts.spawn || child_process.spawn;
    var basedir = opts.basedir || module.exports.defaultBasedir;
    var cwd = path.join(basedir, name)
    rimraf(cwd, function(err) {
      if (err) return callback(err);

      mkdirp(basedir, function(err) {
        if (err) return callback(err);

        var repo = result.repository.replace(/^git\+/, '');
        spawn('git', ['clone', repo, cwd], {
          stdio: 'inherit',
          env: extend({}, process.env, { GIT_TERMINAL_PROMPT: 0 })
        })
          .on('exit', function(code, signal) {
            if (code !== 0) {
              var err = new Error('error cloning ' + result.repository);
              err.fatal = false;
              return callback(null, {
                name: name,
                status: 'skipped',
                err: err
              });
            }

            runTests(cwd, name, spawn, opts, function(err) {
              if (err) {
                callback(null, {
                  name: name,
                  status: 'failure',
                  err: err
                });
              } else {
                callback(null, {
                  name: name,
                  status: 'success',
                  err: null
                });
              }
            });
          });
      });
    });
  });
}

function fullReverseTest(opts, callback) {
  getTopDependents(extend({ package: opts.name }, opts), function(err, result) {
    if (err) return callback(err);

    async.mapSeries(result, function(p, cb) {
      reverseTestSinglePackage(p.package, extend({
        reversedPackages: [
          { name: opts.name, installspec: opts.installspec }
        ]
      }, opts), cb);
    }, callback);
  });
}

module.exports = fullReverseTest;
module.exports.singlePackage = reverseTestSinglePackage;
module.exports.defaultBasedir = 'reverse_test_modules';

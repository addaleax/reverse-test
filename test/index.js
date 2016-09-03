'use strict';

var reverseTest = require('../');
var mr = require('modern-npm-registry-mock');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var extend = require('extend');
var url = require('url');
var path = require('path');
var cp = require('child_process');
var fs = require('fs');
var assert = require('assert');

var rFixture = path.resolve(__dirname, 'fixtures', 'pseudo-request');

describe('reverse-test', function() {
  var mrServer = null;
  var origRegistry = process.env.npm_config_registry || '';

  before('set up git repository in fixture dir', function(done) {
    cp.spawn('git', ['init'], {
      stdio: 'inherit',
      cwd: rFixture
    }).on('exit', function(code) {
      assert.strictEqual(code, 0);

      cp.spawn('git', ['add', '.'], {
        stdio: 'inherit',
        cwd: rFixture
      }).on('exit', function(code) {
        assert.strictEqual(code, 0);

        cp.spawn('git', ['commit', '-m', 'Initial commit'], {
          stdio: 'inherit',
          cwd: rFixture
        }).on('exit', function(code) {
          assert.strictEqual(code, 0);
          done();
        });
      });
    });
  });

  after('tear down git repository in fixture dir', function(done) {
    rimraf(path.resolve(rFixture, '.git'), done);
  });

  before('set up mock registry', function(done) {
    mr({ port: 0 }, function (err, srv) {
      if (err) return done(err);

      mrServer = srv;
      var addr = mrServer.address();

      process.env.npm_config_registry = url.format({
        protocol: 'http:',
        hostname: addr.address,
        port: addr.port
      });

      done();
    })
  });

  after('tear down mock registry', function() {
    mrServer.close();
    process.env.npm_config_registry = origRegistry;
  });

  it('can test a module with a specified version of a dependency', function(done) {
    this.timeout(60000);

    reverseTest.singlePackage('request', {
      reversedPackages: [
        { name: 'bl', installspec: 'bl@1.0.0' }
      ],
      getPackageInfo: function(name, callback) {
        var pj = fs.readFileSync(path.resolve(rFixture, 'package.json'));
        var json = JSON.parse(pj);
        json.repository.url = 'file://' + rFixture.replace(/\\/g, '/');
        callback(null, json);
      }
    }, function(err, result) {
      if (err) return done(err);
      assert.strictEqual(result.status, 'success');
      done();
    });
  });
});

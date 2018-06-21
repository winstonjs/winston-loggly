/*
 * loggly-test.js: Tests for instances of the Loggly transport
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENSE
 *
 */

var vows = require('vows'),
    assert = require('assert'),
    helpers = require('./helpers.js'),
    Loggly = require('../lib/winston-loggly').Loggly;

var tokenTransport,
    config;

try {
  config = require('./config');
}
catch (ex) {
  console.error('Error reading test/config.json.')
  console.error('Are you sure it exists?\n');
  console.dir(ex);
  process.exit(1);
}

tokenTransport = new (Loggly)({
  subdomain: config.transports.loggly.subdomain,
  token: config.transports.loggly.token
});

tokenTransport.log('warning', 'test message', {}, (_err, _res) => {
})

function assertLoggly(transport) {
  assert.instanceOf(transport, Loggly);
  assert.isFunction(transport.log);
}

vows.describe('winston-loggly').addBatch({
  "An instance of the Loggly Transport": {
    "when passed an input token": {
      "should have the proper methods defined": function () {
        assertLoggly(tokenTransport);
      },
      "the log() method": helpers.testLevels(tokenTransport, "should log messages to loggly", function (ign, err, logged) {
        assert.isNull(err);
        assert.isTrue(logged);
      })
    }
  }
}).export(module);

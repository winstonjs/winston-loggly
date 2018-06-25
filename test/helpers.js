const winston = require('winston');
module.exports.testLevels = function (transport, assertMsg, assertFn) {
  var tests = {};
  const levels = winston.config.npm.levels;

  Object.keys(levels).forEach(function (level) {
    var test = {
      topic: function () {
        transport.log(level, 'test message', {}, this.callback.bind(this, null));
      }
    };

    test[assertMsg] = assertFn;
    tests['with the ' + level + ' level'] = test;
  });

  var metadatatest = {
    topic: function () {
      transport.log('info', 'test message', { metadata: true }, this.callback.bind(this, null));
    }
  };

  metadatatest[assertMsg] = assertFn;
  tests['when passed metadata'] = metadatatest;

  var primmetadatatest = {
    topic: function () {
      transport.log('info', 'test message', 'metadata', this.callback.bind(this, null));
    }
  };

  primmetadatatest[assertMsg] = assertFn;
  tests['when passed primitive metadata'] = primmetadatatest;

  var nummetadatatest = {
    topic: function () {
      transport.log('info', 'test message', 123456789, this.callback.bind(this, null));
    }
  };

  nummetadatatest[assertMsg] = assertFn;
  tests['when passed numeric metadata'] = nummetadatatest;

// circular references aren't supportded by regular JSON, and it's not supported
// by node-loggly-bulk. I'm omitting it for now. If it wants to be fixed, then
// node-loggly-bulk needs an update.
/*
  var circmetadata = { };
  circmetadata['metadata'] = circmetadata;

  var circmetadatatest = {
    topic: function () {
      transport.log('info', 'circular message', circmetadata, this.callback.bind(this, null));
    }
  };

  circmetadatatest[assertMsg] = assertFn;
  tests['when passed circular metadata'] = circmetadatatest;

  var circerror = new Error("message!");
  var foo = {};
  var circerrordatatest;

  foo.bar = foo;
  circerror.foo = foo;
  circerror.stack = 'Some stacktrace';

  circerrordatatest = {
    topic: function () {
      transport.log('info', 'circular error', circerror, this.callback.bind(this, null));
    }
  };

  circerrordatatest[assertMsg] = assertFn;
  tests['when passed circular error as metadata'] = circerrordatatest;
*/

  return tests;
};

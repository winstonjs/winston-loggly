/*
 * loggly.js: Transport for logginh to remote Loggly API
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 *
 */

var events = require('events'),
    loggly = require('loggly'),
    util = require('util'),
    winston = require('winston'),
    Stream = require('stream').Stream;

//
// ### function Loggly (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Loggly transport object responsible
// for persisting log messages and metadata to Loggly; 'LaaS'.
//
var Loggly = exports.Loggly = function (options) {
  winston.Transport.call(this, options);

  function valid() {
    return options.inputToken
      || options.inputName && options.auth
      || options.inputName && options.inputs && options.inputs[options.inputName]
      || options.id && options.inputs && options.inputs[options.id];
  }

  if (!options.subdomain) {
    throw new Error('Loggly Subdomain is required');
  }

  if (!valid()) {
    throw new Error('Target input token or name is required.');
  }

  this.name = 'loggly';
  this.logBuffer = [];

  this.client = loggly.createClient({
    subdomain: options.subdomain,
    auth: options.auth || null,
    json: options.json || false
  });

  if (options.inputToken) {
    this.inputToken = options.inputToken;
    this.ready = true;
  }
  else if (options.inputs && (options.inputs[options.inputName]
    || options.inputs[options.id])) {
    this.inputToken = options.inputs[options.inputName] || options.inputs[options.id];
    this.ready = true;
  }
  else if (options.inputName) {
    this.ready = false;
    this.inputName = options.inputName;

    var self = this;
    this.client.getInput(this.inputName, function (err, input) {
      if (err) {
        throw err;
      }

      self.inputToken = input.input_token;
      self.ready = true;
      self.emit('ready');
    });
  }
};

//
// Inherit from `winston.Transport`.
//
util.inherits(Loggly, winston.Transport);

//
// Define a getter so that `winston.transports.Loggly`
// is available and thus backwards compatible.
//
winston.transports.Loggly = Loggly;

//
// Expose the name of this Transport on the prototype
//
Loggly.prototype.name = 'loggly';

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
Loggly.prototype.log = function (level, msg, meta, callback) {
  if (this.silent) {
    return callback(null, true);
  }

  var self = this,
      message = winston.clone(meta || {});

  message.level = level;
  message.message = msg;

  if (!this.ready) {
    //
    // If we haven't gotten the input token yet
    // add this message to the log buffer.
    //
    this.logBuffer.push({
      message: message,
      callback: callback
    });
  }
  else if (this.ready && this.logBuffer.length > 0) {
    //
    // Otherwise if we have buffered messages
    // add this message to the buffer and flush them.
    //
    this.logBuffer.push({
      message: message,
      callback: callback
    });

    this.flush();
  }
  else {
    //
    // Otherwise just log the message as normal
    //
    this.client.log(this.inputToken, message, function () {
      self.emit('logged');
      callback(null, true);
    });
  }
};

//
// ### function flush ()
// Flushes any buffered messages to the current `stream`
// used by this instance.
//
Loggly.prototype.flush = function () {
  var self = this, i;

  function logMsg (details) {
    self.client.log(self.inputToken, details.message, function (err) {
      if (err) {
        self.emit('error', err);
      }

      if (details.callback) {
        details.callback(null, true);
      }

      self.emit('logged');
    });
  }

  //
  // Initiate calls to loggly for each message in the buffer
  //
  for (i = 0; i < this.logBuffer.length; i++) {
    logMsg(this.logBuffer[i]);
  }

  //
  // Then quickly truncate the list
  //
  this.logBuffer.length = 0;
};

//
// ### function stream (options)
// #### @options {Object} Set stream options
// Returns a log stream.
//
Loggly.prototype.stream = function(options) {
  var self = this,
      options = options || {},
      stream = new Stream,
      last,
      start = options.start,
      row = 0;

  if (start === -1) {
    start = null;
  }

  if (start == null) {
    last = new Date(0).toISOString();
  }

  stream.destroy = function() {
    this.destroyed = true;
  };

  // Unfortunately, we
  // need to poll here.
  (function check() {
    self.query({
      from: last || 'NOW-1DAY',
      until: 'NOW'
    }, function(err, results) {
      if (stream.destroyed) return;

      if (err) {
        stream.emit('error', err);
        return setTimeout(check, 2000);
      }

      var result = res[res.length-1];
      if (result && result.timestamp) {
        if (last == null) {
          last = result.timestamp;
          return;
        }
        last = result.timestamp;
      } else {
        return func();
      }

      results.forEach(function(log) {
        if (start == null || row > start) {
          stream.emit('log', log);
        }
        row++;
      });

      setTimeout(check, 2000);
    });
  })();

  return stream;
};

//
// ### function query (options)
// #### @options {Object} Set stream options
// #### @callback {function} Callback
// Query the transport.
//

Loggly.prototype.query = function (options, callback) {
  var self = this,
      meta = this.extractMeta(options),
      context = this.extractContext(options);

  this.client
    .search(this.loglify(options))
    .context(context)
    .meta(meta)
    .run(function (err, logs) {
      return err
        ? callback(err)
        : callback(null, self.sanitizeLogs(logs));
    });
};

//
// ### function formatQuery (query)
// #### @query {string|Object} Query to format
// Formats the specified `query` Object (or string) to conform
// with the underlying implementation of this transport.
//
Loggly.prototype.formatQuery = function (query) {
  return query;
};

//
// ### function formatResults (results, options)
// #### @results {Object|Array} Results returned from `.query`.
// #### @options {Object} **Optional** Formatting options
// Formats the specified `results` with the given `options` accordinging
// to the implementation of this transport.
//
Loggly.prototype.formatResults = function (results, options) {
  return results;
};

//
// ### function extractContext (obj)
// #### @obj {Object} Options has to extract Loggly 'context' properties from
// Returns a separate object containing all Loggly 'context properties in
// the object supplied and removes those properties from the original object.
// [See Loggly Search API](http://wiki.loggly.com/retrieve_events#optional)
//
Loggly.prototype.extractContext = function (obj) {
  var context = {};

  ['rows',
   'start',
   'from',
   'until',
   'order',
   'callback',
   'format',
   'fields'].forEach(function (key) {
    if (obj[key]) {
      context[key] = obj[key];
      delete obj[key];
    }
  });

  context = this.normalizeQuery(context);
  context.from = context.from.toISOString();
  context.until = context.until.toISOString();

  context.from  = context.from  || 'NOW-1DAY';
  context.until = context.until || 'NOW';
  context.rows  = context.rows  || 50;

  return context;
};

//
// ### function extractContext (obj)
// #### @obj {Object} Options has to extract Loggly 'meta' properties from
// Returns a separate object containing all Loggly 'meta' properties in
// the object supplied and removes those properties from the original object.
// [See Loggly Search Language Guide](http://wiki.loggly.com/searchguide)
//
Loggly.prototype.extractMeta = function (obj) {
  var meta = {};
  ['ip', 'address', 'device', 'inputname', 'inputid'].forEach(function (key) {
    if (obj[key]) {
      meta[key] = obj[key];
      delete obj[key];
    }
  });

  return meta;
};

//
// ### function loglify (obj)
// #### @obj {Object} Search query to convert into an `AND` loggly query.
// Creates an `AND` joined loggly query for the specified object
//
// e.g. `{ foo: 1, bar: 2 }` => `json.foo:1 AND json.bar:2`
//
Loggly.prototype.loglify = function (obj) {
  var opts = [];

  Object.keys(obj).forEach(function (key) {
    if (key !== 'query') {
      opts.push('json.' + key + ':' + obj[key]);
    }
  });

  if (obj.query) {
    opts.unshift(obj.query);
  }

  return opts.join(' AND ');
};

//
// ### function sanitizeLogs (logs)
// #### @logs {Object} Data returned from Loggly to sanitize
// Sanitizes the log information returned from Loggly so that
// users cannot gain access to critical information such as:
//
// 1. IP Addresses
// 2. Input names
// 3. Input IDs
//
Loggly.prototype.sanitizeLogs = function (logs) {
  logs.context.query = logs.context.query.replace(/\s*inputname\:\w+\s*/ig, '');
  logs.data.forEach(function (item) {
    delete item.ip;
    delete item.inputId;
    delete item.inputname
  });

  return logs;
};

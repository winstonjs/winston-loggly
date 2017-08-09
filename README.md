# winston-loggly-bulk

A [Loggly][0] transport for [winston][1].

[![Version npm](https://img.shields.io/npm/v/winston-loggly-bulk.svg?style=flat-square)](https://www.npmjs.com/package/winston-loggly-bulk)[![npm Downloads](https://img.shields.io/npm/dm/winston-loggly-bulk.svg?style=flat-square)](https://www.npmjs.com/package/winston-loggly-bulk)

[![NPM](https://nodei.co/npm/winston-loggly-bulk.png?downloads=true&downloadRank=true)](https://nodei.co/npm/winston-loggly-bulk/)

A client implementation for Loggly in node.js. Check out Loggly's [Node logging documentation](https://www.loggly.com/docs/nodejs-logs/) for more.


## Usage
``` js
  var winston = require('winston');

  //
  // Requiring `winston-loggly-bulk` will expose
  // `winston.transports.Loggly`
  //
  require('winston-loggly-bulk');

  winston.add(winston.transports.Loggly, options);
```

The Loggly transport is based on [Nodejitsu's][2] [node-loggly][3] implementation of the [Loggly][0] API. If you haven't heard of Loggly before, you should probably read their [value proposition][4]. The Loggly transport takes the following options. Either 'inputToken' or 'inputName' is required:

* __level:__ Level of messages that this transport should log.
* __subdomain:__ The subdomain of your Loggly account. *[required]*
* __auth__: The authentication information for your Loggly account. *[required with inputName]*
* __inputName:__ The name of the input this instance should log to.
* __inputToken:__ The input token of the input this instance should log to.
* __json:__ If true, messages will be sent to Loggly as JSON.
* __tags:__ An array of tags to send to loggly.
* __isBulk:__ If true, sends messages using bulk url
* __stripColors:__ Strip color codes from the logs before sending
* __bufferOptions:__ Buffer options has two configurations.
  - __size:__ Number of logs to be buffered.
  - __retriesInMilliSeconds:__ Time in milliseconds to retry sending buffered logs. 
* __timestamp:__ If false, library will not include timestamp in log events. 
  - __Note:__ Library includes timestamp by default when we do not set timestamp option.

*Metadata:* Logged in suggested [Loggly format][5]

## Buffer Support

This library has buffer support during temporary network outage. User can configure size of buffer (no. of logs to be stored during network outage).

Add these below configuration in code snippet to override the default values of buffer option  __size__ and __retriesInMilliSeconds__.
``` js
bufferOptions: {
    size: 1000,
    retriesInMilliSeconds: 60 * 1000
}  
```
* __Note:__ The default value of buffer size and retries in milliseconds are 500 and 30000 (30 seconds) respectively.

## Flush logs and exit

Our library uses ajax requests to send logs to Loggly and ajax requests take time to complete, in that case if you call process.exit() externally in your application then it is certain that as soon as process.exit() will be called, your application will exit and all the queued requests will be interrupted and your application logs will also not reach to Loggly. 

To support this scenario in which you really want to call process.exit() without losting logs, we have a function called flushLogsAndExit() which waits for 10 seconds and then call process.exit() itself. By doing so, logging will be complete in given time and then your apllication will exit.

You have to do something like below code snippet:

``` js
var winston = require('winston'),
winlog = require('winston-loggly-bulk');

winston.log("info", "hello World");
winlog.flushLogsAndExit();
  
```

## Motivation
`tldr;?`: To break the [winston][1] codebase into small modules that work together.

The [winston][1] codebase has been growing significantly with contributions and other logging transports. This is **awesome**. However, taking a ton of additional dependencies just to do something simple like logging to the Console and a File is overkill.

## Installation

### Installing npm (node package manager)

``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing winston-loggly

``` bash
  $ npm install winston
  $ npm install winston-loggly-bulk
```

## Run Tests
All of the winston tests are written in [vows][6], and cover all of the use cases described above. You will need to add valid credentials for the various transports included to test/config.json before running tests:

``` js
  {
    "transports": {
      "loggly": {
        "subdomain": "your-subdomain",
        "inputToken": "really-long-token-you-got-from-loggly",
        "auth": {
          "username": "your-username",
          "password": "your-password"
        }
      }
    }
  }
```

Once you have valid configuration and credentials you can run tests with [npm][7]:

```
  npm test
```

#### Author: [Charlie Robbins](http://www.github.com/indexzero)
#### Contributors: [Loggly](http://github.com/loggly), [Shweta Jain](http://github.com/shwetajain148),

[0]: http://loggly.com
[1]: https://github.com/flatiron/winston
[2]: http://nodejitsu.com
[3]: https://github.com/nodejitsu/node-loggly
[4]: http://www.loggly.com/product/
[5]: http://www.loggly.com/docs/automated-parsing/
[6]: http://vowsjs.org
[7]: http://npmjs.org

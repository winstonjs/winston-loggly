"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_transport_1 = __importDefault(require("winston-transport"));
const loggly_1 = __importDefault(require("loggly"));
const CONTEXT_KEYS = ['start', 'from', 'util', 'order', 'callback', 'size', 'format', 'fields'];
const LOGGLY_KEYS = ['query', 'fields', 'start', 'rows', 'limit', 'from', 'util', 'tag'];
const code = /\u001b\[(\d+(;\d+)*)?m/g;
class Loggly extends winston_transport_1.default {
    constructor(options = {
        token: '',
        subdomain: '',
    }) {
        super(options);
        this.timestamp = false;
        this.stripColors = false;
        this.name = 'loggly';
        if (!options.token || !options.subdomain) {
            throw new Error('Loggly subdomain/token is required.');
        }
        ;
        //deprecated tag / id attributes
        if (options.tag || options.id) {
            throw new Error('Please use tags: string[] isntead of id or tag');
        }
        this.tags = options.tags || [];
        if (options.timestamp) {
            this.timestamp = options.timestamp;
        }
        if (options.stripColors) {
            this.stripColors = options.stripColors;
        }
        this.client = loggly_1.default.createClient(options);
    }
    log(info, callback) {
        if (this.silent) {
            if (callback)
                setImmediate(callback);
            return;
        }
        const logged = (err, res) => {
            if (err) {
                this.emit('warn', err);
            }
            else {
                this.emit('logged', info);
            }
        };
        let meta = {
            level: 'INFO',
            message: '',
            tags: [],
        };
        if (typeof info === 'string') {
            meta.message = info;
        }
        else if (info && 'level' in info) {
            meta = info;
        }
        if (this.timestamp && !meta.timestamp) {
            meta.timestamp = (new Date()).toISOString();
        }
        if (this.stripColors) {
            meta.message = ('' + meta.message).replace(code, '');
        }
        this.client.log(meta, this.tags, logged);
        if (callback) {
            setImmediate(callback);
        }
    }
    _extractContext(options = {}) {
        let context = {};
        //extrai atributos do options
        CONTEXT_KEYS.forEach(key => {
            context[key] = options[key];
            delete options[key];
        });
        context = this.normalizeQuery(context);
        if (context.from && context.from instanceof Date) {
            context.from = context.from.toISOString();
        }
        if (context.until && context.until instanceof Date) {
            context.until = context.until.toISOString();
        }
        context.from = context.from || '-1d';
        context.until = context.until || 'now';
        context.size = context.size || 50;
        return context;
    }
    query(options, callback) {
        const context = this._extractContext(options);
        let logglyOptions = this._logligy(options);
        logglyOptions = Object.assign({}, logglyOptions, context);
        this.client
            .search(logglyOptions, (err, result) => {
            if (err) {
                callback(err, []);
            }
            else {
                callback(null, result);
            }
        })
            .run((err, logs) => {
            return err ? callback(err, null) : callback(null, this.sanitizeLogs(logs));
        });
    }
    sanitizeLogs(logs) {
        return logs;
    }
    normalizeQuery(options) {
        const defaultQueryOptions = {
            rows: 10,
            limit: 10,
            start: 0,
            util: new Date(),
            order: 'desc',
        };
        const normalizedOptions = Object.assign({}, defaultQueryOptions, options);
        // limit
        normalizedOptions.rows = options.rows || options.limit || 10;
        // starting row offset
        normalizedOptions.start = normalizedOptions.start || 0;
        // now
        normalizedOptions.until = normalizedOptions.until || new Date();
        if (typeof normalizedOptions.until !== 'object') {
            normalizedOptions.until = new Date(normalizedOptions.until);
        }
        const until = normalizedOptions.until;
        // now - 24
        normalizedOptions.from = normalizedOptions.from || (until - (24 * 60 * 60 * 1000));
        if (typeof normalizedOptions.from !== 'object') {
            normalizedOptions.from = new Date(normalizedOptions.from);
        }
        // 'asc' or 'desc'
        normalizedOptions.order = normalizedOptions.order || 'desc';
        return normalizedOptions;
    }
    _logligy(options) {
        const joinner = [];
        const keys = Object.keys(options);
        keys.forEach(key => {
            //ignora na lista de ignores
            if (LOGGLY_KEYS.indexOf(key) > -1) {
                return;
            }
            const val = options[key];
            joinner.push(`json.${key}:${val}`);
        });
        //adiciona tag se existir
        if (options.tag) {
            joinner.push(`tag:${options.tag}`);
        }
        if (options.query) {
            joinner.unshift(options.query);
        }
        return { query: joinner.join(' AND ') };
    }
}
exports.Loggly = Loggly;
//# sourceMappingURL=winston-loggly.js.map
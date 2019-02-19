import TransportStream, { TransportStreamOptions } from 'winston-transport';
import { TransformableInfo } from 'logform';
import loggly from 'loggly';
import { format } from 'logform';

interface LogglyTransportOptions extends TransportStreamOptions, loggly.LogglyOptions {
    
    //@deprecated
    id?: any;

    //@deprecated
    tag?: any;
}

const CONTEXT_KEYS = ['start', 'from', 'util', 'order', 'callback', 'size', 'format', 'fields'];

const LOGGLY_KEYS = ['query', 'fields', 'start', 'rows', 'limit', 'from', 'util', 'tag'];

interface QueryOptions {
    rows?: number;
    limit?: number;
    start?: Date|number;
    until?: Date|number|string;
    from?: Date|number|string;
    order?: string;

    [key: string]: any;
    
}

export class Loggly extends TransportStream {

    name: string;

    client: loggly.LogglyInstance;

    tags: string[];

    constructor(options: LogglyTransportOptions = {
        token: '',
        subdomain: '',
    }) {
        super(options);
        this.name   = 'loggly';
        
        if (!options.token || !options.subdomain) {
            throw new Error('Loggly subdomain/token is required.');
        };
        
        //deprecated tag / id attributes
        if (options.tag || options.id) {
            throw new Error('Please use tags: string[] isntead of id or tag');
        }
        this.tags = options.tags || [];

        this.client = loggly.createClient(options);
    }

    log(info: TransformableInfo, callback?: () => void) {
        if (this.silent) {
            if (callback) setImmediate(callback);
            return;
        }

        const logged = (err: any, res: any) => {
            if (err) {
                this.emit('warn', err);
            } else {
                this.emit('logged', info);
            }
        }

        this.client.log(info.message, this.tags, logged);
        
        if (callback) {
            setImmediate(callback);
        }
    }

    _extractContext( options: QueryOptions = {}) {

        let context: QueryOptions = {};

        //extrai atributos do options
        CONTEXT_KEYS.forEach( key => {
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
        

        context.from  = context.from  || '-1d';
        context.until = context.until || 'now';
        context.size  = context.size  || 50;

        return context;
    }

    query(options: QueryOptions, callback: (err: any, result: any) => void) {
        const context = this._extractContext(options);
        
        let logglyOptions = this._logligy(options);
        logglyOptions = Object.assign({}, logglyOptions, context);

        this.client
            .search(logglyOptions, (err, result) => {
                if (err) {
                    callback(err, []);
                } else {
                    callback(null, result);
                }
            })
            .run((err, logs) => {
                return err? callback(err, null) : callback(null, this.sanitizeLogs(logs));
            });
    }

    sanitizeLogs<T>(logs: T): T {
        return logs;
    }

    normalizeQuery(options: QueryOptions) {
        const defaultQueryOptions = {
            rows: 10,
            limit: 10,
            start: 0,
            util: new Date(),
            order: 'desc',
        }

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
  
        const until: unknown = normalizedOptions.until;
        // now - 24
        normalizedOptions.from = normalizedOptions.from || ((until as number) - (24 * 60 * 60 * 1000));
        if (typeof normalizedOptions.from !== 'object') {
          normalizedOptions.from = new Date(normalizedOptions.from);
        }
  
        // 'asc' or 'desc'
        normalizedOptions.order = normalizedOptions.order || 'desc';
  
        return normalizedOptions;
    }

    _logligy(options: QueryOptions): loggly.SearchOptionsWithQuery {
        const joinner: string[] = [];

        const keys = Object.keys(options);
        keys.forEach( key => {
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

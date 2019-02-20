import TransportStream, { TransportStreamOptions } from 'winston-transport';
import { TransformableInfo } from 'logform';
import loggly from 'loggly';
interface LogglyTransportOptions extends TransportStreamOptions, loggly.LogglyOptions {
    id?: any;
    tag?: any;
}
interface QueryOptions {
    rows?: number;
    limit?: number;
    start?: Date | number;
    until?: Date | number | string;
    from?: Date | number | string;
    order?: string;
    [key: string]: any;
}
export declare class Loggly extends TransportStream {
    name: string;
    client: loggly.LogglyInstance;
    tags: string[];
    constructor(options?: LogglyTransportOptions);
    log(info: TransformableInfo, callback?: () => void): void;
    _extractContext(options?: QueryOptions): QueryOptions;
    query(options: QueryOptions, callback: (err: any, result: any) => void): void;
    sanitizeLogs<T>(logs: T): T;
    normalizeQuery(options: QueryOptions): {
        rows: number;
        limit: number;
        start: number;
        util: Date;
        order: string;
    } & QueryOptions;
    _logligy(options: QueryOptions): loggly.SearchOptionsWithQuery;
}
export {};

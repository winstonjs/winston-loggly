import logglyModule, { LogglyInstance, SearchResults, Search, SearchOptions } from 'loggly';

import { Loggly } from '../src/winston-loggly';
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { format, TransformableInfo } from 'logform';



type CallbackType =  (err: any, results: any) => void;


class SearchResult implements Search {
    
    constructor(
        private results: SearchResults
    ) {}

    run(callback: (err: any, results: SearchResults) => void) {
        callback(null, this.results);
        return this;
    }
}
class FakeLogglyInstance implements LogglyInstance {
     
    search(options: SearchOptions|string , callback?: (err: any, results: SearchResults) => void): Search {
        return new SearchResult({
            events: [],
            page: 1,
            total_events: 200
        });
    }

    log(message: any, tags?: string[]| CallbackType, callback?: CallbackType): this {
        if(typeof tags === 'function') {
            callback = tags;
        }

        if(typeof callback === 'function') {
            callback(null, message);
        }
        return this;
    }
}

const instance = new FakeLogglyInstance();
           
const sutb = sinon.stub(logglyModule, 'createClient');
sutb.returns(instance);

describe('Old Loggly implementation', function() {
    
    const OldLoggly  = require('../lib/winston-loggly').Loggly;
    const loggly = new OldLoggly({
        subdomain: 'test',
        token: 'test'
    });

    after(function() {
        // sinon.reset();
    });

    it('should querify params', function() {

        const expected = {
            query: 'json.foo:bar AND json.bar:foo'
        };

        const actual = loggly.loglify({
            limit: 10,
            foo: 'bar',
            bar: 'foo',
        });

        expect(actual).to.be.deep.equal(expected);
    });
});

describe('Loggly transport Stream', function() {
    
    const simpleFormat = format.combine(
        format.simple(),
    );
    
    after(function() {
        // sinon.restore();
    });
    
    it('should emit log', async function() {

        const info =  simpleFormat.transform({
            level: 'info',
            message: 'expected',
        }) as TransformableInfo;
        

        const loggly = new Loggly({
            subdomain: 'test',
            token: 'fake',
            tags: ['arroz'],
        });

        return new Promise((resolve, reject) => {
            loggly.on('logged', (log: any) => {
                expect(log).to.be.equal(info);
                resolve();
            });
            
            loggly.on('warn', err => {
               reject(err);
            });
            loggly.log(info, () => {
            });
        });
    });

    it('should query some logs', async function() {

        const loggly = new Loggly({
            subdomain: 'test',
            token: 'fake',
            tags: ['arroz'],
        });

        const expected: SearchResults = {
            events: [],
            page: 1,
            total_events: 200
        };
        return new Promise((resolve, reject) => {

            // const queryStub = sinon.stub(instance, 'search');

            loggly.query({
                limit: 10,
                start: Date.now(),
                until: Date.now(),
            }, (err, actual: SearchResults | null) => {
       
                if (err) {
                    reject(err);
                    return;
                }

                expect(actual).to.be.deep.equal(expected);
                resolve();
            });
        });
    });

    it('should format Options params', async function() {
        
        const loggly = new Loggly({
            subdomain: 'test',
            token: 'fake',
            tags: ['arroz'],
        });

        const result = loggly._logligy({
            foo: 'bar',
            bar: 'foo',
        });

        const expected = {
            query: 'json.foo:bar AND json.bar:foo'
        }
        expect(result).to.deep.equal(expected);
    })
    it('should exlcude knows fields in query', async function() {
        const loggly = new Loggly({
            subdomain: 'test',
            token: 'fake',
            tags: ['arroz'],
        });

        const result = loggly._logligy({
            limit: 10,
            foo: 'bar',
            bar: 'foo',
        });

        const expected = {
            query: 'json.foo:bar AND json.bar:foo'
        }
        expect(result).to.deep.equal(expected);
    });
});
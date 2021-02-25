/* eslint-disable prefer-spread */
/* eslint-disable prefer-rest-params */
/* eslint-disable prefer-destructuring */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { HttpRequest } from 'uWebSockets.js';
import accepts from 'accepts';
import typeis from 'type-is';
import * as qs from 'querystring';
import { IRequest, HttpMethod, TResponseExposedMethods } from './utils/types';

import {
  GET_HEADER,
  GET_METHOD,
  GET_PARAMS,
  GET_QUERY,
  GET_URL,
  FOR_EACH,
  FROM_RES,
} from './utils/symbol';

const textDecoder = new TextDecoder();

/**
 * Map parameter's name to its index in url
 */
export type ParametersMap = string[];

/**
 * Specify Request options such as: parameters map, cache req default value, etc,...
 */
export interface IRequestOptions {
  /**
   * Map parameter to specific id to get the exact value by uWS method req.getParams(id: number)
   */
  paramsMap?: ParametersMap;

  /**
   * Retrieve req data from uWS `req` and cache these values
   *
   * For POST/PUT/DELETE method which needs to parse body from uWS `res`, those `req` values must be retrieve before the
   * `res.OnData()` method in order not to violates memory allocation policies of uWS
   *
   * Set forceInit to `true` to cache all the values coming from the req's methods execution's result
   *
   * @default false
   */
  forceInit?:
    | {
        /**
         * Cache headers value by req.forEach()
         */
        headers?: boolean;

        /**
         * Cache query value
         */
        query?: boolean;

        /**
         * Cache params value
         */
        params?: boolean;

        /**
         * Cache method value
         */
        method?: boolean;

        /**
         * Cache url value
         */
        url?: boolean;
      }
    | true;

  /**
   * Enable dedicated cookie parser method
   */
  cookieParser?: boolean;

  /**
   * The prefixed url comming from application set up
   */
  baseUrl?: string;
}

export default class Request implements IRequest {
  /**
   * uWS Original req object
   */
  public originalReq: HttpRequest;

  public [FROM_RES]: TResponseExposedMethods;

  // Extended method from uWS
  private [GET_HEADER]: any;

  private [GET_PARAMS]: any;

  private [GET_URL]: any;

  private [GET_METHOD]: any;

  private [GET_QUERY]: any;

  private [FOR_EACH]: any;

  private parametersMap?: ParametersMap;
  
  public accepted: string[] = [];

  private _method?: HttpMethod;

  private _url?: string;

  private _params?: Record<string, string>;

  private _query?: Record<string, string>;

  private _headers: Record<string, string> = {};

  private _parsedBody?: Record<string, unknown> | string;

  public raw?: Buffer;

  private _hasCalledGetHeader = false;

  private _cookies?: Record<string, string>;

  private _hasCookieParser = false;

  private _baseUrl?: string;

  private _originalUrl?: string;

  constructor(req: HttpRequest, opts?: IRequestOptions) {
    this.originalReq = req;
    this[GET_HEADER] = req.getHeader.bind(req);
    this[GET_PARAMS] = req.getParameter.bind(req);
    this[GET_METHOD] = req.getMethod.bind(req);
    this[GET_QUERY] = req.getQuery.bind(req);
    this[FOR_EACH] = req.forEach.bind(req);
    this[GET_URL] = req.getUrl.bind(req);

    if (opts) {
      const { paramsMap, forceInit, cookieParser, baseUrl } = opts;
      this.parametersMap = paramsMap;

      if (forceInit) {
        if (typeof forceInit === 'object') {
          const keys = Object.keys(forceInit);

          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const hasValue = (forceInit as { [key: string]: boolean })[key];
            if (hasValue) {
              (this as any)[key];
            }
          }
        }

        if (typeof forceInit === 'boolean') {
          this.headers;
          this.url;
          this.query;
          this.params;
          this.method;
        }
      }

      if (cookieParser) {
        this._hasCookieParser = true;
        this._cookies = {};
      }

      this._baseUrl = baseUrl;
    }

    this.header = this.get;
  }

  get body(): any {
    if (this._parsedBody) {
      return this._parsedBody;
    }

    return this.raw;
  }

  set body(data: any) {
    this._parsedBody = data;
  }

  get headers(): Record<string, string> {
    if (this._hasCalledGetHeader) return this._headers;

    const headers: Record<string, string> = {};

    this[FOR_EACH]((k: string, v: string) => {
      headers[k] = v;
    });

    this._headers = headers;

    this._hasCalledGetHeader = true;

    return headers;
  }

  get method(): HttpMethod {
    if (this._method) return this._method;
    this._method = this[GET_METHOD]();
    return this._method as HttpMethod;
  }

  get query(): Record<string, string> {
    if (this._query) {
      return this._query;
    }

    this._query = qs.parse(this[GET_QUERY]()) as {};

    return this._query;
  }

  get url(): string {
    if (this._url) return this._url;

    this._url = this[GET_URL]();

    return this._url as string;
  }

  get params(): Record<string, string> {
    if (this._params) return this._params;

    this._params =
      this.parametersMap && this.parametersMap?.length > 0
        ? this.parametersMap.reduce((acc, cur, idx) => {
            acc[cur] = this[GET_PARAMS](idx);
            return acc;
          }, {} as Record<string, string>)
        : {};

    return this._params;
  }

  get ip(): string {
    return textDecoder.decode(this[FROM_RES].getRemoteAddressAsText());
  }

  get ips(): string[] {
    const fwd = this.get('X-Forwarded-For');
    return fwd ? [fwd, this.ip] : [this.ip];
  }

  get hostname(): string | undefined {
    let host = this.get('X-Forwarded-Host');

    if (!host) {
      this.get('Host');
    } else if (host.indexOf(',') === -1) {
      host = host.substring(0, host.indexOf(',')).trimRight();
    }

    if (!host) return;

    const index = host[0] === '[' ? host.indexOf(']') + 1 : 0;

    // eslint-disable-next-line consistent-return
    return index !== -1 ? host.substring(0, index) : host;
  }

  get cookies(): any {
    if (this._hasCookieParser) {
      if (this._cookies) return this._cookies;

      // Parse cookie
      const { cookie } = this.headers;

      if (!cookie) {
        this._cookies = {};
        return {};
      }

      const result: {
        [key: string]: any;
      } = {};

      const parts = cookie.split(';');

      for (let i = 0; i < parts.length; i++) {
        const val = parts[i].trim().split('=') as string[];

        if (val.length === 2) {
          result[val[0]] = val[1];
        }
      }

      this._cookies = result;
      return result;
    }

    if (this._headers) {
      return this._headers.cookie;
    }

    return this[GET_HEADER]('cookie');
  }

  get baseUrl(): string | undefined {
    return this._baseUrl;
  }

  get originalUrl(): string {
    if (this._originalUrl) return this._originalUrl;

    if (!this._baseUrl) return this.url;

    const escapedUrl = this.url.replace(this._baseUrl, '');

    this._originalUrl = escapedUrl;

    return escapedUrl;
  }

  public accepts(...type: string[]): string | string[] | false {
    const accept = accepts(this as any);
    return accept.types.apply(accept, arguments as any);
  }

  public acceptsCharsets(...charset: string[]): string[] | string | false {
    const accept = accepts(this as any);
    return accept.charsets.apply(accept, arguments as any);
  }

  public acceptsEncodings(...encoding: string[]): string[] | string | false {
    const accept = accepts(this as any);
    return accept.encodings.apply(accept, arguments as any);
  }

  public acceptsLanguages(...charset: string[]): string[] | string | false {
    const accept = accepts(this as any);
    return accept.languages.apply(accept, arguments as any);
  }

  // eslint-disable-next-line class-methods-use-this
  public get(name: string): string | undefined {
    if (!name) {
      throw new TypeError('name argument is required to req.get');
    }

    if (typeof name !== 'string') {
      throw new TypeError('name must be a string to req.get');
    }

    const lc = name.toLowerCase();

    switch (lc) {
      case 'referer':
      case 'referrer':
        return this.headers.referer || this.headers.referrer;
      default:
        return this.headers[lc];
    }
  }

  public header: (name: string) => string | undefined;

  public is(type: string | string[]): string | false | null {
    let arr: string[];

    // support flattened arguments
    if (!Array.isArray(type)) {
      arr = new Array(arguments.length);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = arguments[i];
      }
    }

    arr = type as string[];

    return typeis(this as any, arr);
  }
}

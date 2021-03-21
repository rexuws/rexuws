import { HttpRequest, HttpResponse, RecognizedString } from 'uWebSockets.js';
import { ReadStream } from 'fs';

export interface IIndexable {
  [key: string]: unknown;
}

export interface RangeParserRanges extends Array<Range> {
  type: string;
}
export interface RangeParserRange {
  start: number;
  end: number;
}
export interface RangeParserOptions {
  /**
   * The "combine" option can be set to `true` and overlapping & adjacent ranges
   * will be combined into a single range.
   */
  combine?: boolean;
}
export type RangeParserResultUnsatisfiable = -1;
export type RangeParserResultInvalid = -2;
export type RangeParserResult =
  | RangeParserResultUnsatisfiable
  | RangeParserResultInvalid;

export enum HttpMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DEL = 'del',
  OPTIONS = 'options',
  HEAD = 'head',
  TRACE = 'trace',
  CONNECT = 'trace',
  ANY = 'any',
}

export interface CookieOptions {
  maxAge?: number;
  signed?: boolean;
  expires?: Date;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  secure?: boolean;
  encode?: (val: string) => string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
}

export interface IResponseSendFileOption {
  /**
   * Explicitly specify mime type
   */
  mime?: string;

  /**
   * Explicitly specify filesize (to skip fs.stat for size checking)
   */
  fileSize?: number;

  /**
   * Defaulting to 0 (can be string converted by `ms`)
   */
  maxAge?: number;

  lastModified?: string;
}

export interface IRequest extends Record<string | number | symbol, unknown> {
  /**
   * Check if the given `type(s)` is acceptable, returning
   * the best match when true, otherwise `undefined`, in which
   * case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single mime type string
   * such as "application/json", the extension name
   * such as "json", a comma-delimted list such as "json, html, text/plain",
   * or an array `["json", "html", "text/plain"]`. When a list
   * or array is given the _best_ match, if any is returned.
   *
   * Examples:
   *
   *     // Accept: text/html
   *     req.accepts('html');
   *     // => "html"
   *
   *     // Accept: text/*, application/json
   *     req.accepts('html');
   *     // => "html"
   *     req.accepts('text/html');
   *     // => "text/html"
   *     req.accepts('json, text');
   *     // => "json"
   *     req.accepts('application/json');
   *     // => "application/json"
   *
   *     // Accept: text/*, application/json
   *     req.accepts('image/png');
   *     req.accepts('png');
   *     // => undefined
   *
   *     // Accept: text/*;q=.5, application/json
   *     req.accepts(['html', 'json']);
   *     req.accepts('html, json');
   *     // => "json"
   */
  accepts(...type: string[]): string | string[] | false;

  /**
   * Returns the first accepted charset of the specified character sets,
   * based on the request's Accept-Charset HTTP header field.
   * If none of the specified charsets is accepted, returns false.
   *
   * For more information, or if you have issues or concerns, see accepts.
   */
  acceptsCharsets(...charset: string[]): string[] | string | false;

  /**
   * Returns the first accepted encoding of the specified encodings,
   * based on the request's Accept-Encoding HTTP header field.
   * If none of the specified encodings is accepted, returns false.
   *
   * For more information, or if you have issues or concerns, see accepts.
   */
  acceptsEncodings(...encoding: string[]): string[] | string | false;

  /**
   * Returns the first accepted language of the specified languages,
   * based on the request's Accept-Language HTTP header field.
   * If none of the specified languages is accepted, returns false.
   *
   * For more information, or if you have issues or concerns, see accepts.
   */
  acceptsLanguages(...charset: string[]): string[] | string | false;

  /**
   * Request body post POST/PUT/PATCH method
   *
   * Without default parser, the given body is served as a Buffer
   */
  body: any;

  /**
   * Without default parser, cookies will be served as a string
   */
  cookies: any;

  // Fulfill method from http.IncomingMessage
  get(name: string): string | undefined;

  /**
   * Return request header.
   *
   * The `Referrer` header field is special-cased,
   * both `Referrer` and `Referer` are interchangeable.
   *
   * Examples:
   *
   *     req.get('Content-Type');
   *     // => "text/plain"
   *
   *     req.get('content-type');
   *     // => "text/plain"
   *
   *     req.get('Something');
   *     // => undefined
   *
   * Aliased as `req.header()`.
   */
  header(name: string): string | undefined;

  /**
   * Check if the incoming request contains the "Content-Type"
   * header field, and it contains the give mime `type`.
   *
   * Examples:
   *
   *      // With Content-Type: text/html; charset=utf-8
   *      req.is('html');
   *      req.is('text/html');
   *      req.is('text/*');
   *      // => true
   *
   *      // When Content-Type is application/json
   *      req.is('json');
   *      req.is('application/json');
   *      req.is('application/*');
   *      // => true
   *
   *      req.is('html');
   *      // => false
   */
  is(type: string | string[]): string | false | null;

  headers: Record<string, string>;

  /**
   * Parse the "Host" header field hostname.
   */
  hostname: string | undefined;

  /**
   * Return the remote address, or when
   * "trust proxy" is `true` return
   * the upstream addr.
   */
  ip: string;

  /**
   * When "trust proxy" is `true`, parse
   * the "X-Forwarded-For" ip address list.
   *
   * For example if the value were "client, proxy1, proxy2"
   * you would receive the array `["client", "proxy1", "proxy2"]`
   * where "proxy2" is the furthest down-stream.
   */
  ips: string[];

  method: HttpMethod;

  params: Record<string, string>;

  query: Record<string, string>;

  /**
   * Raw body
   */
  raw?: Buffer;

  originalReq: HttpRequest;

  url: string;

  /**
   * The prefixed url comming from application set up
   */
  baseUrl?: string;

  /**
   * The expected url set up by router (omit application's modifications)
   */
  originalUrl: string;
}

export interface IResponse extends Record<string | number | symbol, unknown> {
  /**
   * Set _Content-Type_ response header with `type` through `mime.lookup()`
   * when it does not contain "/", or set the Content-Type to `type` otherwise.
   *
   * Examples:
   *
   *     res.type('.html');
   *     res.type('html');
   *     res.type('json');
   *     res.type('application/json');
   *     res.type('png');
   */
  contentType(type: string): this;

  /**
   * Set cookie `name` to `val`, with the given `options`.
   *
   * Options:
   *
   *    - `maxAge`   max-age in milliseconds, converted to `expires`
   *    - `signed`   sign the cookie
   *    - `path`     defaults to "/"
   *
   * Examples:
   *
   *    // "Remember Me" for 15 minutes
   *    res.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });
   *
   *    // save as above
   *    res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
   */
  cookie(name: string, val: string, options: CookieOptions): this;
  cookie(name: string, val: any, options: CookieOptions): this;
  cookie(name: string, val: any): this;

  /**
   * Transfer the file at the given `path` as an attachment.
   *
   * Optionally providing an alternate attachment `filename`,
   * and optional callback `fn(err)`. The callback is invoked
   * when the data transfer is complete, or when an error has
   * ocurred. Be sure to check `res.headersSent` if you plan to respond.
   *
   * The optional options argument passes through to the underlying
   * res.sendFile() call, and takes the exact same parameters.
   *
   * This method uses `res.sendfile()`.
   */
  download(path: string): void;
  download(path: string, filename: string): void;
  download(path: string, filename: string, options: any): void;

  /** Get value for header `field`. */
  get(field: string): string | undefined;

  /** Get value for header `field`. */
  getHeader(field: string): string | undefined;

  /**
   * Set header `field` to `val`, or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    res.set('Foo', ['bar', 'baz']);
   *    res.set('Accept', 'application/json');
   *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * Aliased as `res.header()`.
   */
  set(field: Record<string, string | string[]>): this;
  set(field: string, value?: string | string[]): this;

  header(field: Record<string, string | string[]>): this;
  header(field: string, value?: string | string[]): this;

  /**
   * Send JSON response
   */
  json(body: any): void;

  locals: Record<string, any>;
  /**
   * Set the location header to `url`.
   *
   * The given `url` can also be the name of a mapped url, for
   * example by default express supports "back" which redirects
   * to the _Referrer_ or _Referer_ headers or "/".
   *
   * Examples:
   *
   *    res.location('/foo/bar').;
   *    res.location('http://example.com');
   *    res.location('../login'); // /blog/post/1 -> /blog/login
   *
   * Mounting:
   *
   *   When an application is mounted and `res.location()`
   *   is given a path that does _not_ lead with "/" it becomes
   *   relative to the mount-point. For example if the application
   *   is mounted at "/blog", the following would become "/blog/login".
   *
   *      res.location('login');
   *
   *   While the leading slash would result in a location of "/login":
   *
   *      res.location('/login');
   */
  location(url: string): this;

  /**
   * Redirect to the given `url` with optional response `status`
   * defaulting to 302.
   *
   * The resulting `url` is determined by `res.location()`, so
   * it will play nicely with mounted apps, relative paths,
   * `"back"` etc.
   *
   * Examples:
   *
   *    res.redirect('/foo/bar');
   *    res.redirect('http://example.com');
   *    res.redirect(301, 'http://example.com');
   *    res.redirect('http://example.com', 301);
   *    res.redirect('../login'); // /blog/post/1 -> /blog/login
   */
  redirect(url: string): void;
  redirect(status: number, url: string): void;
  redirect(url: string, status: number): void;

  /**
   * Render `view` with the given `options` and optional callback `fn`.
   * When a callback function is given a response will _not_ be made
   * automatically, otherwise a response of _200_ and _text/html_ is given.
   *
   * Options:
   *
   *  - `cache`     boolean hinting to the engine it should cache
   *  - `filename`  filename of the view being rendered
   */
  render(
    view: string,
    options?: object,
    callback?: (err: Error, html: string) => void
  ): void;
  render(view: string, callback?: (err: Error, html: string) => void): void;

  /**
   * Send a response.
   */
  send(body: string | Record<string, unknown>): void;

  /**
   * Transfer the file at the given `path`.
   *
   * Automatically sets the _Content-Type_ response header field.
   * The callback `fn(err)` is invoked when the transfer is complete
   * or when an error occurs. Be sure to check `res.headersSent`
   * if you wish to attempt responding, as the header and some data
   * may have already been transferred.
   *
   * Options:
   *
   *   - `maxAge`   defaulting to 0 (can be string converted by `ms`)
   *   - `root`     root directory for relative filenames
   *   - `headers`  object of headers to serve with file
   *   - `dotfiles` serve dotfiles, defaulting to false; can be `"allow"` to send them
   *
   * Other options are passed along to `send`.
   *
   * Examples:
   *
   *  The following example illustrates how `res.sendFile()` may
   *  be used as an alternative for the `static()` middleware for
   *  dynamic situations. The code backing `res.sendFile()` is actually
   *  the same code, so HTTP cache support etc is identical.
   *
   *     app.get('/user/:uid/photos/:file', function(req, res){
   *       var uid = req.params.uid
   *         , file = req.params.file;
   *
   *       req.user.mayViewFilesFrom(uid, function(yes){
   *         if (yes) {
   *           res.sendFile('/uploads/' + uid + '/' + file);
   *         } else {
   *           res.send(403, 'Sorry! you cant see that.');
   *         }
   *       });
   *     });
   *
   * @api public
   */
  sendFile(path: string, cb?: (err: any) => void): void;
  sendFile(
    buffer: Buffer,
    options: IResponseSendFileOption,
    cb?: (err: any) => void
  ): void;
  sendFile(
    readStream: ReadStream,
    options: IResponseSendFileOption,
    cb?: (err: any) => void
  ): void;
  sendFile(
    path: string,
    options?: IResponseSendFileOption,
    cb?: (err: any) => void
  ): void;
  sendFile(
    path: string | Buffer | ReadStream,
    options?: IResponseSendFileOption | ((err: any) => void),
    cb?: (err: any) => void
  ): void;

  /**
   * Set header `field` to `val`, or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    res.set('Foo', ['bar', 'baz']);
   *    res.set('Accept', 'application/json');
   *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * Aliased as `res.header()`.
   */
  set(field: Record<string, string> | string, val?: string): this;

  /**
   * Set status `code`
   */
  status(code: number): this;

  /**
   * Set _Content-Type_ response header with `type` through `mime.lookup()`
   * when it does not contain "/", or set the Content-Type to `type` otherwise.
   *
   * Examples:
   *
   *     res.type('.html');
   *     res.type('html');
   *     res.type('json');
   *     res.type('application/json');
   *     res.type('png');
   */
  type(type: string): this;

  end(body?: RecognizedString): void;

  originalRes: HttpResponse;
}

export type TRequestExposedMethods = Pick<IRequest, 'get'>;

export type TResponseExposedMethods = Pick<
  HttpResponse,
  'getRemoteAddressAsText' | 'getProxiedRemoteAddressAsText'
>;

export type TApplicationExposedMethods = {
  render?(...args: any): any;
};

// req.secret

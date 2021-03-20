/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable prefer-rest-params */
/* eslint-disable no-restricted-globals */
import { HttpResponse, RecognizedString } from 'uWebSockets.js';

import statuses from 'statuses';

import fs, { createReadStream, ReadStream } from 'fs';

import mime, { contentType } from 'mime-types';

import { serialize } from 'cookie';

import contentDisposition from 'content-disposition';

import { basename } from 'path';
import { colorConsole, toArrayBuffer, toHtml } from './utils';

import {
  HAS_ASYNC,
  FROM_REQ,
  READ_STREAM,
  WRITE_STATUS,
  WRITE_HEADER,
  TRY_END,
  END,
  GET_WRITE_OFFSET,
  GET_PROXIED_ADDR,
  GET_REMOTE_ADDR,
  ON_ABORTED,
  ON_WRITABLE,
  CORK,
  FROM_APP,
  NEXT,
} from './utils/symbol';

import { ILogger } from './Logger';

import {
  TRequestExposedMethods,
  IResponseSendFileOption as IResponseSendFileOptions,
  IResponse,
  CookieOptions,
  TApplicationExposedMethods,
} from './utils/types';
import { NextFunction } from './middlewares';

export interface IResponseOptions {
  /**
   * Specify if this route is async
   */
  hasAsync?: boolean;

  /**
   * Speficy the limit of file's size allowed to be directly read into buffer rather than a ReadStream
   *
   * @default 100kb
   */
  maxReadFileSize?: number;
}

export interface IResponseHeader {
  name: string;
  value: string;
}

const CONTENT_TYPE = {
  JSON: 'application/json; charset=utf-8',
  PLAIN: 'text/plain; charset=utf-8',
  HTML: 'text/html; charset=utf-8',
  OCTET: 'application/octet-stream',
};

export default class Response implements IResponse {
  public [NEXT]: NextFunction;

  public [FROM_APP]: TApplicationExposedMethods;

  private _statusCode?: string;

  private _headers: IResponseHeader[] = [];

  public locals: Record<string, any> = {};

  public originalRes: HttpResponse;

  private [WRITE_STATUS]: (status: RecognizedString) => HttpResponse;

  private [WRITE_HEADER]: (
    key: RecognizedString,
    value: RecognizedString
  ) => HttpResponse;

  private [END]: (body?: RecognizedString) => HttpResponse;

  private [TRY_END]: (
    fullBodyOrChunk: RecognizedString,
    totalSize: number
  ) => [boolean, boolean];

  private [GET_WRITE_OFFSET]: () => number;

  private [ON_WRITABLE]: (handler: (offset: number) => boolean) => HttpResponse;

  private [ON_ABORTED]: (handler: () => void) => HttpResponse;

  private [GET_REMOTE_ADDR]: () => ArrayBuffer;

  private [GET_PROXIED_ADDR]: () => ArrayBuffer;

  public [CORK]: (cb: () => void) => void;

  public [FROM_REQ]: TRequestExposedMethods;

  public getHeader: (field: string) => string | undefined;

  public set: (field: Record<string, string> | string, val?: string) => this;

  public header: (field: Record<string, string> | string, val?: string) => this;

  public contentType: (type: string) => this;

  public type: (type: string) => this;

  private [HAS_ASYNC]: boolean;

  private debug: ILogger;

  private maxReadFileSize = 102400; // 100KB

  private [READ_STREAM]?: ReadStream;

  private _cookies: string[] = [];

  constructor(res: HttpResponse, opts?: IResponseOptions, logger?: ILogger) {
    this.originalRes = res;
    this[WRITE_HEADER] = this.originalRes.writeHeader.bind(res);
    this[WRITE_STATUS] = this.originalRes.writeStatus.bind(res);
    this[ON_WRITABLE] = this.originalRes.onWritable.bind(res);
    this[
      GET_PROXIED_ADDR
    ] = this.originalRes.getProxiedRemoteAddressAsText.bind(res);
    this[GET_REMOTE_ADDR] = this.originalRes.getRemoteAddressAsText.bind(res);
    this[GET_WRITE_OFFSET] = this.originalRes.getWriteOffset.bind(res);
    this[ON_ABORTED] = this.originalRes.onAborted.bind(res);
    this[ON_WRITABLE] = this.originalRes.onWritable.bind(res);
    this[CORK] = this.originalRes.cork.bind(res);

    this[END] = this.originalRes.end.bind(res);
    this[TRY_END] = this.originalRes.tryEnd.bind(res);

    // Set epress setHeader method
    this.set = this.setHeader;

    this.header = this.setHeader;

    this.getHeader = this.get;

    // Set express type method
    this.type = this.setType;

    this.contentType = this.setType;

    this.debug = logger as ILogger;

    this.debug = logger || {
      ...colorConsole,
      deprecate() {
        return colorConsole.warn.bind(colorConsole, '[DEPRECATED]');
      },
    };

    if (opts) {
      const { hasAsync = false, maxReadFileSize = 102400 } = opts;
      this[HAS_ASYNC] = hasAsync;

      // if (this[HAS_ASYNC]) {
      //   res.onAborted(() => {
      //     res.originalRes.aborted = true;
      //   });
      // }

      if (isNaN(maxReadFileSize)) this.maxReadFileSize = -1;
    }

    this.attachAbortHandler();
  }

  // GETTER
  get preStatus(): number | undefined {
    return this._statusCode ? +this._statusCode : undefined;
  }

  get preHeader(): IResponseHeader[] {
    return this._headers;
  }

  // ***************************************************************
  //  PRIVATE METHOD
  // ***************************************************************

  private attachAbortHandler(calledByMethod = false) {
    if (calledByMethod) {
      if (this[HAS_ASYNC]) return;

      this[ON_ABORTED](() => {
        this.originalRes.aborted = true;

        if (this[READ_STREAM]) {
          if (this.originalRes.id === -1) {
            // console.log(
            //   "ERROR! onAbortedOrFinishedResponse called twice for the same res!"
            // );
          } else {
            // console.log("Stream was closed, openStreams: " + --openStreams);
            // console.timeEnd(res.id);
            this[READ_STREAM]!.destroy();
          }

          /* Mark this response already accounted for */
          this.originalRes.id = -1;
        }
      });

      return;
    }

    if (this[HAS_ASYNC]) {
      this[ON_ABORTED](() => {
        this.originalRes.aborted = true;

        if (this[READ_STREAM]) {
          if (this.originalRes.id === -1) {
            // console.log(
            //   "ERROR! onAbortedOrFinishedResponse called twice for the same res!"
            // );
          } else {
            // console.log("Stream was closed, openStreams: " + --openStreams);
            // console.timeEnd(res.id);
            this[READ_STREAM]!.destroy();
          }

          /* Mark this response already accounted for */
          this.originalRes.id = -1;
        }
      });
    }
  }

  private setHeaderAndStatusByNativeMethod() {
    if (this._statusCode) this[WRITE_STATUS](this._statusCode);

    for (let i = 0; i < this._headers.length; i++) {
      this[WRITE_HEADER](this._headers[i].name, this._headers[i].value);
    }
  }

  private setHeader(
    field: Record<string, string | string[]> | string,
    val?: string | string[]
  ): this {
    if (typeof field === 'string') {
      const lowerCaseField = field.toLowerCase();
      if (lowerCaseField === 'content-type' && Array.isArray(val)) {
        throw new TypeError('Content-Type cannot be set to an Array');
      }

      if (typeof val === 'string') {
        this._headers.push({
          name: lowerCaseField,
          value: val,
        });
        return this;
      }

      if (Array.isArray(val)) {
        val.forEach((v) => {
          this._headers.push({
            name: lowerCaseField,
            value: v,
          });
        });
        return this;
      }
      return this;
    }

    Object.entries(field).forEach(([key, value]) => {
      const lowerCaseKey = key.toLowerCase();

      if (typeof value === 'string') {
        this._headers.push({ name: lowerCaseKey, value });
        return;
      }

      if (Array.isArray(value))
        value.forEach((v) => {
          this._headers.push({
            name: lowerCaseKey,
            value: v,
          });
        });
    });

    return this;
  }

  private setType(type: string): any {
    const ct = type.indexOf('/') === -1 ? (mime as any).lookup(type) : type;

    return this.set('Content-Type', ct);
  }

  public get(field: string): string | undefined {
    return this._headers.find((h) => h.name === field.toLowerCase())?.value;
  }

  public getHeaders(): IResponseHeader[] {
    return this._headers;
  }

  public status(code: number): this {
    this._statusCode = `${code}`;
    return this;
  }

  public sendStatus(code: number): void {
    const body = `${statuses(code)}` || `${this._statusCode}`;
    this._statusCode = `${code}`;
    this.type('txt');

    this.send(body);
  }

  public send(body: string | Record<string, unknown>): void {
    const type = this.get('Content-Type');
    if (typeof body === 'string') {
      if (!type) {
        this.set('Content-Type', CONTENT_TYPE.HTML);
      }

      return this.end(body);
    }

    // Check if body is Buffer

    if (Buffer.isBuffer(body)) {
      if (type) this.type(CONTENT_TYPE.OCTET);

      return this.end(body);
    }

    return this.json(body);
  }

  public json(body: any) {
    if (!this.get('Content-Type')) this.type(CONTENT_TYPE.JSON);
    // this._headers.push({
    //   name: 'content-type',
    //   value: 'application/json;charset=utf-8',
    // });
    this.end(body && JSON.stringify(body));
  }

  public location(url: string): this {
    if (url === 'back') {
      const loc = this[FROM_REQ].get('Referrer');

      if (!loc) return this.set('Location', '/');

      return this.set('Location', encodeURI(loc));
    }

    return this.set('Location', encodeURI(url));
  }

  public redirect(url: string): void;
  public redirect(status: number, url: string): void;
  public redirect(urlOrStatus: string | number, url?: string): void {
    let statusCode = 302;
    if (arguments.length === 2) {
      if (typeof urlOrStatus === 'number') statusCode = urlOrStatus;

      this.status(statusCode);

      this.location(url as string);

      const body = `<p>${
        ((statuses as unknown) as { [key: number]: string })[statusCode]
      }. Redirecting to <a href=${this.get('location')}>${this.get(
        'location'
      )}</a></p>`;

      this.end(body);

      return;
    }

    this.status(statusCode);

    this.location(urlOrStatus as string);

    const body = `<p>${
      ((statuses as unknown) as { [key: number]: string })[statusCode]
    }. Redirecting to <a href=${this.get('location')}>${this.get(
      'location'
    )}</a></p>`;

    this.set('Content-Length', `${Buffer.byteLength(body)}`);

    this.end(body);
  }

  // TODO handle when there is a range in req header
  public sendFile(
    path: string | Buffer | ReadStream,
    options?: IResponseSendFileOptions | ((err: any) => void),
    cb?: (err: any) => void
  ): void {
    // Serve buffer data to client
    const ct = this.get('Content-Disposition');
    if (Buffer.isBuffer(path)) {
      if (typeof options !== 'object' || !options.mime) {
        this.debug.trace(
          'Missing Content-Type when serving file directly by buffer'
        );

        this.status(404).end();

        return;
      }

      if (!ct) {
        this.set('Content-Type', options.mime);
        this.set('Last-Modified', options.lastModified);
        this.set(
          'Cache-Control',
          options.maxAge
            ? `public, max-age=${options.maxAge}`
            : 'no-cache, no-store, must-revalidate'
        );
      }

      this.end(path);

      return;
    }

    // Read file from path
    if (typeof path === 'string') {
      const fileName = basename(path);
      let totalSize = -1;
      let mimeType = '';
      let isDir = false;
      let lastModified = '';

      try {
        if (typeof options === 'object') {
          if (options.mime) {
            mimeType = options.mime;
          } else {
            mimeType = contentType(fileName) || 'application/octet-stream';
          }
          if (options.fileSize) {
            totalSize = options.fileSize;
          }
          if (options.lastModified) {
            lastModified = options.lastModified;
          } else {
            const stat = fs.statSync(path);
            totalSize = stat.size;
            isDir = stat.isDirectory();
            lastModified = stat.mtime.toUTCString();
          }
        } else {
          mimeType = contentType(fileName) || 'application/octet-stream';
          const stat = fs.statSync(path);
          totalSize = stat.size;
          isDir = stat.isDirectory();
          lastModified = stat.mtime.toUTCString();
        }

        if (isDir) {
          this.status(404).end();

          return;
        }

        if (totalSize !== -1 && totalSize <= this.maxReadFileSize) {
          const fileBuffer = fs.readFileSync(path);

          if (!ct) {
            this.set('Content-Type', mimeType);
            this.set('Last-Modified', lastModified);
            this.set(
              'Cache-Control',
              options && typeof options === 'object' && options.maxAge
                ? `public, max-age=${options.maxAge}`
                : 'no-cache, no-store, must-revalidate'
            );
          }

          this.end(fileBuffer);

          return;
        }

        const stream = createReadStream(path);

        this[READ_STREAM] = stream;

        this.attachAbortHandler(true);

        if (!ct) this[WRITE_HEADER]('Content-Type', mimeType);
        else this[WRITE_HEADER]('Content-Disposition', ct as string);

        /**
         * This code was taken from uWebSockets.js examples
         *
         * @see https://github.com/uNetworking/uWebSockets.js/blob/master/examples/VideoStreamer.js
         */
        stream
          .on('data', (chunk: Buffer) => {
            /* We only take standard V8 units of data */
            const ab = toArrayBuffer(chunk);

            /* Store where we are, globally, in our response */
            const lastOffset = this[GET_WRITE_OFFSET]();

            /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
            const [ok, done] = this[TRY_END](ab, totalSize);

            /* Did we successfully send last chunk? */
            if (done) {
              if (this.originalRes.id === -1) {
                this.debug.error(
                  'ERROR! onAbortedOrFinishedResponse called twice for the same res!'
                );
              } else {
                stream.destroy();
              }

              /* Mark this response already accounted for */
              this.originalRes.id = -1;
            } else if (!ok) {
              /* If we could not send this chunk, pause */
              stream.pause();

              /* Save unsent chunk for when we can send it */
              this.originalRes.ab = ab;
              this.originalRes.ab.abOffset = lastOffset;

              /* Register async handlers for drainage */
              this[ON_WRITABLE]((offset) => {
                /* Here the timeout is off, we can spend as much time before calling tryEnd we want to */

                /* On failure the timeout will start */
                const [ok, done] = this[TRY_END](
                  this.originalRes.ab.slice(offset - this.originalRes.abOffset),
                  totalSize
                );

                if (done) {
                  if (this.originalRes.id === -1) {
                    this.debug.error(
                      'ERROR! onAbortedOrFinishedResponse called twice for the same res!'
                    );
                  } else {
                    stream.destroy();
                  }

                  /* Mark this response already accounted for */
                  this.originalRes.id = -1;
                } else if (ok) {
                  /* We sent a chunk and it was not the last one, so let's resume reading.
                   * Timeout is still disabled, so we can spend any amount of time waiting
                   * for more chunks to send. */
                  stream.resume();
                }

                /* We always have to return true/false in onWritable.
                 * If you did not send anything, return true for success. */
                return ok;
              });
            }
          })
          .on('error', (err) => {
            this.debug.trace(err);
            this.status(404);
            this[END]();
          });

        return;
      } catch (err) {
        this.debug.trace(err);
        this.status(404);
        this.end();
        return;
      }
    }

    this.debug.trace('Invalid agurments', arguments);

    this.status(404);
    this.end();
  }

  public cookie(name: string, val: any, options?: CookieOptions): this {
    const opts: CookieOptions = typeof options === 'object' ? options : {};

    const str = typeof val === 'object' ? `j:${JSON.stringify(val)}` : `${val}`;

    if (opts.maxAge) {
      opts.expires = new Date(Date.now() + opts.maxAge);
      opts.maxAge /= 1000;
    }

    if (opts.path == null) {
      opts.path = '/';
    }

    this.set('set-cookie', serialize(name, str, opts));

    return this;
  }

  public download(path: string, fileName?: string, options = {}): void {
    this.setHeader(
      'Content-Disposition',
      contentDisposition(path || fileName)
    ).sendFile(path);
  }

  public render(view: string, options?: any, callback?: any): void {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
      cb = options;
      opts = {};
    }

    if (!cb) {
      // eslint-disable-next-line consistent-return
      cb = (err: Error, html: string): void => {
        if (err) {
          this.debug.trace(err);
          if (err instanceof ReferenceError) {
            this.status(404);
            return this.send(
              toHtml(
                `${err.stack
                  ?.toString()
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')}`
              )
            );
          }
          return this.status(500).json(err);
        }

        this.set('Content-Type', CONTENT_TYPE.HTML).end(html);
      };
    }

    const { render } = this[FROM_APP];

    if (!render) {
      this.status(500).end('Missing view render method');
      return;
    }

    render(view, opts, cb);
  }

  public end(body: RecognizedString = '', hasAsync?: boolean) {
    if (hasAsync || this[HAS_ASYNC]) {
      if (!this.originalRes.aborted)
        this[CORK](() => {
          this.setHeaderAndStatusByNativeMethod();
          this[END](body);
        });
      return;
    }

    this.setHeaderAndStatusByNativeMethod();
    this[END](body);
  }
}

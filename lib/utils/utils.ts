/* eslint-disable prefer-rest-params */
import contentType from 'content-type';
import chalk from 'chalk';
import { HttpResponse } from 'uWebSockets.js';
import { ILogger } from '../Logger';
import { ParametersMap } from '../Request';

export const charsetRegExp = /;\s*charset\s*=/;

export const setCharset = function setCharset(type: any, charset: any) {
  if (!type || !charset) {
    return type;
  }

  // parse type
  const parsed = contentType.parse(type);

  // set charset
  parsed.parameters.charset = charset;

  // format type
  return contentType.format(parsed);
};

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
const ARGUMENT_NAMES = /([^\s,]+)/g;

export const getParamNames = (func: (...args: any) => any) => {
  const fnStr = func.toString().replace(STRIP_COMMENTS, '');

  let result = fnStr
    .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
    .match(ARGUMENT_NAMES);

  if (result === null) result = [];
  return result;
};

export const toHtml = (str: string, title = 'Error') =>
  `<!DOCTYPE html>
  <html lang="en">
  
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
  </head>
  
  <body>
    <pre>${str}</pre>
  </body>
  
  </html>`;

export const notFoundHtml = (method: string, path: string): string =>
  toHtml(`Cannot ${method.toUpperCase()} ${path}`, 'Not found');

export const extractParamsPath = (
  path: string
): { parametersMap: ParametersMap; path: string; basePath: string } =>
  path === '/'
    ? {
        path: '/',
        parametersMap: [],
        basePath: '',
      }
    : path.split('/').reduce(
        (acc, cur) => {
          if (
            (cur.indexOf('*') > 0 ||
              (cur.indexOf('*') === 0 && cur.length > 1)) &&
            cur.indexOf(':') === -1
          )
            // eslint-disable-next-line no-param-reassign
            cur = `:value${acc.parametersMap.length + 1 || 1}`;

          if (cur.indexOf(':') !== -1) {
            const paramPart = cur.split(':');
            acc.basePath += `/:value${acc.parametersMap.length + 1 || 1}`;

            acc.parametersMap.push(paramPart[paramPart.length - 1]);

            acc.path += `/:${paramPart[paramPart.length - 1]}`;

            return acc;
          }

          if (cur) {
            acc.path += `/${cur}`;
            acc.basePath += `/${cur}`;
          }
          return acc;
        },
        {
          parametersMap: [],
          path: '',
          basePath: '',
        } as {
          parametersMap: ParametersMap;
          path: string;
          basePath: string;
        }
      );

export const readBody = (res: HttpResponse, cb: (raw: Buffer) => void) => {
  let buffer: Buffer;
  /* Register data cb */
  res.onData((ab, isLast) => {
    const chunk = Buffer.from(ab);
    if (isLast) {
      if (buffer) {
        cb(Buffer.concat([buffer, chunk]));
      } else {
        cb(chunk);
      }
    } else {
      buffer = buffer ? Buffer.concat([buffer, chunk]) : Buffer.concat([chunk]);
    }
  });
};

export const colorConsole = {
  error() {
    // eslint-disable-next-line no-console
    return console.error(chalk.red(...(arguments as any)));
  },
  log() {
    // eslint-disable-next-line no-console
    return console.log(chalk.green(...(arguments as any)));
  },
  info() {
    // eslint-disable-next-line no-console
    return console.info(chalk.blue(...(arguments as any)));
  },
  warn() {
    // eslint-disable-next-line no-console
    return console.warn(chalk.yellow(...(arguments as any)));
  },
  trace() {
    // eslint-disable-next-line no-console
    return console.trace(chalk.grey(...(arguments as any)));
  },
};

export const hasAsync = (logger: ILogger, es5 = true) => {
  const hasLogged = false;

  return (fn: (...args: any) => any): boolean => {
    if (fn.constructor.name === 'AsyncFunction') return true;

    if (!es5) return false;

    const str = fn.toString();

    if (!str) {
      if (!hasLogged)
        logger.warn(
          "You are using bytenodes build which does not allow function.toString() to check whether the ES5 function has __generator / __awaiter (that's how typescript compiled AsyncFunction to ES5). All middlewares will be treated as AsyncFunction"
        );
      return true;
    }

    return (
      str.indexOf('__generator(') !== -1 && str.indexOf('__awaiter(') !== -1
    );
  };
};

/**
 * This code was taken from uWebSockets.js examples
 *
 * @see https://github.com/uNetworking/uWebSockets.js/blob/master/examples/VideoStreamer.js
 * @param buffer
 */
export const toArrayBuffer = (buffer: Buffer): ArrayBuffer =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

import {
  App as uWS,
  SSLApp as uWSSSl,
  TemplatedApp,
  AppOptions,
} from 'uWebSockets.js';
import Request, { ParametersMap } from './Request';
import Response from './Response';
import Router, { IPrefixedRoutes, IPrefixedRoutesSettings } from './Route';
import {
  TMiddleware,
  TMiddlewareErrorHandler,
  NextFunction,
} from './Middleware';
import { HttpMethod } from './utils/type';
import { getParamNames, toHtml, readBody, hasAsync as checkHasAsync, notFoundHtml, extractParamsPath } from './utils/utils';
import {
  bodyParser,
  multipartParser,
  IMultipartParserOptions,
} from './utils/middlewares';
import { ILogger } from './Logger';
import {
  PREFIXED_ROUTE,
  FROM_RES,
  GET_REMOTE_ADDR,
  GET_PROXIED_ADDR,
  FROM_REQ,
} from './utils/symbol';

export interface CoreApplicationOptions {
  /**
   * Enable default body parser includes json, raw, text, x-www-form-urlencoded, and multipart parser on POST/PATCH/PUT method
   *
   * If `true` enable both bodyParser and multipartParser
   *
   * @default true
   */
  useDefaultParser?:
    | boolean
    | {
        /**
         * Parse json, raw, text, x-www-form-urlencoded
         */
        bodyParser?: boolean;

        /**
         * Parse multipart/
         */
        multipartParser?: IMultipartParserOptions;

        /**
         * Add method to parse cookie from req.headers.cookie into getter method req.cookies()
         */
        cookieParser?: boolean;
      };

  /**
   * Set default uWS app options
   */
  uWSConfigurations?: AppOptions;

  /**
   * Set logging options
   */
  logger?: ILogger;
}

export default class App {
  private appOptions: CoreApplicationOptions = {};

  private logger: ILogger;

  private app?: TemplatedApp;

  private globalMiddlewares: TMiddleware[] = [];

  private errorMiddlewares: TMiddlewareErrorHandler[] = [];

  private checkHasAsync: (middleware: TMiddleware) => boolean;

  private routeMethods: Map<
    string,
    {
      method: HttpMethod;
      middlewares: TMiddleware[];
      originPath: string;
      parametersMap: ParametersMap[];
      hasAsync?: boolean;
    }
  > = new Map();

  constructor(options: CoreApplicationOptions) {
    this.appOptions = options || {
      useDefaultParser: true,
    };

    if (!this.appOptions.useDefaultParser) {
      this.appOptions.useDefaultParser = true;
    }

    this.logger = options.logger as ILogger;

    this.checkHasAsync = checkHasAsync(this.logger);
  }

  use(path: string, router: Router): this;
  use(path: string, router: IPrefixedRoutes): this;
  use(
    middleware: (req: Request, res: Response, next: NextFunction) => void
  ): this;
  use(middleware: TMiddlewareErrorHandler): this;
  use(
    pathOrMiddleware: any,
    router?:
      | Router
      | (IPrefixedRoutes & IPrefixedRoutesSettings)
      | IPrefixedRoutes
  ): this {
    if (typeof pathOrMiddleware === 'string') {
      if (!Router) throw new TypeError('app.use(path, router) missing Router');

      if (router instanceof Router) {
        if (router.prefixRoutes) {
          // Merge root path and router-set path
          const mdw = router.prefixRoutes;

          const mergedPath = pathOrMiddleware + mdw.prefix;

          mdw.handlers.forEach((v, k) => {
            this.add(k, mergedPath, v);
          });

          return this;
        }

        router.handlers.forEach((v, k) => {
          this.add(v.method, `${pathOrMiddleware}${k}`, v.middlewares);
        });
        return this;
      }

      if ((router as any)[PREFIXED_ROUTE]) {
        // Merge root path and router-set path
        const mergedPath =
          pathOrMiddleware + (router as IPrefixedRoutesSettings).prefix;

        (router as IPrefixedRoutesSettings).handlers.forEach((v, k) => {
          this.add(k, mergedPath, v);
        });

        return this;
      }
    }

    if (getParamNames(pathOrMiddleware as any).length === 4) {
      this.errorMiddlewares.push(pathOrMiddleware as TMiddlewareErrorHandler);
    } else this.globalMiddlewares.push(pathOrMiddleware as TMiddleware);

    return this;
  }

  get(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.GET, path, middlewares);
  }

  post(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.POST, path, middlewares);
  }

  put(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.PUT, path, middlewares);
  }

  patch(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.PATCH, path, middlewares);
  }

  del(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.DEL, path, middlewares);
  }

  trace(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.TRACE, path, middlewares);
  }

  head(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.HEAD, path, middlewares);
  }

  options(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.OPTIONS, path, middlewares);
  }

  connect(path: string, ...middlewares: TMiddleware[]): this {
    return this.add(HttpMethod.CONNECT, path, middlewares);
  }

  private add(
    method: HttpMethod,
    path: string,
    middlewares: TMiddleware[]
  ): this {
    const { path: cleanedPath, parametersMap } = extractParamsPath(path);

    this.routeMethods.set(cleanedPath, {
      method,
      middlewares,
      originPath: path,
      parametersMap,
      hasAsync: middlewares.some(this.checkHasAsync),
    });
    return this;
  }

  public listen(): void {
    this.initUWS();
    this.initRoutes();

    if (!this.app) {
      throw new Error("Couldn't find uWS instance");
    }

    this.app.listen(3040, () => {
      console.log('on 3040');
    });
  }

  private initUWS(): void {
    if (this.appOptions?.uWSConfigurations) {
      this.app = uWSSSl(this.appOptions?.uWSConfigurations);
    } else {
      this.app = uWS();
    }
  }

  private initRoutes(): void {
    if (!this.app) {
      throw new Error("Couldn't find uWS instance");
    }

    const globalAsync = this.globalMiddlewares.some(this.checkHasAsync);

    // Push default ErrorMiddleware
    this.errorMiddlewares.push((err, req, res) => {
      res.status(500);

      if (err instanceof Error) {
        const message = `${err.stack}`;
        res.send(toHtml(message));
      }
      if (typeof err === 'string') {
        res.send(toHtml(err));
      }
    });

    let hasAnyMethodOnAll = false;

    const { useDefaultParser } = this.appOptions;

    const useDefaultCookieParser =
      (typeof useDefaultParser === 'boolean' && useDefaultParser) ||
      (typeof useDefaultParser === 'object' && useDefaultParser.cookieParser);

    this.routeMethods.forEach((v, k) => {
      const { method, middlewares, hasAsync, parametersMap } = v;

      if (!hasAnyMethodOnAll && method === HttpMethod.ANY && k === '/*') {
        hasAnyMethodOnAll = true;
      }

      const mergedMiddlewares = [...this.globalMiddlewares, ...middlewares];

      if (!this.app) {
        throw new Error("Couldn't find uWS instance");
      }

      if (
        method === HttpMethod.PATCH ||
        method === HttpMethod.PUT ||
        method === HttpMethod.POST
      ) {
        if (useDefaultParser) {
          if (typeof useDefaultParser === 'object') {
            if (useDefaultParser.multipartParser)
              mergedMiddlewares.unshift(bodyParser);

            if (useDefaultParser.bodyParser)
              mergedMiddlewares.unshift(bodyParser);
          } else {
            mergedMiddlewares.unshift(multipartParser);
            mergedMiddlewares.unshift(bodyParser);
          }
        }
        this.app[method](k, (_res, _req) => {
          const req = new Request(_req, {
            paramsMap: parametersMap,
            // forceInit: true,
            forceInit: true,
            cookieParser: useDefaultCookieParser,
          });

          const res = new Response(_res, { hasAsync: true }, this.logger);

          req[FROM_RES] = {
            getProxiedRemoteAddressAsText: res[GET_PROXIED_ADDR],
            getRemoteAddressAsText: res[GET_REMOTE_ADDR],
          };

          res[FROM_REQ] = {
            get: req.get,
          };

          readBody(res.originalRes, (raw) => {
            req.raw = raw;
            mergedMiddlewares[0](
              req,
              res,
              this.nextHandler(1, req, res, mergedMiddlewares)
            );
          });
        });
      } else {
        this.app[method](k, (_res, _req) => {
          const res = new Response(
            _res,
            {
              hasAsync: globalAsync || hasAsync,
            },
            this.logger
          );
          const req = new Request(_req, {
            paramsMap: parametersMap,
            cookieParser: useDefaultCookieParser,
          });

          req[FROM_RES] = {
            getProxiedRemoteAddressAsText: res[GET_PROXIED_ADDR],
            getRemoteAddressAsText: res[GET_REMOTE_ADDR],
          };

          res[FROM_REQ] = {
            get: req.get,
          };

          mergedMiddlewares[0](
            req,
            res,
            this.nextHandler(1, req, res, mergedMiddlewares)
          );
        });
      }
    });

    if (!hasAnyMethodOnAll) {
      this.app.any('/*', (res, req) => {
        res.writeStatus('404');
        res.writeHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(notFoundHtml(req.getMethod(), req.getUrl()));
      });
    }
  }

  private nextHandler(
    nextIdx: number,
    req: Request,
    res: Response,
    middlewares: TMiddleware[] | TMiddlewareErrorHandler[],
    errorIdx: number = 0
  ): (error?: any) => void {
    return (error) => {
      if (error) {
        if (errorIdx >= middlewares.length) return;
        this.errorMiddlewares[errorIdx](
          error,
          req,
          res,
          this.nextHandler(-1, req, res, this.errorMiddlewares, errorIdx + 1)
        );

        return;
      }

      if (nextIdx >= middlewares.length) return;

      (middlewares as TMiddleware[])[nextIdx](
        req,
        res,
        this.nextHandler(nextIdx + 1, req, res, middlewares)
      );
    };
  }
}

import {
  App as uWS,
  SSLApp as uWSSSl,
  TemplatedApp,
  AppOptions,
  RecognizedString,
  us_listen_socket,
  ListenOptions,
  us_listen_socket_close,
} from 'uWebSockets.js';
import pathMethod from 'path';
import fs from 'fs';
import Request from './Request';
import Response from './Response';
import {
  TMiddleware,
  TMiddlewareErrorHandler,
  NextFunction,
  bodyParser,
  multipartParser,
  IMultipartParserOptions,
  notFoundMiddleware,
  errorMiddleware,
} from './middlewares';
import { HttpMethod } from './utils/types';
import {
  getParamNames,
  readBody,
  hasAsync as checkHasAsync,
  extractParamsPath,
} from './utils/utils';
import { ILogger } from './Logger';
import {
  FROM_RES,
  GET_REMOTE_ADDR,
  GET_PROXIED_ADDR,
  FROM_REQ,
  FROM_APP,
} from './utils/symbol';
import {
  AbstractRoutingParser,
  BaseRouter,
  IRouteHandler,
  IUWSRouting,
  TUWSHandlers,
  PrefixRouter,
  IGetRouteHandlers,
  TDefaultRoutingFn,
  DefaultRouter,
  IUWSPublish,
} from './router';

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
  logger: ILogger;

  /**
   * Attach abort handler to all router if forceAsync is true
   *
   * Should be `true` when using with NestJS
   * @default false
   */
  forceAsync?: boolean;

  /**
   * Return appication/json on default middleware
   *
   * @default false
   */
  preferJSON?: boolean;
}

export default class App
  extends AbstractRoutingParser<IRouteHandler, TDefaultRoutingFn>
  implements IUWSRouting, IUWSPublish {
  #appOptions: CoreApplicationOptions;

  #logger: ILogger;

  #app?: TemplatedApp;

  #token?: us_listen_socket;

  #globalMiddlewares: TMiddleware[] = [];

  #errorMiddlewares: TMiddlewareErrorHandler[] = [];

  #checkHasAsync: (middleware: TMiddleware) => boolean;

  #renderMethod?: ((...args: any) => string) | null = null;

  #compileMethod: ((...args: any) => (...arg: any) => string) | null = null;

  #compiledViewCaches: Record<string, (...args: any) => string> = {};

  #viewDir?: string;

  #extName?: string;

  #nativeHandlers?: TUWSHandlers;

  constructor(options: CoreApplicationOptions) {
    super();
    this.#appOptions = options;

    if (!this.#appOptions.useDefaultParser) {
      this.#appOptions.useDefaultParser = true;
    }

    this.#logger = options.logger as ILogger;

    this.#checkHasAsync = checkHasAsync(this.#logger);
  }

  /**
   * @override
   * @param method
   * @param path
   * @param middlewares
   * @param baseUrl
   */
  protected add(method: HttpMethod, args: unknown[]): this {
    const [path, ...middlewares] = args as [string, TMiddleware];
    const { path: cleanedPath, parametersMap, basePath } = extractParamsPath(
      path.startsWith('/') ? path : `/${path}`
    );

    const exist = this.routeHandlers.get(method + basePath);

    if (exist)
      this.#logger.warn(
        `There's already a route handler for ${method.toUpperCase()} ${cleanedPath} (original path: ${
          exist.originPath
        }), the existed one will be overrided!`
      );

    this.routeHandlers.set(method + basePath, {
      method,
      middlewares,
      originPath: path,
      parametersMap,
      hasAsync: middlewares.some(this.#checkHasAsync),
      path: cleanedPath,
      // baseUrl,
    });

    this.#logger.info(
      'Map',
      method.toUpperCase(),
      path,
      '=>',
      method.toUpperCase(),
      cleanedPath
    );
    return this;
  }

  useNativeHandlers(fn: TUWSHandlers): void {
    this.#nativeHandlers = fn;
  }

  publish(
    topic: RecognizedString,
    message: RecognizedString,
    isBinary?: boolean,
    compress?: boolean
  ): void {
    this.#app?.publish(topic, message, isBinary, compress);
  }

  use(path: string, router: IGetRouteHandlers): this;
  use(
    middleware: (req: Request, res: Response, next: NextFunction) => void
  ): this;
  use(middleware: TMiddlewareErrorHandler): this;
  use(pathOrMiddleware: any, router?: IGetRouteHandlers): this {
    if (typeof pathOrMiddleware === 'string') {
      if (!router) throw new TypeError('app.use(path, router) missing Router');

      if (!(router instanceof BaseRouter)) {
        throw new TypeError(
          'Router must be an instance of AbstractRoutingParser'
        );
      }

      if (router instanceof DefaultRouter) {
        // check for PrefixRouter ins BaseRouter
        const prefixRouter = router.getPrefixRouter();

        if (prefixRouter && prefixRouter instanceof PrefixRouter)
          prefixRouter
            .getRouteHandlers()
            .forEach(({ method, middlewares, path }) => {
              this.add(method, [
                `${pathOrMiddleware}/${path}`,
                middlewares,
                pathOrMiddleware,
              ]);
            });
      }

      const handlers = router.getRouteHandlers();
      handlers.forEach(({ method, middlewares, path }) => {
        this.add(method, [
          `${pathOrMiddleware}/${path}`,
          middlewares,
          pathOrMiddleware,
        ]);
      });

      return this;
    }

    if (getParamNames(pathOrMiddleware as any).length === 4) {
      this.#errorMiddlewares.push(pathOrMiddleware as TMiddlewareErrorHandler);
    } else this.#globalMiddlewares.push(pathOrMiddleware as TMiddleware);

    return this;
  }

  listen(
    host: RecognizedString,
    port: number,
    cb?: (listenSocket: us_listen_socket) => void
  ): void;
  listen(port: number, cb?: (listenSocket: us_listen_socket) => void): void;
  listen(
    port: number,
    options: ListenOptions,
    cb?: (listenSocket: us_listen_socket | false) => void
  ): void;
  public listen(...args: any[]): void {
    this.initUWS();
    this.initRoutes();

    const argsCt = [...args];
    const givenLength = argsCt.length;
    if (!this.#app) {
      throw new Error("Couldn't find uWS instance");
    }

    if (
      givenLength < 3 &&
      argsCt[givenLength - 1].constructor.name !== 'Function'
    ) {
      argsCt[givenLength] = (token: us_listen_socket) => {
        this.#token = token;
        this.#logger.print!(
          'Listening on',
          args[0],
          givenLength === 2 ? argsCt[1] : '',
          '...'
        );
      };
    }
    (this.#app as any).listen(...argsCt);
  }

  private initUWS(): void {
    if (this.#appOptions?.uWSConfigurations) {
      this.#app = uWSSSl(this.#appOptions?.uWSConfigurations);
    } else {
      this.#app = uWS();
    }
  }

  private initRoutes(): void {
    if (!this.#app) {
      throw new Error("Couldn't find uWS instance");
    }

    if (this.#nativeHandlers) {
      this.#logger.warn('All uWS native handlers will be mounted first');
      this.#nativeHandlers(this.#app);
    }

    const globalAsync =
      this.#appOptions.forceAsync ||
      this.#globalMiddlewares.some(this.#checkHasAsync);

    // Push default ErrorMiddleware
    this.#errorMiddlewares.push(
      errorMiddleware({
        logMethod: 'error',
        logger: this.#logger,
        preferJSON: !!this.#appOptions.preferJSON,
      })
    );

    let hasAnyMethodOnAll = false;

    const { useDefaultParser } = this.#appOptions;

    const useDefaultCookieParser =
      (typeof useDefaultParser === 'boolean' && useDefaultParser) ||
      (typeof useDefaultParser === 'object' && useDefaultParser.cookieParser);

    this.routeHandlers.forEach((v) => {
      const { method, middlewares, hasAsync, parametersMap, path, baseUrl } = v;

      if (!hasAnyMethodOnAll && method === HttpMethod.ANY && path === '/*') {
        hasAnyMethodOnAll = true;
      }

      const mergedMiddlewares = [...this.#globalMiddlewares, ...middlewares];

      if (!this.#app) {
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
        this.#app[method](path, (_res, _req) => {
          const req = new Request(_req, {
            paramsMap: parametersMap,
            forceInit: true,
            cookieParser: useDefaultCookieParser,
            baseUrl,
          });

          const res = new Response(_res, { hasAsync: true }, this.#logger);

          req[FROM_RES] = {
            getProxiedRemoteAddressAsText: res[GET_PROXIED_ADDR],
            getRemoteAddressAsText: res[GET_REMOTE_ADDR],
          };

          res[FROM_APP] = {
            render: this.render.bind(this),
          };

          readBody(res.originalRes, (raw) => {
            req.raw = raw.byteLength === 0 ? undefined : raw;
            mergedMiddlewares[0](
              req,
              res,
              this.nextHandler(1, req, res, mergedMiddlewares)
            );
          });
        });
      } else {
        this.#app[method](path, (_res, _req) => {
          const res = new Response(
            _res,
            {
              hasAsync: globalAsync || hasAsync,
            },
            this.#logger
          );
          const req = new Request(_req, {
            paramsMap: parametersMap,
            cookieParser: useDefaultCookieParser,
            baseUrl,
            forceInit: globalAsync || hasAsync || undefined,
          });

          req[FROM_RES] = {
            getProxiedRemoteAddressAsText: res[GET_PROXIED_ADDR],
            getRemoteAddressAsText: res[GET_REMOTE_ADDR],
          };

          res[FROM_REQ] = {
            get: req.get.bind(req),
          };

          res[FROM_APP] = {
            render: this.render.bind(this),
          };

          mergedMiddlewares[0](
            req,
            res,
            this.nextHandler(1, req, res, mergedMiddlewares)
          );
        });
      }
    });

    // Add not found handler
    if (!hasAnyMethodOnAll) {
      const notFoundMiddlewares: TMiddleware[] = [
        ...this.#globalMiddlewares,
        notFoundMiddleware({
          logMethod: 'info',
          logger: this.#logger,
          preferJSON: !!this.#appOptions.preferJSON,
        }),
      ];

      this.#app.any('/*', (_res, _req) => {
        const res = new Response(
          _res,
          {
            hasAsync: globalAsync,
          },
          this.#logger
        );
        const req = new Request(_req, {
          paramsMap: [],
          // baseUrl,
        });
        // const req = _req as any;
        req[FROM_RES] = {
          getProxiedRemoteAddressAsText: res[GET_PROXIED_ADDR],
          getRemoteAddressAsText: res[GET_REMOTE_ADDR],
        };

        notFoundMiddlewares[0](
          req,
          res,
          this.nextHandler(1, req, res, notFoundMiddlewares)
        );
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
        this.#errorMiddlewares[errorIdx](
          error,
          req,
          res,
          this.nextHandler(-1, req, res, this.#errorMiddlewares, errorIdx + 1)
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

  private render(
    name: string,
    options: Record<string, any> | null,
    callback: (err: Error | null, html?: string) => void
  ): any {
    if (!this.#viewDir) {
      this.#logger.warn(
        'No default view directory or renderMethod or compileMethod was found. Please configurate via app.setView(path, engineOptions)'
      );
      return callback(
        new Error("Something went wrong with the server's configurations")
      );
    }

    const viewFile = pathMethod.join(this.#viewDir, name + this.#extName);

    if (this.#compileMethod) {
      const cacheView = this.#compiledViewCaches[name];
      if (cacheView) {
        try {
          const html = cacheView(options);
          return callback(null, html);
        } catch (err) {
          return callback(err);
        }
      }

      try {
        // Read file from disk
        const fileContent = fs.readFileSync(viewFile, 'utf-8');
        const compiled = this.#compileMethod(fileContent, options);
        this.#compiledViewCaches[name] = compiled;
        return callback(null, compiled(options));
      } catch (err) {
        return callback(err);
      }
    }

    // Handle renderMethod()
    if (this.#renderMethod) {
      return this.#renderMethod(viewFile, options, callback);
    }

    this.#logger.warn(
      'No default renderMethod or compileMethod was found. Please set up via app.setView(path, engineOptions)'
    );
    return callback(
      new Error("Something went wrong with the server's configurations")
    );
  }

  /**
   * Set View folder and render method from engine
   * @param viewPath
   * @param renderMethod
   */
  public setView(
    viewPath: string,
    engine: {
      renderMethod: (...args: any) => any;
      async?: boolean;
      extName: string;
    }
  ): this;
  public setView(
    viewPath: string,
    engine: {
      compileMethod: (...args: any) => any;
      extName: string;
    }
  ): this;
  public setView(
    viewPath: string,
    engine: {
      compileMethod?: (...args: any) => any;
      renderMethod?: (...args: any) => any;
      async?: boolean;
      extName: string;
    }
  ): this {
    if (typeof viewPath !== 'string')
      throw new TypeError('path must be a string');

    this.#viewDir = viewPath;

    if (typeof engine !== 'object') throw new TypeError('Missing engine');

    const { renderMethod, compileMethod, extName } = engine;

    if (!extName) {
      throw new TypeError('extName must be a string');
    }

    this.#extName = extName.startsWith('.') ? extName : `.${extName}`;

    if (renderMethod) {
      if (renderMethod.constructor.name !== 'Function')
        throw new TypeError('renderMethod must be a function');

      this.#renderMethod = renderMethod;
      return this;
    }

    if (compileMethod) {
      if (compileMethod.constructor.name !== 'Function')
        throw new TypeError('renderMethod must be a function');

      this.#compileMethod = compileMethod;
      return this;
    }

    throw new TypeError(
      'Neither renderMethod nor compileMethod has been given'
    );
  }

  public config(options: CoreApplicationOptions): this {
    if (!this.#appOptions) {
      this.#appOptions = options;
      return this;
    }

    this.#appOptions = { ...this.#appOptions, ...options };
    return this;
  }

  public close(): void {
    if (!this.#app) {
      throw new Error("uWS App hasn't been instanciated");
    }
    us_listen_socket_close(this.#token!);
    this.#logger.print!('Thanks for using the app');
  }
}

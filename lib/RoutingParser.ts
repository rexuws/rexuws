import { TemplatedApp } from 'uWebSockets.js';
import { HttpMethod } from './utils/types';
import { TMiddleware } from './middlewares';
import { ParametersMap } from './Request';
import { ILogger } from './Logger';
import { extractParamsPath } from './utils';

export const LAZY_ASYNC_CHECKER: unique symbol = Symbol('Route/checkHasAsync');

export interface IRouting {
  get(path: string, ...middlewares: TMiddleware[]): this;
  post(path: string, ...middlewares: TMiddleware[]): this;
  put(path: string, ...middlewares: TMiddleware[]): this;
  patch(path: string, ...middlewares: TMiddleware[]): this;
  del(path: string, ...middlewares: TMiddleware[]): this;
  trace(path: string, ...middlewares: TMiddleware[]): this;
  head(path: string, ...middlewares: TMiddleware[]): this;
  options(path: string, ...middlewares: TMiddleware[]): this;
  connect(path: string, ...middlewares: TMiddleware[]): this;

  useNativeHandlers(fn: (app: TemplatedApp) => void): this;

  getRouteMethods(): Map<
    string,
    {
      method: HttpMethod;
      middlewares: TMiddleware[];
      originPath: string;
      parametersMap: ParametersMap;
      hasAsync?: boolean | symbol;
      path: string;
      baseUrl?: string;
    }
  >;
}
export default abstract class AbstractRoutingParser implements IRouting {
  private _logger: ILogger;

  private _lazy = false;

  protected abstract checkHasAsync(middleware: TMiddleware): boolean;

  protected setNativeHandlersToApp?: (app: TemplatedApp) => void;

  protected routeMethods: Map<
    string,
    {
      method: HttpMethod;
      middlewares: TMiddleware[];
      originPath: string;
      parametersMap: ParametersMap;
      hasAsync?: boolean | symbol;
      path: string;
      baseUrl?: string;
    }
  > = new Map();

  constructor(logger: ILogger, lazy?: boolean) {
    if (lazy) {
      this._lazy = true;
    }
    this._logger = logger;
  }

  protected add(
    method: HttpMethod,
    path: string,
    middlewares: TMiddleware[],
    baseUrl?: string
  ): this {
    const { path: cleanedPath, parametersMap, basePath } = extractParamsPath(
      path.startsWith('/') ? path : `/${path}`
    );

    const exist = this.routeMethods.get(method + basePath);
    if (exist)
      this._logger.warn(
        `There's already a route handler for ${method.toUpperCase()} ${cleanedPath} (original path: ${
          exist.originPath
        }), the existed one will be overrided!`
      );
    this.routeMethods.set(method + basePath, {
      method,
      middlewares,
      originPath: path,
      parametersMap,
      hasAsync: this._lazy
        ? LAZY_ASYNC_CHECKER
        : middlewares.some(this.checkHasAsync),
      path: cleanedPath,
      baseUrl,
    });
    this._logger.info(
      'Map',
      method.toUpperCase(),
      path,
      '=>',
      method.toUpperCase(),
      cleanedPath
    );
    return this;
  }

  public useNativeHandlers(fn: (uws: TemplatedApp) => void): this {
    this.setNativeHandlersToApp = fn;
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

  getRouteMethods(): Map<
    string,
    {
      method: HttpMethod;
      middlewares: TMiddleware[];
      originPath: string;
      parametersMap: ParametersMap;
      hasAsync?: boolean | symbol;
      path: string;
      baseUrl?: string;
    }
  > {
    return this.routeMethods;
  }
}

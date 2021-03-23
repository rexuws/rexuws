import { HttpMethod } from '../../utils/types';
import { TMiddleware } from '../../middlewares';
import { IRouting, IRouteBaseHandler, Ctor } from './types';

/**
 * @abstract
 * Compatible layer to map user defined http endpoint to uWebSockets.js
 */
export default abstract class AbstractRoutingParser<
  T extends IRouteBaseHandler = IRouteBaseHandler,
  U extends Ctor = Ctor
> implements IRouting<U> {
  /**
   * A single store consists of method,path, middlewares
   */
  protected routeHandlers: Map<string, T> = new Map();

  /**
   * An abstract method to describe how arguments in http method gets stored into `routeHandlers`
   *
   * In the method's body, use `this.routeHandlers.set(key,routeHandler)` for future usage
   *
   * @param method
   * @param args
   */
  protected abstract add(method: HttpMethod, args: unknown[]): this;

  get(...args: Parameters<U>): this {
    return this.add(HttpMethod.GET, args);
  }

  post(...args: Parameters<U>): this {
    return this.add(HttpMethod.POST, args);
  }

  put(...args: Parameters<U>): this {
    return this.add(HttpMethod.PUT, args);
  }

  patch(...args: Parameters<U>): this {
    return this.add(HttpMethod.PATCH, args);
  }

  del(...args: Parameters<U>): this {
    return this.add(HttpMethod.DEL, args);
  }

  trace(...args: Parameters<U>): this {
    return this.add(HttpMethod.TRACE, args);
  }

  head(...args: Parameters<U>): this {
    return this.add(HttpMethod.HEAD, args);
  }

  options(...args: Parameters<U>): this {
    return this.add(HttpMethod.OPTIONS, args);
  }

  connect(...args: Parameters<U>): this {
    return this.add(HttpMethod.CONNECT, args);
  }

  any(...args: Parameters<U>): this {
    return this.add(HttpMethod.ANY, args);
  }

  all(...args: Parameters<U>): this {
    return this.add(HttpMethod.ANY, args);
  }
}

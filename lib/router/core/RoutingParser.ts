import { HttpMethod } from '../../utils/types';
import { TMiddleware } from '../../middlewares';
import { IRouting, IRouteBaseHandler, Ctor } from './types';

export default abstract class AbstractRoutingParser<
  T extends IRouteBaseHandler = IRouteBaseHandler,
  U extends Ctor = Ctor
> implements IRouting<U> {
  protected routeHandlers: Map<string, T> = new Map();

  protected abstract add(
    method: HttpMethod,
    path: string,
    middlewares: TMiddleware[]
  ): this;

  protected abstract transform(args: unknown[]): [string, TMiddleware[]];

  get(...args: Parameters<U>): this {
    return this.add(HttpMethod.GET, ...this.transform(args));
  }

  post(...args: Parameters<U>): this {
    return this.add(HttpMethod.POST, ...this.transform(args));
  }

  put(...args: Parameters<U>): this {
    return this.add(HttpMethod.PUT, ...this.transform(args));
  }

  patch(...args: Parameters<U>): this {
    return this.add(HttpMethod.PATCH, ...this.transform(args));
  }

  del(...args: Parameters<U>): this {
    return this.add(HttpMethod.DEL, ...this.transform(args));
  }

  trace(...args: Parameters<U>): this {
    return this.add(HttpMethod.TRACE, ...this.transform(args));
  }

  head(...args: Parameters<U>): this {
    return this.add(HttpMethod.HEAD, ...this.transform(args));
  }

  options(...args: Parameters<U>): this {
    return this.add(HttpMethod.OPTIONS, ...this.transform(args));
  }

  connect(...args: Parameters<U>): this {
    return this.add(HttpMethod.CONNECT, ...this.transform(args));
  }
}

import AbstractRoutingParser, { IRouteBaseHandler, Ctor } from '../../core';

import { HttpMethod } from '../../../utils/types';
import { TMiddleware } from '../../../middlewares';
import { IGetRouteHandlers } from '../default';

/**
 * @abstract
 * An abstract class which extends from `AbstractRoutingParser` and implements `IGetRouteHandlers` to
 * allow accessing routeHandlers from outside
 */
export default abstract class BaseRouter<T extends Ctor>
  extends AbstractRoutingParser<IRouteBaseHandler, T>
  implements IGetRouteHandlers {
  protected add(method: HttpMethod, args: unknown[]): this {
    const [path, middlewares] = this.transform(args);
    this.routeHandlers.set(method + path, {
      method,
      middlewares,
      path,
    });
    return this;
  }

  /**
   * Transfrom arguments into [path, middlewares] to fulfill the overrided add() in BaseRouter
   * @param args
   */
  protected abstract transform(args: unknown[]): [string, TMiddleware[]];

  public getRouteHandlers(): Map<string, IRouteBaseHandler> {
    return this.routeHandlers;
  }
}

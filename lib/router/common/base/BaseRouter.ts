import AbstractRoutingParser, { IRouteBaseHandler, Ctor } from '../../core';

import { HttpMethod } from '../../../utils/types';
import { TMiddleware } from '../../../middlewares';
import { IPrefixRouter } from '../prefix';
import { IGetRouteHandlers } from '../default';

export default abstract class BaseRouter<T extends Ctor>
  extends AbstractRoutingParser<IRouteBaseHandler, T>
  implements IGetRouteHandlers {
  public prefixRouter?: IPrefixRouter;

  protected add(
    method: HttpMethod,
    path: string,
    middlewares: TMiddleware[]
  ): this {
    this.routeHandlers.set(method + path, {
      method,
      middlewares,
      path,
    });
    return this;
  }

  public getRouteHandlers(): Map<string, IRouteBaseHandler> {
    return this.routeHandlers;
  }
}

import { IRouteBaseHandler, IRouting } from '../../core';
import { IPrefixRouter } from '../prefix';
import { TMiddleware } from '../../../middlewares';

export interface IGetRouteHandlers<
  T extends IRouteBaseHandler = IRouteBaseHandler
> {
  getRouteHandlers(): Map<string, T>;
}

export type TDefaultRoutingFn = (
  path: string,
  ...middlewares: TMiddleware[]
) => void;

export interface IDefaultRouter extends IRouting<TDefaultRoutingFn> {
  prefixRouter?: IPrefixRouter;
  route(prefix: string): IPrefixRouter;
}

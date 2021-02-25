import { IRouteBaseHandler, IRouting } from '../../core';
import { TMiddleware } from '../../../middlewares';

export interface IPrefixRouteHandler extends IRouteBaseHandler {
  prefix: string;
}

export type TPrefixRouteFn = (...middlewares: TMiddleware[]) => void;

export interface IPrefixRouter extends IRouting<TPrefixRouteFn> {}

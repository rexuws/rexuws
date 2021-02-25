import { TDefaultRoutingFn } from './router.interface';
import { TMiddleware } from '../../../middlewares';
import { PrefixRouter } from '../prefix';
import BaseRouter from '../base';

export default class DefaultRouter extends BaseRouter<TDefaultRoutingFn> {
  public prefixRouter?: PrefixRouter;

  // eslint-disable-next-line class-methods-use-this
  protected transform(args: unknown[]): [string, TMiddleware[]] {
    if (!args || !Array.isArray(args) || args.length < 2)
      throw new TypeError('Invalid routing pattern');

    const [path, ...middlewares] = args;
    return [path as string, middlewares as TMiddleware[]];
  }

  public route(prefix: string): PrefixRouter {
    this.prefixRouter = new PrefixRouter(prefix);
    return this.prefixRouter;
  }
}

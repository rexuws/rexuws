import { TDefaultRoutingFn } from './router.interface';
import { TMiddleware } from '../../../middlewares';
import { PrefixRouter } from '../prefix';
import BaseRouter from '../base';

export default class DefaultRouter extends BaseRouter<TDefaultRoutingFn> {
  private prefixRouter?: PrefixRouter;

  // eslint-disable-next-line class-methods-use-this
  protected transform(args: unknown[]): [string, TMiddleware[]] {
    if (!args || !Array.isArray(args) || args.length < 2)
      throw new TypeError('Invalid routing pattern');

    const [path, ...middlewares] = args;

    if (middlewares.some((e) => typeof e !== 'function'))
      throw new TypeError('Middleware must be a function');
      
    return [path as string, middlewares as TMiddleware[]];
  }

  public route(prefix: string): PrefixRouter {
    if (!prefix) {
      throw new TypeError('Prefix must be a string');
    }
    this.prefixRouter = new PrefixRouter(prefix);
    return this.prefixRouter;
  }

  public getPrefixRouter(): PrefixRouter | undefined {
    return this.prefixRouter;
  }
}

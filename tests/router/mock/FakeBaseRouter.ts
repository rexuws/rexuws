import { BaseRouter } from '../../../lib/router';
import { TMiddleware } from '../../../lib/middlewares';

export default class FakeBaseRouter extends BaseRouter<any> {
  // eslint-disable-next-line class-methods-use-this
  protected transform(args: unknown[]): [string, TMiddleware[]] {
    return ['', [] as any];
  }
}

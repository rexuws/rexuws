/* eslint-disable class-methods-use-this */
import { TMiddleware } from '../../../middlewares';
import { TPrefixRouteFn } from './prefix-router.interface';
import BaseRouter from '../base';

export default class PrefixRouter extends BaseRouter<TPrefixRouteFn> {
  private prefix: string;

  constructor(prefix: string) {
    super();
    this.prefix = prefix;
  }

  protected transform(args: any[]): [string, TMiddleware[]] {
    if (!args || !Array.isArray(args) || args.length < 1)
      throw new TypeError('Invalid router pattern');

    return [this.prefix, args as TMiddleware[]];
  }
}

/* eslint-disable class-methods-use-this */
import { TMiddleware } from '../../../middlewares';
import { TPrefixRouteFn } from './prefix-router.interface';
import BaseRouter from '../base';

export default class PrefixRouter extends BaseRouter<TPrefixRouteFn> {
  private prefix: string;

  constructor(prefix: string) {
    super();
    if (!prefix || typeof prefix !== 'string')
      throw new TypeError('Prefix must be a string');

    this.prefix = prefix;
  }

  protected transform(args: any[]): [string, TMiddleware[]] {
    if (!args || !Array.isArray(args) || args.length < 1)
      throw new TypeError('Invalid router pattern');

    if (args.some((e) => typeof e !== 'function'))
      throw new TypeError('Middleware must be a function');

    return [this.prefix, args as TMiddleware[]];
  }
}

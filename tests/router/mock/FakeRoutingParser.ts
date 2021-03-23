import { AbstractRoutingParser } from '../../../lib/router';
import { HttpMethod } from '../../../lib/utils/types';
import {} from '../../../lib/middlewares';

export default class FakeRoutingParser extends AbstractRoutingParser {
  protected add(method: HttpMethod, args: unknown[]): this {
    return this;
  }
}

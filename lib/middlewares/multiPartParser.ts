import * as uWS from 'uWebSockets.js';
import { HttpMethod, IRequest, IResponse } from '../utils/types';
import { NextFunction } from './types';
import { parse } from './bodyParser';

export interface IMultipartParserOptions {
  /**
   * Only run on spefic routes
   *
   * If `true` parse on all POST/PUT/PATCH request
   */
  allow?:
    | {
        method?: HttpMethod.POST | HttpMethod.PUT | HttpMethod.PATCH;
        path: string;
      }[]
    | true;

  /**
   * Max size to parse
   */
  maxSize?: number;
}

export const multipartParser = (
  req: IRequest,
  res: IResponse,
  next: NextFunction
): void => {
  const ct = req.header('content-type');

  if (!req.raw || !ct) {
    return next();
  }

  if (!ct.startsWith('multipart/')) return next();

  const parsedBody = uWS.getParts(req.raw, ct);

  if (!parsedBody || parsedBody.length === 0) {
    return next();
  }

  try {
    req.body = parsedBody.reduce(
      (acc, cur) => {
        // If have filename => return raw cur
        if (cur.filename) {
          acc[cur.name] = cur;
          return acc;
        }

        if (cur.type) {
          acc[cur.name] = parse(cur.type, Buffer.from(cur.data));

          return acc;
        }
        acc[cur.name] = Buffer.from(cur.data).toString();
        return acc;
      },
      {} as {
        [key: string]: any;
      }
    );

    return next();
  } catch (err) {
    return next(err);
  }
};

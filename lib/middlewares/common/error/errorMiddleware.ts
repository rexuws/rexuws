import { IErrorMiddlewareOptions } from './error-middleware.interfaces';
import { IRequest, IResponse } from '../../../utils/types';
import { NextFunction, TMiddlewareErrorHandler } from '../../core';
import { toHtml } from '../../../utils';

export default function errorMiddleware(
  opts: IErrorMiddlewareOptions
): TMiddlewareErrorHandler {
  const { preferJSON, logger, logMethod } = opts;
  switch (!!preferJSON) {
    case true:
      // return application/json
      return (err: any, req: IRequest, res: IResponse, next: NextFunction) => {
        logger[logMethod](err);
        if (err && typeof err === 'object' && err.constructor === 'Object')
          return res.status(500).json(err);
        return res.status(500).json({
          err,
        });
      };
    default:
      // Return text/html
      return (err: any, _: IRequest, res: IResponse, next: NextFunction) => {
        logger[logMethod](err);
        if (err instanceof Error) {
          res.status(500);
          const message = `${err.stack}`;
          res.send(toHtml(message));
        }
        if (typeof err === 'string') {
          res.status(404);
          res.send(toHtml(err));
        }
      };
  }
}

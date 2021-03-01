import { IErrorMiddlewareOptions } from '../error/error-middleware.interfaces';
import { IRequest, IResponse } from '../../../utils/types';
import { NextFunction, TMiddleware } from '../../core';
import { notFoundHtml } from '../../../utils';

export default function notFoundMiddleware(
  opts: IErrorMiddlewareOptions
): TMiddleware {
  const { preferJSON } = opts;
  switch (preferJSON) {
    case true:
      // return application/json
      return (req: IRequest, res: IResponse, _: NextFunction) => {
        res.status(404).json({
          status: 404,
          err: `Cannot ${req.method} ${req.url}`,
        });
      };
    default:
      // Return text/html
      return (req: IRequest, res: IResponse, _: NextFunction) => {
        res
          .status(404)
          .set('Content-Type', 'text/html; charset=utf-8')
          .end(notFoundHtml(req.method, req.url));
      };
  }
}

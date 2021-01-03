import { ILoggerProvider } from '../Logger';
import { IRequest, IResponse } from '../utils/types';
import { NextFunction } from '../Middleware';

// eslint-disable-next-line import/prefer-default-export
export interface IHttpLoggerOptions {
  logger?: ILoggerProvider;
}

/**
 * A simple HttpLogger inspired by morgan
 *
 * The message will be printed over info() method if the req.end() incl: send, json, sendStatus, sendFile (non streaming), gets executed.
 *
 * Warning: The peformance will be degraded when you use the module even when the logging level (in case you use the built-in Logger) is set to false
 * it'd be better if this middleware is used in development mode only
 *
 * Passing a custom console which must be extended from ILoggerProvider (@default console)
 *
 * If you want to use global application's logger , use the code below
 * @example
 * import rex, { getLoggerInstance, httpLogger } from 'rex'
 * const app = rex();
 * app.use(httpLogger(getLoggerInstance()))
 *
 * @param opts
 */
export const httpLogger = (logger: ILoggerProvider = console) => {
  if (process.env.NODE_ENV === 'production')
    logger.warn(
      'You are using HttpLogger middleware in production mode which may decrease the overall performance!'
    );

  return (req: IRequest, res: IResponse, next: NextFunction) => {
    const startDate = new Date().toLocaleString();
    const { ip, method, url } = req;
    res.locals._startTime = process.hrtime();

    const { end } = res;

    const handleEnd = (...args: any[]) => {
      (end as any).bind(res)(...args);
      setImmediate(() => {
        const timer = process.hrtime(res.locals._startTime);

        const timeInMs = `${(
          (timer[0] * 1000000000 + timer[1]) /
          1000000
        ).toFixed(2)} ms`;

        logger!.info(
          startDate,
          ip,
          method.toUpperCase(),
          url,
          (res as any)._statusCode || 200,
          timeInMs
        );
      });
    };

    res.end = handleEnd;

    next();
  };
};

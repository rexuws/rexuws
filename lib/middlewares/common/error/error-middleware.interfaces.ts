import { ILogger, TLoggerLevel } from '../../../Logger';

export interface IErrorMiddlewareOptions {
  preferJSON?: boolean;
  logger: ILogger;
  logMethod: TLoggerLevel;
}

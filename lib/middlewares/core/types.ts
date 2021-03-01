import { IRequest, IResponse } from '../../utils/types';

export type TMiddleware = (
  req: IRequest,
  res: IResponse,
  next: NextFunction
) => void;

export type TMiddlewareErrorHandler = (
  err: any,
  req: IRequest,
  res: IResponse,
  next: NextFunction
) => void;

export type NextFunction = (error?: any) => void;

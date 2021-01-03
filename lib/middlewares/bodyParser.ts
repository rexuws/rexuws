import qs from 'qs';
import { IRequest, IResponse } from '../utils/types';
import { NextFunction } from './types';

export const parse = (
  ct: string,
  raw: Buffer
): Record<string, string> | string | Buffer => {
  if (ct === 'application/json' || ct === 'text/json') {
    const json = JSON.parse(raw as any);
    return json;
  }

  if (ct === 'application/octet-stream') {
    return raw;
  }

  if (ct.startsWith('text/')) {
    return raw.toString();
  }

  if (ct === 'application/x-www-form-urlencoded') {
    return qs.parse(raw.toString()) as {};
  }

  return raw;
};

export const bodyParser = (req: IRequest, _: IResponse, next: NextFunction) => {
  const ct = req.header('content-type');
  if (!req.raw || !ct) {
    return next();
  }

  try {
    req.body = parse(ct, req.raw);
    return next();
  } catch (err) {
    return next(err);
  }
};

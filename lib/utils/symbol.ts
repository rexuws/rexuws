export const PREFIXED_ROUTE: unique symbol = Symbol('PrefixedRouter');

export const HAS_ASYNC: unique symbol = Symbol('Response/hasAsync');

export const USE_CORK: unique symbol = Symbol('Response/useCork');

export const FROM_REQ: unique symbol = Symbol('Response/fromReq');

export const READ_STREAM: unique symbol = Symbol(
  'Response/readableStreamOfFile'
);

export const WRITE_STATUS: unique symbol = Symbol('Response/boundWriteStatus');

export const WRITE_HEADER: unique symbol = Symbol('Response/boundWriteHeader');

export const WRITE: unique symbol = Symbol('Response/boundWrite');

export const TRY_END: unique symbol = Symbol('Response/boundTryEnd');

export const CLOSE: unique symbol = Symbol('Response/boundClose');

export const END: unique symbol = Symbol('Response/boundEnd');

export const CORK: unique symbol = Symbol('Response/boundCork');

export const GET_WRITE_OFFSET: unique symbol = Symbol(
  'Response/boundGetWriteOffset'
);

export const ON_ABORTED: unique symbol = Symbol('Response/boundOnAborted');

export const ON_WRITABLE: unique symbol = Symbol('Response/boundOnWritable');

export const ON_DATA: unique symbol = Symbol('Response/boundOnData');

export const GET_REMOTE_ADDR: unique symbol = Symbol(
  'Response/boundGetRemoteAddressAsText'
);

export const GET_PROXIED_ADDR: unique symbol = Symbol(
  'Response/boundGetProxiedRemoteAddressAsText'
);

export const GET_HEADER: unique symbol = Symbol('Request/boundGetHeader');

export const GET_PARAMS: unique symbol = Symbol('Request/boundGetParams');

export const GET_URL: unique symbol = Symbol('Request/boundGetUrl');

export const GET_METHOD: unique symbol = Symbol('Request/boundGetMethod');

export const GET_QUERY: unique symbol = Symbol('Request/boundGetQuery');

export const FOR_EACH: unique symbol = Symbol('Request/boundForEach');

export const FROM_RES: unique symbol = Symbol('Request/fromRes');

export const FROM_APP: unique symbol = Symbol('<-Application');

export const NEXT: unique symbol = Symbol('Middleware/NextFunction');

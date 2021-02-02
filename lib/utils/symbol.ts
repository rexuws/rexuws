export const PREFIXED_ROUTE: unique symbol = Symbol('kPrefixedRouter');

export const HAS_ASYNC: unique symbol = Symbol('kResponse/hasAsync');

export const USE_CORK: unique symbol = Symbol('kResponse/useCork');

export const FROM_REQ: unique symbol = Symbol('kResponse/fromReq');

export const READ_STREAM: unique symbol = Symbol(
  'Response/readableStreamOfFile'
);

export const WRITE_STATUS: unique symbol = Symbol('kResponse/boundWriteStatus');

export const WRITE_HEADER: unique symbol = Symbol('kResponse/boundWriteHeader');

export const WRITE: unique symbol = Symbol('kResponse/boundWrite');

export const TRY_END: unique symbol = Symbol('kResponse/boundTryEnd');

export const CLOSE: unique symbol = Symbol('kResponse/boundClose');

export const END: unique symbol = Symbol('kResponse/boundEnd');

export const CORK: unique symbol = Symbol('kResponse/boundCork');

export const GET_WRITE_OFFSET: unique symbol = Symbol(
  'Response/boundGetWriteOffset'
);

export const ON_ABORTED: unique symbol = Symbol('kResponse/boundOnAborted');

export const ON_WRITABLE: unique symbol = Symbol('kResponse/boundOnWritable');

export const ON_DATA: unique symbol = Symbol('kResponse/boundOnData');

export const GET_REMOTE_ADDR: unique symbol = Symbol(
  'Response/boundGetRemoteAddressAsText'
);

export const GET_PROXIED_ADDR: unique symbol = Symbol(
  'Response/boundGetProxiedRemoteAddressAsText'
);

export const GET_HEADER: unique symbol = Symbol('kRequest/boundGetHeader');

export const GET_PARAMS: unique symbol = Symbol('kRequest/boundGetParams');

export const GET_URL: unique symbol = Symbol('kRequest/boundGetUrl');

export const GET_METHOD: unique symbol = Symbol('kRequest/boundGetMethod');

export const GET_QUERY: unique symbol = Symbol('kRequest/boundGetQuery');

export const FOR_EACH: unique symbol = Symbol('kRequest/boundForEach');

export const FROM_RES: unique symbol = Symbol('kRequest/fromRes');

export const FROM_APP: unique symbol = Symbol('k<-Application');

export const NEXT: unique symbol = Symbol('kMiddleware/NextFunction');

export const LAZY_ASYNC_CHECKER: unique symbol = Symbol('kkRoute/checkHasAsync');
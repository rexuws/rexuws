import { HttpMethod } from './utils/types';
import { TMiddleware } from './Middleware';
import { PREFIXED_ROUTE } from './utils/symbol';

export default class Router {
  public prefixRoutes?: IPrefixedRoutes & IPrefixedRoutesSettings;

  public handlers: Map<
    string,
    {
      method: HttpMethod;
      middlewares: TMiddleware[];
    }
  >;

  public get: (path: string, ...middlewares: TMiddleware[]) => this;

  public post: (path: string, ...middlewares: TMiddleware[]) => this;

  public options: (path: string, ...middlewares: TMiddleware[]) => this;

  public del: (path: string, ...middlewares: TMiddleware[]) => this;

  public patch: (path: string, ...middlewares: TMiddleware[]) => this;

  public put: (path: string, ...middlewares: TMiddleware[]) => this;

  public head: (path: string, ...middlewares: TMiddleware[]) => this;

  public connect: (path: string, ...middlewares: TMiddleware[]) => this;

  public trace: (path: string, ...middlewares: TMiddleware[]) => this;

  constructor() {
    this.handlers = new Map();
    this.get = this.add.bind(this, HttpMethod.GET);
    this.post = this.add.bind(this, HttpMethod.POST);
    this.options = this.add.bind(this, HttpMethod.OPTIONS);
    this.del = this.add.bind(this, HttpMethod.DEL);
    this.patch = this.add.bind(this, HttpMethod.PATCH);
    this.put = this.add.bind(this, HttpMethod.PUT);
    this.head = this.add.bind(this, HttpMethod.HEAD);
    this.trace = this.add.bind(this, HttpMethod.TRACE);
    this.connect = this.add.bind(this, HttpMethod.CONNECT);
  }

  private add(
    method: HttpMethod,
    path: string,
    ...middlewares: TMiddleware[]
  ): this {
    this.handlers.set(path, {
      method,
      middlewares,
    });
    return this;
  }

  public route(path: string): IPrefixedRoutes {
    const handlers = new Map<HttpMethod, TMiddleware[]>();

    function add(
      this: any,
      store: Map<HttpMethod, TMiddleware[]>,
      method: HttpMethod,
      ...middlewares: TMiddleware[]
    ): any {
      store.set(method, middlewares);
      return this;
    }

    this.prefixRoutes = {} as any;

    (this.prefixRoutes as any)[PREFIXED_ROUTE] = true;

    (this.prefixRoutes as any).prefix = path;
    (this.prefixRoutes as any).handlers = handlers;
    (this.prefixRoutes as any).get = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.GET
    );
    (this.prefixRoutes as any).post = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.POST
    );
    (this.prefixRoutes as any).patch = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.PATCH
    );
    (this.prefixRoutes as any).put = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.PUT
    );
    (this.prefixRoutes as any).del = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.DEL
    );
    (this.prefixRoutes as any).options = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.OPTIONS
    );
    (this.prefixRoutes as any).head = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.HEAD
    );
    (this.prefixRoutes as any).connect = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.CONNECT
    );
    (this.prefixRoutes as any).trace = add.bind(
      this.prefixRoutes,
      handlers,
      HttpMethod.TRACE
    );

    return this.prefixRoutes as IPrefixedRoutes;
  }
}

export interface IPrefixedRoutesSettings {
  prefix: string;
  handlers: Map<HttpMethod, TMiddleware[]>;
}

export interface IPrefixedRoutes {
  get(...middlewares: TMiddleware[]): IPrefixedRoutes;
  post(...middlewares: TMiddleware[]): IPrefixedRoutes;
  options(...middlewares: TMiddleware[]): IPrefixedRoutes;
  del(...middlewares: TMiddleware[]): IPrefixedRoutes;
  patch(...middlewares: TMiddleware[]): IPrefixedRoutes;
  put(...middlewares: TMiddleware[]): IPrefixedRoutes;
  head(...middlewares: TMiddleware[]): IPrefixedRoutes;
  connect(...middlewares: TMiddleware[]): IPrefixedRoutes;
  trace(...middlewares: TMiddleware[]): IPrefixedRoutes;
}

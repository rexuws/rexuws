/* eslint-disable @typescript-eslint/ban-types */
import { RequestMethod, INestApplication } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { isNil, isObject } from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import { RouterMethodFactory } from '@nestjs/core/helpers/router-method-factory';
import * as cors from 'cors';
import rex, { middlewares, getLoggerInstance } from 'rexuws';
import { IServeStaticOptions } from 'rexuws/build/lib/middlewares';
import { IRequest, IResponse } from 'rexuws/build/lib/utils/types';
import Application from 'rexuws/build/lib/Application';

export default class ReXHttpAdapter extends AbstractHttpAdapter {
  private readonly routerMethodFactory = new RouterMethodFactory();

  constructor(instance?: any) {
    super(instance || rex());
  }

  public reply(response: IResponse, body: any, statusCode?: number) {
    if (statusCode) {
      response.status(statusCode);
    }
    if (isNil(body)) {
      return response.end();
    }
    return response.send(body);
  }

  public status(response: IResponse, statusCode: number) {
    return response.status(statusCode);
  }

  public render(response: IResponse, view: string, options: any) {
    return response.render(view, options);
  }

  public redirect(response: IResponse, statusCode: number, url: string) {
    return response.redirect(statusCode, url);
  }

  public setErrorHandler(handler: Function, prefix?: string) {
    return this.use(handler);
  }

  public setNotFoundHandler(handler: Function, prefix?: string) {
    return this.use(handler);
  }

  public setHeader(response: IResponse, name: string, value: string) {
    return response.set(name, value);
  }

  public setViewEngine(engine: any) {
    getLoggerInstance()!.warn(
      'Please use setRexViewEngine() instead or call setView() directly from ReX instance'
    );
  }

  public listen(port: string | number, callback?: () => void): void;
  public listen(
    hostname: string,
    port: string | number,
    callback?: () => void
  ): void;
  public listen(port: any, ...args: any[]) {
    return this.instance.listen(port, ...args);
  }

  public close() {
    return this.instance.close();
  }

  public setRexViewEngine(
    viewPath: string,
    engine: {
      renderMethod: (...args: any) => any;
      async?: boolean;
      extName: string;
    }
  ): void;
  public setRexViewEngine(
    viewPath: string,
    engine: {
      compileMethod: (...args: any) => any;
      extName: string;
    }
  ): void;
  public setRexViewEngine(path: string, engine: any): void {
    (this.instance as Application).setView(path, engine);
  }

  public useStaticAssets(path: string, options: IServeStaticOptions) {
    middlewares.StaticServer.Config(options);
    this.use(
      options.prefix ? options.prefix : '/',
      middlewares.StaticServer.GetRouter()
    );
  }

  public getRequestHostname(request: IRequest): string {
    return request.hostname!;
  }

  public getRequestMethod(request: IRequest): string {
    return request.method;
  }

  public getRequestUrl(request: any): string {
    return request.url;
  }

  public enableCors(options: CorsOptions) {
    return this.use((cors as any)(options));
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod
  ): (path: string, callback: Function) => any {
    console.log(this.routerMethodFactory);
    return this.routerMethodFactory
      .get(this.instance, requestMethod)
      .bind(this.instance);
  }

  public initHttpServer(options: NestApplicationOptions) {}

  public registerParserMiddleware() {}

  public setLocal(key: string, value: any) {
    this.instance.locals[key] = value;
    return this;
  }

  public getType(): string {
    return 'rex';
  }

  public delete(...args: any) {
    return this.instance.del(...args);
  }

  public use(...args: any[]) {
    if (args.length === 1) {
      if (
        args[0].toString().replace(/\n/g, '').replace(/\s\s+/g, ' ') ===
        defaultMdw
      ) {
        getLoggerInstance()!.warn(
          'The first Default NestJS Middlewares has been disabled'
        );
        return;
      }
      if (
        args[0].toString().replace(/\n/g, '').replace(/\s\s+/g, ' ') ===
        defaultErr
      ) {
        getLoggerInstance()!.warn(
          'The Default NestJS Error Middlewares has been disabled'
        );
        return;
      }
    }
    this.instance.use(...args);
  }
}

const defaultMdw = `async (req, res, next) => { try { await targetCallback(req, res, next); } catch (e) { const host = new execution_context_host_1.ExecutionContextHost([req, res, next]); exceptionsHandler.next(e, host); } }`;
const defaultErr = `async (err, req, res, next) => { try { await targetCallback(err, req, res, next); } catch (e) { const host = new execution_context_host_1.ExecutionContextHost([req, res, next]); exceptionsHandler.next(e, host); } }`;

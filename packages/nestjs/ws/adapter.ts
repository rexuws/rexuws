/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
import { INestApplicationContext, Logger } from '@nestjs/common';
import {
  MessageMappingProperties,
  AbstractWsAdapter,
} from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter, share, first, takeUntil } from 'rxjs/operators';
import ReX from 'rexuws';
import { WebSocket } from 'uWebSockets.js';
import Application from 'rexuws/build/lib/Application';
import { EventEmitter } from 'events';
import { HttpAdapterHost } from '@nestjs/core';
import {
  IRexWSAdapterCreateArgs,
  IRexWSMessage as IReXWSMessage,
  IReXWSArgServer,
  IReXWSEmitMessage,
  WithEmitter,
  TReXAllowedUWSBehaviors,
} from './types';
import ReXHttpAdapter from '../http/adapter';

export default class ReXWsAdapter extends AbstractWsAdapter {
  #instance: Application;

  #namespace = '/';

  #port: number | undefined;

  #uWSBehaviors: TReXAllowedUWSBehaviors = {};

  private logger = new Logger('ReXUWS-WSAdapter');

  constructor(
    private app: INestApplicationContext,
    opts?: IRexWSAdapterCreateArgs
  ) {
    super(app);

    const adapter = app.get(HttpAdapterHost)?.httpAdapter;

    if (adapter && adapter instanceof ReXHttpAdapter) {
      this.#instance = adapter.getInstance();
    } else {
      throw new TypeError('Missing ReX Application instance');
    }

    if (opts) {
      const {
        namespace = this.#namespace,
        port,
        compression,
        drain,
        idleTimeout,
        maxBackpressure,
        maxPayloadLength,
        ping,
        pong,
        upgrade,
      } = opts;

      this.#namespace = namespace;

      this.#port = port;

      this.#uWSBehaviors = {
        compression,
        drain,
        idleTimeout,
        maxBackpressure,
        maxPayloadLength,
        ping,
        pong,
        upgrade,
      };
    }
  }

  create(
    port = this.#port,
    options: IRexWSAdapterCreateArgs & IReXWSArgServer
  ): Application {
    const {
      namespace = this.#namespace,
      compression,
      drain,
      idleTimeout,
      maxBackpressure,
      maxPayloadLength,
      ping,
      pong,
      upgrade,
    } = options;

    this.#namespace = namespace;

    this.#port = port;

    this.#uWSBehaviors = {
      compression,
      drain,
      idleTimeout,
      maxBackpressure,
      maxPayloadLength,
      ping,
      pong,
      upgrade,
    };

    if (this.#instance) return this.#instance;

    const httpAdapter =
      options.server || this.app.get(HttpAdapterHost)?.httpAdapter;

    if (httpAdapter && httpAdapter instanceof ReXHttpAdapter) {
      return httpAdapter.getInstance();
    }

    this.#instance = ReX();

    return this.#instance;
  }

  bindClientConnect(server: Application, callback: Function) {
    this.logger.log(`Listening on ${this.#namespace}`);
    this.#instance.useNativeHandlers((uws) => {
      uws.ws(this.#namespace, {
        ...this.#uWSBehaviors,
        open: (ws) => {
          ws.emitter = new EventEmitter();
          callback(ws);
        },
        close: (ws: WebSocket, code, msg) => {
          (ws as WithEmitter<WebSocket>).emitter.emit('disconnect', msg);
        },
        message: (ws: WebSocket, msg, isBinary) => {
          (ws as WithEmitter<WebSocket>).emitter.emit('message', {
            msg,
            isBinary,
          });
        },
      });
    });
  }

  bindMessageHandlers(
    client: WithEmitter<WebSocket>,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>
  ) {
    const close$ = fromEvent(client.emitter, 'disconnect').pipe(
      share(),
      first()
    );

    fromEvent<IReXWSEmitMessage>(client.emitter, 'message')
      .pipe(
        mergeMap((e) => this.bindMessageHandler(e, handlers, process)),
        filter((result) => result),
        takeUntil(close$)
      )
      .subscribe((response) => client.send(JSON.stringify(response)));
  }

  bindMessageHandler(
    message: IReXWSEmitMessage,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>
  ): Observable<any> {
    const { msg } = message;

    const extractedMessage: IReXWSMessage<unknown> = JSON.parse(
      Buffer.from(msg).toString('utf-8')
    );

    // find handler
    const handler = handlers.find((e) => e.message === extractedMessage.event);

    if (!handler) return EMPTY;

    return process(handler.callback(extractedMessage.data));
  }

  bindClientDisconnect(
    client: WithEmitter<WebSocket>,
    cb: (...args: any[]) => void
  ) {
    client.emitter.on('disconnect', cb);
  }

  close() {
    // server.close();
    (this.app.get(HttpAdapterHost).httpAdapter as ReXHttpAdapter).close();
  }
}

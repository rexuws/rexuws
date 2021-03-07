import { WebSocketBehavior } from "uWebSockets.js";
import { EventEmitter } from "events";

export type TReXAllowedUWSBehaviors = Omit<
  WebSocketBehavior,
  "open" | "message" | "close"
>;

export interface IRexWSAdapterCreateArgs extends TReXAllowedUWSBehaviors {
  /**
   * Mount point
   * @default '/''
   */
  namespace?: string;

  /**
   * Port
   *
   * Omit if passing from ReXHttpAdapter
   */
  port?: number;
}

export interface IRexWSMessage<T> {
  event: string;
  data: T;
}

export interface IReXWSArgServer {
  server: unknown;
}

export interface IReXWSEmitMessage {
  msg: ArrayBuffer;
  isBinary: boolean;
}

export type WithEmitter<T> = {
  emitter: EventEmitter;
} & T;

export type TLoggerLevelConsole = 'error' | 'log' | 'warn' | 'info' | 'trace';

export type TLoggerLevelDeprecate = 'deprecate';

export type TLoggerLevel = TLoggerLevelConsole | TLoggerLevelDeprecate;

export interface ILoggerDeprecate {
  /**
   * Same as warning but prefixed with `[DEPRECATED]`
   */
  deprecate(message?: any, ...optionalParams: any[]): void;
}

export interface ILoggerPrint {
  /**
   * Force print regardless of settings
   */
  print?(message?: any, ...optionalParams: any[]): void;
}

export interface ILoggerOptions {
  /**
   * Set logger level on spefic methods
   *
   * If `true` enable on all methods
   *
   * @default ['error','warn','deprecate']
   */
  level?: TLoggerLevel | TLoggerLevel[] | boolean;

  /**
   * Set prefix for all logging method
   */
  prefix?: string;
}

export interface ILoggerProvider extends Pick<Console, TLoggerLevelConsole> {}

export interface ILogger
  extends ILoggerProvider,
    ILoggerDeprecate,
    ILoggerPrint {}

export default class Logger implements ILogger {
  private _prefix: string;

  private _logger: ILoggerProvider;

  private _level: TLoggerLevel[] | TLoggerLevel | false;

  public info: (message?: any, ...optionalParams: any[]) => void;

  public error: (message?: any, ...optionalParams: any[]) => void;

  public log: (message?: any, ...optionalParams: any[]) => void;

  public warn: (message?: any, ...optionalParams: any[]) => void;

  public trace: (message?: any, ...optionalParams: any[]) => void;

  public deprecate: (message?: any, ...optionalParams: any[]) => void;

  public print?: (message?: any, ...optionalParams: any[]) => void;

  constructor(opts?: ILoggerOptions, logger?: ILoggerProvider) {
    if (!opts || typeof opts !== 'object') {
      this._prefix = '';
      this._level = ['error', 'warn', 'deprecate'];
    } else {
      const { prefix = '', level = ['error', 'warn', 'deprecate'] } = opts;

      this._prefix = prefix;

      if (typeof level === 'boolean') {
        if (level)
          this._level = ['error', 'warn', 'deprecate', 'info', 'log', 'trace'];
        else this._level = false;
      } else this._level = level;
    }

    this._logger = logger || console;

    this.info = this.hasLogger('info')
      ? this._logger.info.bind(this._logger, this._prefix)
      : this.off;

    this.log = this.hasLogger('log')
      ? this._logger.log.bind(this._logger, this._prefix)
      : this.off;

    this.error = this.hasLogger('error')
      ? this._logger.error.bind(this._logger, this._prefix)
      : this.off;

    this.warn = this.hasLogger('warn')
      ? this._logger.warn.bind(this._logger, this._prefix)
      : this.off;

    this.trace = this.hasLogger('trace')
      ? this._logger.trace.bind(this._logger, this._prefix)
      : this.off;

    this.deprecate = this.hasLogger('deprecate')
      ? this._logger.warn.bind(this._logger, this._prefix, '[DEPRECATED]')
      : this.off;

    this.print = this._logger.log.bind(this._logger, this._prefix);
  }

  // eslint-disable-next-line class-methods-use-this
  private off() {
    return null;
  }

  private hasLogger(type: TLoggerLevel): boolean {
    if (!this._level) return false;

    if (Array.isArray(this._level) && this._level.indexOf(type) !== -1)
      return true;

    if (this._level === type) return true;

    return false;
  }
}

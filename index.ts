import Application, { CoreApplicationOptions } from './lib/Application';
import { DefaultRouter } from './lib/router';
import Logger, { ILoggerOptions } from './lib/Logger';

import { colorConsole } from './lib/utils';

export type TReXAppOptions = Omit<CoreApplicationOptions, 'logger'> & {
  /**
   * Set logging options
   */
  logging?: ILoggerOptions;

  /**
   * Set application alias name
   */
  name?: string;
};

const reXInstances: Map<
  string | number,
  { app: Application; logger: Logger }
> = new Map();

const defaultLoggerSetting: ILoggerOptions = {
  prefix: '[ReXUWS]',
  level: ['error', 'warn', 'deprecate'],
};
/**
 * Get instanciated application
 * @param id Application name or default id number (0, 1, 2, ...)
 */
export const getAppInstance = (
  id?: string | number
): Application | undefined => {
  if (id) return reXInstances.get(id)?.app;

  return reXInstances.values().next().value?.app;
};

/**
 * Get instanciated logger
 * @param id Application name or default id number (0, 1, 2, ...)
 */
export const getLoggerInstance = (id?: string | number): Logger | undefined => {
  if (id) return reXInstances.get(id)?.logger;

  return reXInstances.values().next().value?.logger;
};

export default (options?: TReXAppOptions): Application => {
  if (!options) {
    const logger = new Logger(defaultLoggerSetting, colorConsole);

    const app = new Application({
      logger,
    });

    reXInstances.set(reXInstances.size, { app, logger });

    return app;
  }

  const {
    name = reXInstances.size,
    logging = defaultLoggerSetting,
    ...appOptions
  } = options;

  const logger = new Logger(
    {
      ...defaultLoggerSetting,
      ...logging,
    },
    colorConsole
  );

  const app = new Application({
    ...appOptions,
    logger,
  });

  reXInstances.set(name, {
    app,
    logger,
  });

  return app;
};

export const Router = () => new DefaultRouter();

export * as middlewares from './lib/middlewares';

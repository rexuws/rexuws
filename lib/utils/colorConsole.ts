/* eslint-disable import/prefer-default-export */
/* eslint-disable prefer-rest-params */
import chalk from 'chalk';

export const colorConsoleNoTimestamp = {
  error(...args: []) {
    // eslint-disable-next-line no-console
    return console.error(chalk.red(...args));
  },
  log(...args: []) {
    // eslint-disable-next-line no-console
    return console.log(chalk.green(...args));
  },
  info(...args: []) {
    // eslint-disable-next-line no-console
    return console.info(chalk.blue(...args));
  },
  warn(...args: []) {
    // eslint-disable-next-line no-console
    return console.warn(chalk.yellow(...args));
  },
  trace(...args: []) {
    // eslint-disable-next-line no-console
    return console.trace(chalk.grey(...args));
  },
};

export const colorConsole = {
  error(...args: []) {
    // eslint-disable-next-line no-console
    return console.error(
      chalk.red(args.shift(), new Date().toLocaleString(), ...args)
    );
  },
  log(...args: []) {
    // eslint-disable-next-line no-console
    return console.log(
      chalk.green(args.shift(), new Date().toLocaleString(), ...args)
    );
  },
  info(...args: []) {
    // eslint-disable-next-line no-console
    return console.info(
      chalk.blue(args.shift(), new Date().toLocaleString(), ...args)
    );
  },
  warn(...args: []) {
    // eslint-disable-next-line no-console
    return console.warn(
      chalk.yellow(args.shift(), new Date().toLocaleString(), ...args)
    );
  },
  trace(...args: []) {
    // eslint-disable-next-line no-console
    return console.trace(
      chalk.grey(args.shift(), new Date().toLocaleString(), ...args)
    );
  },
};

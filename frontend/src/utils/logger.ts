// lib/logger.ts
import chalk from 'chalk';
import { createConsola, type LogObject, type LogType } from 'consola';

const isProd = process.env.NODE_ENV === 'production';

const icons: Record<LogType, string> = {
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '❌',
  fatal: '💀',
  debug: '🐞',
  trace: '🔍',
  log: '📝',
  box: '📦',
  start: '🚀',
  ready: '✅',
  silent: '',
  fail: '❌',
  verbose: '🔊',
};

const colors: Record<LogType, (text: string) => string> = {
  info: chalk.blue,
  success: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  fatal: chalk.bgRed.white.bold,
  debug: chalk.magenta,
  trace: chalk.cyan,
  log: chalk.gray,
  box: chalk.white,
  start: chalk.cyanBright,
  ready: chalk.greenBright,
  silent: chalk.dim,
  fail: chalk.redBright,
  verbose: chalk.blueBright,
};

const colorfulReporter = {
  log(logObj: LogObject) {
    const icon = icons[logObj.type] ?? '';
    const color = colors[logObj.type] ?? chalk.white;
    const now = new Date();
    const time = chalk.gray(
      `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.toTimeString().split(' ')[0]}`,
    );

    const tag = chalk.bold(`[${logObj.tag}]`);
    const message = logObj.args
      .map((arg) => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      })
      .join(' ');

    console.log(`${icon} ${time} ${tag} ${color(message)}`);
  },

  // {
  //     const { type, tag, args } = logObj;
  //     const time = new Date().toISOString();
  //     const color =
  //       type === 'error'
  //         ? chalk.red
  //         : type === 'warn'
  //           ? chalk.yellow
  //           : type === 'info'
  //             ? chalk.cyan
  //             : type === 'debug'
  //               ? chalk.magenta
  //               : chalk.gray;

  //     console.log(
  //       `${chalk.gray(`[${time}]`)} ${color(`[${type.toUpperCase()}]`)} ${chalk.green(`[${tag}]`)}`,
  //       ...args,
  //     );
  // },
};

const consola = createConsola({
  level: isProd ? 2 : 4, // 2 = info, 4 = debug
  reporters: isProd ? [jsonReporter()] : [colorfulReporter],
  defaults: {
    tag: 'omnixys',
  },
});

// JSON-Reporter für Prod
function jsonReporter() {
  return {
    log(logObj: LogObject) {
      const { type, tag, args, level } = logObj;
      console.log(
        JSON.stringify({
          date: new Date().toISOString(),
          type,
          tag,
          level,
          args,
        }),
      );
    },
  };
}

export const logger = consola;

export const getLogger = (context: string | { name?: string }) => {
  const name =
    typeof context === 'string' ? context : context?.name || 'unknown';
  const tag = name;
  return logger.withTag(tag);
};

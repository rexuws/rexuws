/* eslint-disable consistent-return */
import chokidar from 'chokidar';
import fs from 'fs';

export interface IWatcherCallbackToEvents {
  add: (baseUrl: string, path: string, stats?: fs.Stats) => void;
  unlink: (baseUrl: string, path: string) => void;
  change?: (baseUrl: string, path: string, stats?: fs.Stats) => void;
}
export default class FileWatcher {
  private _aliases: string[];

  private _watcher: chokidar.FSWatcher;

  private _callbacks: IWatcherCallbackToEvents;

  private _ready = false;

  constructor(aliases: string[], cb: IWatcherCallbackToEvents) {
    this._aliases = aliases;
    this._callbacks = cb;

    this._watcher = chokidar.watch(aliases, {
      awaitWriteFinish: true,
    });

    this.init();
  }

  private getRelativePath(
    path: string
  ): { baseUrl: string; filePath: string } | undefined {
    for (let i = 0; i < this._aliases.length; i++) {
      if (path.indexOf(this._aliases[i]) !== -1) {
        return {
          filePath: path.replace(`${this._aliases[i]}/`, ''),
          baseUrl: this._aliases[i],
        };
      }
    }
    return undefined;
  }

  private init() {
    this._watcher
      .on('ready', () => {
        this._ready = true;
      })
      .on('add', (path, stats) => {
        if (this._ready) {
          const { baseUrl, filePath } = this.getRelativePath(path)!;
          return this._callbacks.add(baseUrl, filePath, stats);
        }
      })
      .on('unlink', (path) => {
        if (this._ready) {
          const { baseUrl, filePath } = this.getRelativePath(path)!;
          return this._callbacks.unlink(baseUrl, filePath);
        }
      });

    if (this._callbacks.change) {
      this._watcher.on('change', (path, stats) => {
        if (this._ready) {
          const { baseUrl, filePath } = this.getRelativePath(path)!;
          return this._callbacks.change!(baseUrl, filePath, stats);
        }
      });
    }
  }
}

/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-await-in-loop */
import fs from 'fs/promises';
import { contentType } from 'mime-types';
import path from 'path';
import fsSync from 'fs';
import { ILoggerProvider } from '../Logger';
// eslint-disable-next-line import/no-cycle
import { DefaultRouter } from '../router';
import { getMime } from '../utils/utils';
import FileWatcher from '../utils/fileWatcher';

export interface IServeStaticOptions {
  [key: string]: any;

  /**
   * Allow caching files with accepted mime-type.
   *
   * Internally use `mmmagic` to get the most exact file's mime-type and transform this value
   * into Content-Type by mime-types.contentType() method
   *
   * If `true` cache all files
   *
   * If `false` use mime-types.contentType() only to extract content type from file's extension
   * @default true
   */
  useCache?: boolean | string | string[];

  /**
   * Specify the maximum size of file which will be eligible for caching
   * If '-1' skip this policy
   *
   * @default 102400 (100kB)
   */
  maxSize?: number;

  /**
   * Watch directory for file's changes
   *
   * If `true` Asynchronously watch directory change by `chokidar` which will execute an action on the ServeStaticStore
   * right after such events as `add`, `change`, `unlink` happened in the directory
   *
   * If `false` Do nothing which means if there's new file, it will not be served automatically (respose 404 Not Found). For the modified file,
   * if it has already been cached, the cache version will be served.
   *
   * If `onNotFound`When the given path does exist and it couldn't be found the store,
   * try to serve file directly (res.sendFile) and resave it to the store (if it does not violate caching policies )
   *
   * @default true
   */
  watcher?: boolean | 'onNotFound';

  /**
   * Set Header: Cache-Control: public, max-age=value
   *
   * @default 604800 7days
   */
  maxAge?: number;

  prefix?: string;
}

interface IFileDataOrDir {
  mime?: string;
  isDirectory?: boolean;
  data?: Buffer;
  fileSize?: number;
  lastModified?: string;
  mtime?: Date;
}

export class StaticServer {
  static Store: Record<string, Map<string, IFileDataOrDir>> = {};

  static Options: IServeStaticOptions = {
    maxSize: 1024 * 100, // 100kb
    useCache: true,
    watcher: true,
  };

  static Config(opts: IServeStaticOptions, logger?: ILoggerProvider) {
    const defaultOpts = {
      maxSize: 1024 * 1000, // 100kb
      useCache: true,
      watcher: true,
      maxAge: 604800, // 7 days
    };

    if (!opts || typeof opts !== 'object' || Object.keys(opts).length <= 0)
      this.Options = defaultOpts;

    this.Options = {
      ...opts,
      ...defaultOpts,
    };

    if (logger) {
      this.Logger = logger;
    }

    this.Watcher = opts.watcher || false;
  }

  private static Logger: ILoggerProvider = console;

  private static Watcher: boolean | 'onNotFound' = false;

  private static FileWatcher: FileWatcher;

  private path: string;

  private pathMappers: Map<string, IFileDataOrDir>;

  constructor(path: string) {
    if (!path) {
      throw new TypeError('Missing path for serving static contents');
    }

    if (!path) {
      throw new TypeError('Path must be a string');
    }

    this.path = path;

    this.pathMappers = new Map();
  }

  private async readFilesOrDir(
    dirContent: string[],
    parentPath?: string
  ): Promise<void> {
    StaticServer.Logger.info(`Reading files in ${parentPath || dirContent}...`);

    for (let i = 0; i < dirContent.length; i++) {
      const name = parentPath
        ? `${parentPath}/${dirContent[i]}`
        : dirContent[i];

      const fullPath = path.join(this.path, name);

      StaticServer.Logger.info(`Reading ${name} (${fullPath}) `);

      const stat = await fs.stat(fullPath);

      if (stat.isFile()) {
        const { name: key, data } = await StaticServer.readFileFromPathAndStat(
          fullPath,
          stat,
          name
        );
        this.pathMappers.set(key, data);
      } else if (stat.isDirectory()) {
        this.pathMappers.set(name, { isDirectory: true });

        const childDirContent = await fs.readdir(fullPath);

        await this.readFilesOrDir(childDirContent, name);
      }
    }
  }

  private static async readFileFromPathAndStat(
    fullPath: string,
    stat: fsSync.Stats,
    name: string
  ): Promise<{ name: string; data: IFileDataOrDir }> {
    let completeMime: string = '';
    const { mtime } = stat;

    // Need to set milliseconds to zero to avoid mis-compared UTCString to the original one
    mtime.setMilliseconds(0);

    if (this.Options.useCache) {
      let mime = await getMime(fullPath);

      // eslint-disable-next-line prefer-destructuring
      if (Array.isArray(mime)) mime = mime[0];

      if (mime === 'text/plain') {
        const namePart = name ? name.split('/') : fullPath.split('/');
        completeMime = contentType(namePart[namePart.length - 1]) || mime;
      } else
        completeMime = mime === 'text/html' ? 'text/html; charset=utf-8' : mime;
    }

    if (this.Options.maxSize! === -1 || stat.size > this.Options.maxSize!) {
      return {
        data: {
          fileSize: stat.size,
          mime: completeMime,
          lastModified: stat.mtime.toUTCString(),
          mtime: stat.mtime,
        },
        name,
      };
    }
    return {
      name,
      data: {
        fileSize: stat.size,
        mime: completeMime,
        data: await fs.readFile(fullPath),
        lastModified: stat.mtime.toUTCString(),
        mtime: stat.mtime,
      },
    };
  }

  async init(): Promise<void> {
    try {
      const dir = await fs.readdir(this.path);

      await this.readFilesOrDir(dir);
      StaticServer.Store[this.path] = this.pathMappers;
    } catch (error) {
      StaticServer.Logger.trace(error);
    }
  }

  static GetRouter(): DefaultRouter {
    const router = new DefaultRouter();
    const setupPaths = Object.keys(this.Store);

    if (this.Watcher === true) {
      this.Logger.info('[Watcher] Watching', ...setupPaths);
      if (!this.FileWatcher) {
        this.FileWatcher = new FileWatcher(setupPaths, {
          add: (baseUrl, path, stats) => {
            this.Logger.info('[Watcher] Add file to', baseUrl, path);
            this.readFileFromPathAndStat(`${baseUrl}/${path}`, stats!, path)
              .then(({ data }) => {
                this.Store[baseUrl].set(path, {
                  data: data.data,
                  fileSize: data.fileSize,
                  isDirectory: data.isDirectory,
                  mime: data.mime,
                });
              })
              .catch((err) => {
                this.Logger.error(
                  'Something went wrong while reading file added file',
                  `${baseUrl}/${path}`
                );
                this.Logger.trace(err);
              });
          },
          change: (baseUrl, path, stats) => {
            this.Logger.info('[Watcher] File gets changed in', baseUrl, path);
            this.readFileFromPathAndStat(`${baseUrl}/${path}`, stats!, path)
              .then(({ data }) => {
                this.Store[baseUrl].set(path, {
                  data: data.data,
                  fileSize: data.fileSize,
                  isDirectory: data.isDirectory,
                  mime: data.mime,
                });
              })
              .catch((err) => {
                this.Logger.error(
                  'Something went wrong while reading changed file',
                  `${baseUrl}/${path}`
                );
                this.Logger.trace(err);
              });
          },
          unlink: (baseUrl, path) => {
            this.Logger.info('[Watcher] Remove file in', baseUrl, path);
            this.Store[baseUrl].delete(path);
          },
        });
      }
    }

    return router.get('/*', (req, res, next) => {
      const file = req.originalUrl.startsWith('/')
        ? req.originalUrl.substring(1)
        : req.originalUrl;

      // look up for file in the store
      for (let i = 0; i < setupPaths.length; i++) {
        const found = this.Store[setupPaths[i]].get(file);

        if (found) {
          if (found.isDirectory) {
            return next(`Cannot GET ${req.url}`);
          }

          const { data, mime, fileSize, lastModified, mtime } = found;

          const headerIfModified = req.header('if-modified-since');

          if (headerIfModified) {
            if (new Date(headerIfModified) >= mtime!) {
              return res.status(304).end();
            }
          }

          if (data)
            return res.sendFile(data, {
              mime,
              fileSize,
              lastModified,
              maxAge: this.Options.maxAge,
            });

          // if there is no data which means fs.readFile hasn't been call and this
          // file is not elegible for caching
          // use res.sendfile to handle the action
          // the mime type has already been retrieve so pass it directly to res.sendFile to skip calling fs.getStat()
          return res.sendFile(path.join(setupPaths[i], file), {
            mime,
            fileSize,
            lastModified,
            maxAge: this.Options.maxAge,
          });
        }
      }

      // look up for file changes setting
      // eslint-disable-next-line consistent-return
      if (this.Watcher !== 'onNotFound') return next(`Cannot GET ${req.url}`);

      // Get relative path in folder
      let fileStat: fsSync.Stats | undefined;
      let fullPath: string;
      let foundDir: string;
      for (let i = 0; i < setupPaths.length; i++) {
        if (!fileStat)
          try {
            const joinedPath = path.join(setupPaths[i], file);
            fileStat = fsSync.statSync(joinedPath);
            fullPath = joinedPath;
            foundDir = setupPaths[i];
            return;
          } catch (error) {
            // do nothing
          }
      }

      try {
        if (!fileStat) return next(`Cannot GET ${req.url}`);

        if (fileStat.isDirectory()) return next(`Cannot GET ${req.url}`);

        const { name, data: result } = this.readFileFromPathAndStat(
          fullPath!,
          fileStat,
          file
        ) as any;

        // update in relative store
        this.Store[foundDir!].set(name, result);

        const { data, mime, fileSize, lastModified, mtime } = result;

        const headerIfModified = req.header('if-modified-since');

        if (headerIfModified) {
          if (new Date(headerIfModified) >= mtime!) {
            return res.status(304).end();
          }
        }

        // if there is no data which means fs.readFile hasn't been call and this
        // file is not elegible for caching
        // use res.sendfile to handle
        // the mime type has already been retrieve so pass it directly to res.sendFile
        if (!data)
          return res.sendFile(fullPath!, {
            mime,
            fileSize,
            lastModified,
            maxAge: this.Options.maxAge,
          });

        return res.sendFile(data, {
          mime,
          lastModified,
          maxAge: this.Options.maxAge,
        });
      } catch {
        return next(`Cannot GET ${req.url}`);
      }
    });
  }
}

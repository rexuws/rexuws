/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-await-in-loop */
import fs from 'fs/promises';
import { contentType } from 'mime-types';
import path from 'path';
import fsSync from 'fs';
import { ILogger } from '../Logger';
import Router from '../Route';
import { getMime } from './utils';

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
   * @default false
   */
  useCache?: boolean | string | string[];

  /**
   * Specify the maximum size of file allowed to be cached
   * If '-1' skip this policy
   *
   * @default -1
   */
  maxSize?: number;

  /**
   * Use native uWS GET for each file
   *
   * If `false` Mount on `GET /some-path/*`
   * @default false
   */
  useNativeRouting?: boolean;

  /**
   * Watch directory for file's changes
   *
   * If `true` Asynchronously watch directory change by `chokidar` which will execute an action on the ServeStaticStore
   * right after such events as `add`, `change`, `unlink`, etc... happened in the directory
   *
   * If `false` Do nothing which means if there's new file, it will not be served automatically. For the modified file,
   * if it has already been cached, the cache version will be served.
   *
   * If `onNotFound` Try to serve file directly and save it to the store (its data will be cached if it does not violate caching policy ) if the given path does exist when it couldn't be found from
   * the store.
   *
   * This option has no effect if `useNativeRouting` is being enabled
   * @default false
   */
  watcher?: boolean | 'onNotFound';
}

interface IFileDataOrDir {
  mime?: string;
  isDirectory?: boolean;
  data?: Buffer;
  fileSize?: number;
}

export class StaticServing {
  static Store: Record<string, Map<string, IFileDataOrDir>> = {};

  static Options: IServeStaticOptions = {
    maxSize: 1024 * 100, // 100kb
    useCache: true,
    useNativeRouting: false,
    watcher: false,
  };

  static Config(opts: IServeStaticOptions) {
    const defaultOpts = {
      maxSize: 1024 * 1000, // 100kb
      useCache: true,
      useNativeRouting: false,
      watcher: false,
    };

    if (!opts || typeof opts !== 'object' || Object.keys(opts).length <= 0)
      this.Options = defaultOpts;

    this.Options = {
      ...defaultOpts,
      opts,
    };
  }

  private static Watcher: boolean | 'onNotFound' = false;

  private path: string;

  private maxSize = 1024 * 100;

  private allowMimes: string[] = [];

  private debug: ILogger;

  private pathMappers: Map<string, IFileDataOrDir>;

  private mimeChecker?: (path: string) => Promise<string | string[]>;

  private useNativeRouting = false;

  private watcher: boolean | 'onNotFound' = false;

  constructor(path: string, debug: ILogger, options: IServeStaticOptions = {}) {
    if (!path) {
      throw new TypeError('Missing path for serving static contents');
    }

    if (!path) {
      throw new TypeError('Path must be a string');
    }

    this.path = path;

    if (!options && typeof options !== 'object') {
      throw new TypeError('Options must be an object');
    }

    if (options.useCache) {
      if (typeof options.useCache === 'string') {
        this.allowMimes.push(options.useCache);
      } else if (Array.isArray(options.useCache))
        this.allowMimes = options.useCache;
    }

    if (options.maxSize) {
      this.maxSize = options.maxSize;
    }

    if (options.useNativeRouting) {
      this.useNativeRouting = options.useNativeRouting;
    }

    if (options.watcher) this.watcher = options.watcher;

    this.debug = debug;

    this.pathMappers = new Map();
  }

  private async readFilesOrDir(
    dirContent: string[],
    parentPath?: string
  ): Promise<void> {
    this.debug.info(`Reading files in ${parentPath || dirContent}`);

    for (let i = 0; i < dirContent.length; i++) {
      const name = parentPath
        ? `${parentPath}/${dirContent[i]}`
        : dirContent[i];

      const fullPath = path.join(this.path, name);

      this.debug.info(`Reading ${name} (${fullPath}) `);

      const stat = await fs.stat(fullPath);

      if (stat.isFile()) {
        const { name: key, data } = await StaticServing.readFileFromPathAndStat(
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
      },
    };
  }

  async init(): Promise<void> {
    try {
      const dir = await fs.readdir(this.path);

      await this.readFilesOrDir(dir);
      StaticServing.Store[this.path] = this.pathMappers;
    } catch (error) {
      this.debug.trace(error);
    }
  }

  static GetRouter(): Router {
    const router = new Router();
    const setupPaths = Object.keys(this.Store);
    const setupContents = Object.values(this.Store);

    return router.get('/*', (req, res, next) => {
      const file = req.originalUrl.startsWith('/')
        ? req.originalUrl.substring(1)
        : req.originalUrl;

      // look up for file in the store
      let fileOrDir: IFileDataOrDir | undefined;

      let foundPathFromCache = '';

      for (let i = 0; i < setupContents.length; i++) {
        const found = setupContents[i].get(file);

        if (found) {
          fileOrDir = found;
          foundPathFromCache = path.join(setupPaths[i], file);
          if (fileOrDir.isDirectory) {
            return res.redirect('/');
          }

          const { data, mime, fileSize } = fileOrDir;
          if (data) return res.sendFile(data, { mime });

          // if there is no data which means fs.readFile hasn't been call and this
          // file is not elegible for caching
          // use res.sendfile to handle the action
          // the mime type has already been retrieve so pass it directly to res.sendFile to skip calling fs.getStat()
          return res.sendFile(foundPathFromCache, { mime, fileSize });
        }
      }

      if (!fileOrDir) {
        // look up for file changes
        // eslint-disable-next-line consistent-return
        if (this.Watcher !== 'onNotFound') return next(`Cannot GET ${file}`);

        // Get relative path in folder
        // this.Store.keys().
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
          if (!fileStat) return next(`Cannot GET ${file}`);

          if (fileStat.isDirectory()) return next(`Cannot GET ${file}`);

          const { name, data: result } = this.readFileFromPathAndStat(
            fullPath!,
            fileStat,
            file
          ) as any;

          // update in relative store
          this.Store[foundDir!].set(name, result);

          const { data, mime, fileSize } = result;

          // if there is no data which means fs.readFile hasn't been call and this
          // file is not elegible for caching
          // use res.sendfile to handle
          // the mime type has already been retrieve so pass it directly to res.sendFile
          if (!data) return res.sendFile(fullPath!, { mime, fileSize });

          return res.sendFile(data, { mime });
          // return res.sendFile(data || path, {
          //   mime,
          // });
        } catch {
          return next(`Cannot GET ${file}`);
        }
      }
    });
  }

  // async getRouter(): Promise<Router> {
  //   const router = new Router();

  //   if (this.useNativeRouting) await this.init();

  //   if (this.pathMappers.size === 0) {
  //     this.debug.warn(`No file detected in ${this.path}`);
  //     return router;
  //   }

  //   if (!this.useNativeRouting) {
  //     return router.get('/:url', async (req, res, next) => {
  //       const { url } = req.params;
  //       // console.log(url);
  //       const fileOrDir = this.pathMappers.get(url);
  //       // StaticServing.Store.get(url);

  //       if (!fileOrDir) {
  //         // look up for file changes
  //         if (this.watcher !== 'onNotFound') return next(`Cannot GET ${url}`);

  //         // Get relative path in folder
  //         const path = url;

  //         try {
  //           const stat = await fs.stat(path);

  //           if (stat.isDirectory()) {
  //             return res.redirect('/');
  //           }

  //           await this.readFileFromPathAndStat(path, stat, url);

  //           const { data, mime, fileSize } = this.pathMappers.get(
  //             url
  //           ) as IFileDataOrDir;

  //           // if there is no data which means fs.readFile hasn't been call and this
  //           // file is not elegible for caching
  //           // use res.sendfile to handle
  //           // the mime type has already been retrieve so pass it directly to res.sendFile
  //           if (data) return res.sendFile(data, { mime });

  //           return res.sendFile(path, { mime, fileSize });
  //           // return res.sendFile(data || path, {
  //           //   mime,
  //           // });
  //         } catch {
  //           return next(`Cannot GET ${url}`);
  //         }
  //       }

  //       if (fileOrDir.isDirectory) {
  //         return res.redirect('/');
  //       }

  //       const { data, mime, fileSize } = this.pathMappers.get(
  //         url
  //       ) as IFileDataOrDir;

  //       // if there is no data which means fs.readFile hasn't been call and this
  //       // file is not elegible for caching
  //       // use res.sendfile to handle
  //       // the mime type has already been retrieve so pass it directly to res.sendFile
  //       if (data) return res.sendFile(data, { mime });

  //       return res.sendFile(url, { mime, fileSize });
  //     });
  //   }

  //   // this.pathMappers.forEach((v, k) => {
  //   //   router.get(k, (req, res) => {
  //   //     if (v.isDirectory) {
  //   //       res.
  //   //     }
  //   //   });
  //   // });

  //   return router;
  // }
}

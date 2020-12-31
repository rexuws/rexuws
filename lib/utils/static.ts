/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-await-in-loop */
import fs from 'fs/promises';
import mmm from 'mmmagic';
import { promisify } from 'util';
import { contentType } from 'mime-types';
import path from 'path';
import { Stats } from 'fs';
import { ILogger } from '../Logger';
import Router from '../Route';

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
  static Store: Map<string, Map<string, IFileDataOrDir>> = new Map();

  static async GetRouter(): Promise<Router> {
    const router = new Router();

    return router;
  }

  private path: string;

  private maxSize = -1;

  private allowMimes: string[] = [];

  private debug: ILogger;

  private pathMappers: Map<string, IFileDataOrDir>;

  private mimeChecker?: (path: string) => Promise<string | string[]>;

  private useNativeRouting = false;

  private watcher: boolean | 'onNotFound' = false;

  constructor(path: string, debug: ILogger, options?: IServeStaticOptions) {
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
      const mimeChecker = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

      this.mimeChecker = promisify(mimeChecker.detectFile);

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
        await this.readFileFromPathAndStat(fullPath, stat, name);
      } else if (stat.isDirectory()) {
        this.pathMappers.set(name, { isDirectory: true });

        const childDirContent = await fs.readdir(fullPath);

        await this.readFilesOrDir(childDirContent, name);
      }
    }
  }

  private async readFileFromPathAndStat(
    fullPath: string,
    stat: Stats,
    name: string
  ): Promise<void> {
    let data: IFileDataOrDir = {};
    if (this.maxSize > -1 && stat.size > this.maxSize) {
      data = {};
    } else if (this.mimeChecker) {
      let mime = await this.mimeChecker(fullPath);

      // eslint-disable-next-line prefer-destructuring
      if (Array.isArray(mime)) mime = mime[0];

      if (mime === 'text/plain') mime = contentType(name || fullPath) || mime;

      data.mime = mime;

      if (
        this.allowMimes.length === 0 ||
        this.allowMimes.indexOf(mime) !== -1
      ) {
        const fileContent = await fs.readFile(fullPath);
        data.data = fileContent;
      }

      data.fileSize = stat.size;
    }
    this.pathMappers.set(name, data);
  }

  private async init(): Promise<void> {
    try {
      const dir = await fs.readdir(this.path);

      await this.readFilesOrDir(dir);
    } catch (error) {
      this.debug.trace(error);
    }
  }

  async getRouter(): Promise<Router> {
    const router = new Router();

    await this.init();

    if (this.pathMappers.size === 0) {
      this.debug.warn(`No file detected in ${this.path}`);
      return router;
    }

    if (this.useNativeRouting) {
      return router.get('/*', async (req, res, next) => {
        const { url } = req as any;

        const fileOrDir = this.pathMappers.get(url);
        // StaticServing.Store.get(url);

        if (!fileOrDir) {
          // look up for file changes
          if (this.watcher !== 'onNotFound') return next(`Cannot GET ${url}`);

          // Get relative path in folder
          const path = url;

          try {
            const stat = await fs.stat(path);

            if (stat.isDirectory()) {
              return res.redirect('/');
            }

            await this.readFileFromPathAndStat(path, stat, url);

            const { data, mime, fileSize } = this.pathMappers.get(
              url
            ) as IFileDataOrDir;

            // if there is no data which means fs.readFile hasn't been call and this
            // file is not elegible for caching
            // use res.sendfile to handle
            // the mime type has already been retrieve so pass it directly to res.sendFile
            if (data) return res.sendFile(data, { mime });

            return res.sendFile(path, { mime, fileSize });
            // return res.sendFile(data || path, {
            //   mime,
            // });
          } catch {
            return next(`Cannot GET ${url}`);
          }
        }

        if (fileOrDir.isDirectory) {
          return res.redirect('/');
        }

        const { data, mime, fileSize } = this.pathMappers.get(
          url
        ) as IFileDataOrDir;

        // if there is no data which means fs.readFile hasn't been call and this
        // file is not elegible for caching
        // use res.sendfile to handle
        // the mime type has already been retrieve so pass it directly to res.sendFile
        if (data) return res.sendFile(data, { mime });

        return res.sendFile(url, { mime, fileSize });
      });
    }

    // this.pathMappers.forEach((v, k) => {
    //   router.get(k, (req, res) => {
    //     if (v.isDirectory) {
    //       res.
    //     }
    //   });
    // });

    return router;
  }
}

# ReXUWS

[![NPM version](https://badgen.net/npm/v/rexuws)](https://www.npmjs.com/package/rexuws)
[![TypeScript support](https://badgen.net/npm/types/rexuws)](https://www.npmjs.com/package/rexuws)

ReXUWS - Replace Express by uWS - A simple express-like framework built on top of uWebsockets.js

## Usage

```bash
npm i rexuws
```

### Create the server

```ts
import rex from 'rexuws';
import { IRequest, IResponse } from './lib/utils/types';

const app = rex();

app.get('/hi', (req: IRequest, res: IResponse) => {
  res.send('hi');
});

app.listen(3000);
```

### Configuration rex(options: TReXAppOptions)

- `forceAsync`: Attach abort handler to all routes. Should be `TRUE` when compiling to ES5 (which lacks of Promise/Async/Await), default: `FALSE`
- `name`: Set up application's name in ReX container, default: 0, 1, 2, ...
- `logging`: Control how the message gets printed over console's method such as log, error, info, warn, trace.

- `useDefaultParser`: Apply some bultin parsers (bodyParser, multipartParser) on POST/PATCH/PUT routes and cookieParser on all endpoints. When configured over application's instanciation, these middlewares will be executed before all user's defined middlewares. If `TRUE` (default) enable bodyParser (to parse application/json, application/x-www-form-urlencoded, text/\*) and cookieParser. To enable multipartParser on all POST/PUT/PATCH routes, you have to specify in useDefaultParser setting. ex:

```ts
const app = rex({
  useDefaultParser: {
    bodyParser: true,
    cookieParser: true,
    multipartParser: true,
  },
});
```

- `uWSConfigurations`: uWebsockets Templated App options (see: https://github.com/uNetworking/uWebSockets.js/). Can be used to create a SSL App, ex:

```ts
const app = rex({
  uWSConfigurations: {
    key_file_name: 'misc/key.pem',
    cert_file_name: 'misc/cert.pem',
    passphrase: '1234',
  },
});
```

- `preferJSON`: if `TRUE` return application/json in default errorMiddleware and notFoundMiddleware else return text/html. Default `FALSE`

### Supported HTTP methods

- `GET`
- `POST`
- `PATCH`
- `PUT`
- `DELETE`
- `HEAD`
- `TRACE`
- `OPTIONS`
- `CONNECT`
- `ANY`
- `ALL` (alias of `ANY`)

### Examples

- `Basic routing`

```ts
import rex from 'rexuws';

const app = rex({
  useDefaultParser: true,
});

app.get('/', (req, res) => {
  res.end('ok');
});

app.post('/', (req, res) => {
  res.end('post ok');
});

app.get('/user/:id', (req, res) => {
  res.end(`Your id is ${req.params.id}`);
});

// chaining
app
  .get('/async', async (req, res) => {
    res.json({
      message: 'ok',
    });
  })
  .post('/signIn', (req, res) => {
    res.json(req.body);
  })
  .listen('0.0.0.0', 3001);
```

#### Router

```ts
import rex, { Router } from '../../index';

const router = Router()
  .get('/helloworld', (req, res) => {
    res.end('ok');
  })
  .get(
    '/users/:id',
    (req, res, next) => {
      next();
    },
    (req, res) => {
      res.end('ok');
    }
  );

app.use('/api', router);
```

#### Prefix Router

```ts
import rex, { Router } from '../../index';

const app = rex();

const prefixRouter = Router()
  .route('/user')
  .get((req, res) => {
    res.end('ok');
  })
  .post(
    (req, res, next) => {
      next();
    },
    (req, res) => {
      res.end('ok');
    }
  );

app.use('/api', preFixRouter);
```

#### Global middlewares

```ts
app.use((req, res, next) => {
  next();
});
```

#### Global Error middlewares

```ts
app.use((err, req, res, next) => {
  next();
});
```

#### Route middlewares

```ts
app.get(
  '/user',
  (req, res, next) => {
    next();
  },
  (req, res) => {
    res.end();
  }
);

// Send to ErrorMiddleware
app.get('/error', (req, res, next) => {
  next('Something went wrong');
});
```

#### Native Routing

This library only aims at providing a wrapper around Http Routes. If you want to use uWebsockets WebSocket feature, or would like to access raw uWebSockets.js usage, you can use `app.useNativeHandlers((uws: TemplatedApp) => void)`

There is a implementation of ReXUWS with NestJS which has a compatible Websocket Adapter, scroll down to the bottom of the page for detail.

```ts
app.useNativeHandlers((uws: TemplatedApp) => {
  uws
    .ws('/somepath', {
      // ws handlers
    })
    .get('/hello', (res: uws.HttpResponse, req: uws.HttpRequest) => {
      res.end();
    });
});
```

#### Start the server

```ts
app.listen(port: number);
app.listen(port: number, callback: () => void)
app.listen(host: string, port: number)
app.listen(host: string, port: number, callback: () => void)

// example
app.listen('localhost', 3030, () => {
  console.log('Listening on 3030');
})
```

#### Stop the server

```ts
app.close();
app.close(cb: () => void);

// example
app.close(() => {
  console.log('Bye!');
})
```

### Request Object

Interface:

```ts
import { IRequest } from 'rexuws/build/lib/utils/types';
```

Methods:

- `accepts()`
- `acceptsCharsets()`
- `acceptsEncodings()`
- `acceptLanguages()`
- `get()`: get spefic header value, ex:

```ts
app.get('/users', (req, res) => {
  res.send(req.get('content-type'));
});
```

- `header()`: alias of `get()`
- `is()`

Properties:

- `body`: request body, if there is no posted body, `req.body` is `undefined`. Without any related parser, `req.body` is a `Buffer`
- `cookies`: Without any related parsers, cookies is a `string`
- `headers`: an object of all request's headers
- `hostname`: parse the "Host" header field hostname.
- `ip`: return the remote address
- `ips`: parse the "X-Forwarded-For" ip address list.
- `method`: request method (useful when using `app.any()`, `app.all()`)
- `params`: parse the request params, ex:

```ts
// GET /users/alice/friends/bob
app.get('/users/:username/friends/:friendName', (req, res) => {
  console.log(req.params.username); // alice
  console.log(req.params.friendName); // bob
  res.end();
});
```

- `query`: parse the request query

```ts
// GET /feeds?limit=5&skip=10
app.get('/users/:username/friends/:friendName', (req, res) => {
  console.log(req.query); // { limit: '5', skip: '10' }
  res.end();
});
```

- `raw`: posted body as `Buffer`
- `originalReq`: Original uWebsockets HttpRequest Object

### Response Object

Interface:

```ts
import { IResponse } from 'rexuws/build/lib/utils/types';
```

Methods:

- `contentType()`: set response content type
- `cookie()`: set reponse cookie (same as Express)
- `end()`: send string data.
- `get()`: get value for header's field
- `getHeader()`: alias of `get()`
- `header()`: set reponse's headers (same as Express)
- `json()`: send JSON.
- `location()`: set location header
- `redirect()`: set location header and status code 302
- `render()` render view (same as Express)
- `send()`: send body and recognize its content-type
- `set()`: alias of `header()`
- `status()`: set status code
- `type()`: alias of `contentType()`
- `render()`: render view, (see: examples)

```ts
// render view

import ejs from 'ejs';

// config view engine
app.setView('path/to/view/directory', {
  compileMethod: ejs.compile,
  extName: 'ejs',
});

app.get('/home', (req, res) => {
  res.render('Home', {
    user: {
      username: 'Adam',
      email: 'adam@mail.com',
    },
    today: new Date(),
  });
});

app.post('/users', (req: IRequest, res: IResponse) => {
  res
    .status(200)
    .type('application/json')
    .cookie('sid', '12345', {
      path: '/',
      httpOnly: true,
    })
    .set('X-Custom', '12345')
    .send('ok');
});
```

_**Warning:** Unstable methods:_

- `download()`: Transfer the file at the given `path` as an attachment.

```ts
app.get('/download', (req: IRequest, res: IResponse) => {
  res.download('/path/to/file');
});
```

- `sendFile()`: send file at the given path

```ts
app.get('/send-file', (req, res) => {
  res.sendFile('/path/to/file', options?:IResponseSendFileOption, callback?: (err: any) => void );
});
```

### Bultin-middlewares

#### Usage

```ts
import { middlewares } from 'rexuws';
```

| Middleware         | Descripton                                                         | Default        |
| ------------------ | ------------------------------------------------------------------ | -------------- |
| bodyParser         | Parse application/json, text/\*, application/x-www-form-urlencoded | enabled        |
| errorMiddleware    | Simple handler for `next(err)`                                     | enabled        |
| notFoundMiddleware | Return text/html; application/json 404 for unregistered path       | enabled _(\*)_ |
| httpLogger         | Simple HTTP logger                                                 | disabled       |
| StaticServer       | Serve static contents                                              | disabled       |

_(\*)_ notFoundMiddleware is enabled by default if `ANY /*` hasn't been registered

#### Serve static files

```ts
import path from 'path';
import rex, { getLoggerInstance, middlewares } from 'rexuws';

async function bootstrap() {
  const app = rex({
    logging: {
      level: true,
    },
  });

  middlewares.StaticServer.Config({ watcher: true }, getLoggerInstance());

  /**
   * Init a StaticStore for selected directory
   */
  await new middlewares.StaticServer(path.join(__dirname, './public')).init();

  const router = middlewares.StaticServer.GetRouter();

  app.use('/docs', router);

  app.listen(3000);
}

bootstrap();
```

### NestJS Integration (experimental)

#### Usage

Create a new NestJS Project (see: NestJS) then install these packages

```bash
npm i rexuws @rexuws/nestjs @nestjs/websockets
```
### TODO
- Update docs
- Full tests
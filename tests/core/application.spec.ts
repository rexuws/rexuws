/* eslint-disable import/no-extraneous-dependencies */
import chai from 'chai';
import chaiHttp from 'chai-http';
import Logger from '../../lib/Logger';

import Application from '../../lib/Application';
import { TMiddleware, TMiddlewareErrorHandler } from '../../lib/middlewares';

chai.use(chaiHttp);

const { expect } = chai;

const dummyAsync = () =>
  new Promise((resolve, reject) => {
    resolve({
      hello: 'world',
    });
  });

const server = new Application({
  logger: new Logger({
    level: false,
  }),
  useDefaultParser: {
    cookieParser: true,
  },
});

describe('Application HttpRouting', () => {
  const middlewares: Record<string, TMiddleware> = {
    layer1: (req, res, next) => {
      req.data = {
        layer1: 'hello',
      };
      next();
    },
    layer2: (req, res, next) => {
      (req.data as Record<string, unknown>).layer2 = 'world';
      next();
    },
    layer3: (req, res, next) => {
      (req.data as Record<string, unknown>).layer3 = 'rexuws';
      next();
    },
  };

  const fakeErrorMiddleware: TMiddlewareErrorHandler = (err, _, res, __) => {
    res.status(500).json({ message: 'Fake error middleware', error: err });
  };

  server.use(fakeErrorMiddleware);

  server
    .get('/end', (req, res, next) => {
      res.end('hello world');
    })
    .get('/json', (req, res, next) => {
      res.json({
        hello: 'world',
      });
    })
    .get('/send/text', (req, res, next) => {
      res.send('hello world');
    })
    .get('/send/json', (req, res) => {
      res.send({
        hello: 'world',
      });
    })
    .get('/param/:name', (req, res) => {
      res.json({
        name: req.params.name,
      });
    })
    .get('/query', (req, res) => {
      res.json({
        query: req.query,
      });
    })
    .get('/readheaders', (req, res) => {
      res.json({
        clientHeaders: req.headers,
      });
    })
    .get('/readheaders/:headerName', (req, res) => {
      res.json({
        [req.params.headerName]: req.get(req.params.headerName),
      });
    })
    .get('/cookie', (req, res) => {
      res.json({
        cookie: req.cookies,
      });
    })
    .get('/sendCookies', (req, res) => {
      res
        .cookie('session', '12345', {
          domain: '.example.com',
          secure: true,
        })
        .cookie('testKey', 'testValue');
      res.end();
    })
    .get('/setStatus', (req, res) => {
      res.status(400).end();
    })
    .get('/setSingleHeader', (req, res) => {
      res.set('X-Custom', 'ok').end();
    })
    .get('/setSingleHeaderWithMultipleValues', (req, res) => {
      res.set('X-Custom', ['hello', 'world']).end();
    })
    .get('/setHeaders', (req, res) => {
      res
        .set({
          'X-Custom': 'ok',
          'X-Array': '123456',
        })
        .end();
    })
    .get('/async', async (req, res) => {
      const result = await dummyAsync();
      res.json(result);
    })
    .get('/async/:name', async (req, res) => {
      const result = (await dummyAsync()) as Record<string, string>;
      res.json({
        name: req.params.name,
        ...result,
      });
    })
    .post('/raw', (req, res) => {
      res.json({
        isBuffer: Buffer.isBuffer(req.body),
      });
    })
    .post('/empty', (req, res) => {
      res.json({
        isUndefined: typeof req.raw === 'undefined',
      });
    })
    .get('/middlewares', middlewares.layer1, middlewares.layer2, (req, res) => {
      res.json(req.data);
    })
    .get(
      '/middlewares/earlyReturn',
      middlewares.layer1,
      middlewares.layer2,
      (req, res) => {
        res.json(req.data);
      }
    )
    .get(
      '/middlewares/fakeError',
      middlewares.layer1,
      middlewares.layer2,
      (req, res, next) => {
        next(req.data);
      },
      middlewares.layer3
    )
    .all('/any', (req, res) => {
      res.json({
        method: req.method,
      });
    });

  it('should listening on 3000', (done) => {
    server.listen(3000, () => {
      done();
    });
  });

  it('should GET 200 on /end', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/end')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.text).to.eq('hello world');
        done();
      });
  });

  it('should GET 200 application/json on /json', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/json')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.type).to.eq('application/json');
        expect(res.body).to.eqls({
          hello: 'world',
        });
        done();
      });
  });

  it('should GET 200 text/html on /send/text', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/send/text')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.type).to.eq('text/html');
        expect(res.text).to.eq('hello world');
        done();
      });
  });

  it('should GET 200 application/json on /send/json', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/send/json')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.type).to.eq('application/json');
        expect(res.body).to.eqls({
          hello: 'world',
        });
        done();
      });
  });

  it('should GET 200 on /param/:name', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/param/test')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.type).to.eq('application/json');
        expect(res.body).to.eqls({
          name: 'test',
        });
        done();
      });
  });

  it("should GET 200 on /query?... and return request's query", (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/query')
      .query({
        name: 'hello',
        text: 'world',
      })
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          query: {
            name: 'hello',
            text: 'world',
          },
        });
        done();
      });
  });

  it("should GET 200 on /readHeaders and return request's headers", (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/readheaders')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          clientHeaders: {
            'accept-encoding': 'gzip, deflate',
            connection: 'close',
            host: '127.0.0.1:3000',
          },
        });
        done();
      });
  });

  it('should GET 200 on /readHeaders/:headerName and return specific header name', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/readheaders/X-Custom')
      .set('X-Custom', 'hello world')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          'X-Custom': 'hello world',
        });
        done();
      });
  });

  it("should GET 200 on /cookie and return request's cookie", (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/cookie')
      .set('Cookie', 'hello=world;lang=js')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          cookie: {
            hello: 'world',
            lang: 'js',
          },
        });
        done();
      });
  });

  it("should GET 200 on /sendCookies and return server's cookies", (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/sendCookies')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res).to.have.cookie('session', '12345');
        expect(res).to.have.cookie('testKey', 'testValue');
        done();
      });
  });

  it('should GET 400 on /setStatus', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/setStatus')
      .end((_, res) => {
        expect(res.status).to.eq(400);
        done();
      });
  });

  it('should GET 200 on /setSingleHeader and return server custom header', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/setSingleHeader')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res).to.have.header('X-Custom', 'ok');
        done();
      });
  });

  it('should GET 200 on /setSingleHeaderWithMultipleValues and return server custom header', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/setSingleHeaderWithMultipleValues')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res).to.have.header('X-Custom', 'hello, world');
        done();
      });
  });

  it('should GET 200 on /setHeaders and return server multiple custom headers', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/setHeaders')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res).to.have.header('X-Custom', 'ok');
        expect(res).to.have.header('X-Array', '123456');
        done();
      });
  });

  it('should GET 200 on /async and return fake async body', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/async')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          hello: 'world',
        });
        done();
      });
  });

  it('should GET 200 on /async/:name and return fake async body and param name', (done) => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/async/helloworld')
      .end((_, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          name: 'helloworld',
          hello: 'world',
        });
        done();
      });
  });

  it('should POST 200 on /raw and return type of req body as Buffer when bodyParser is off ', () => {
    chai
      .request('http://127.0.0.1:3000')
      .post('/raw')
      .send({
        hello: 'world',
      })
      .end((err, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          isBuffer: true,
        });
      });
  });

  it('should POST 200 on /empty and return type of req body as undefined when no post body', () => {
    chai
      .request('http://127.0.0.1:3000')
      .post('/empty')
      .end((err, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          isUndefined: true,
        });
      });
  });

  it('should GET 200 on /middlewares and return object modified by each middlewares', () => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/middlewares')
      .end((err, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          layer1: 'hello',
          layer2: 'world',
        });
      });
  });
  it('should GET 200 on /middlewares/earlyReturn and return object modified by each middlewares', () => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/middlewares/earlyReturn')
      .end((err, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          layer1: 'hello',
          layer2: 'world',
        });
      });
  });
  it('should GET 500 on /middlewares/fakeError and return body from fakeErrorMiddleware', () => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/middlewares/fakeError')
      .end((err, res) => {
        expect(res.status).to.eq(500);
        expect(res.type).to.eq('application/json');
        expect(res.body).to.eqls({
          error: {
            layer1: 'hello',
            layer2: 'world',
          },
          message: 'Fake error middleware',
        });
      });
  });
  it('should GET 200 on /any', () => {
    chai
      .request('http://127.0.0.1:3000')
      .get('/any')
      .end((err, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          method: 'get',
        });
      });
  });
  it('should DELETE 200 on /any', () => {
    chai
      .request('http://127.0.0.1:3000')
      .delete('/any')
      .end((err, res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.eqls({
          method: 'delete',
        });
      });
  });

  it('should gracefully stop the server', (done) => {
    server.close(() => {
      done();
    });
  });
});

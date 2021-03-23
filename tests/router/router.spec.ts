/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import FakeRoutingParser from './mock/FakeRoutingParser';
import FakeBaseRouter from './mock/FakeBaseRouter';
import {
  DefaultRouter,
  PrefixRouter,
  IRouteBaseHandler,
} from '../../lib/router';
import { IResponse, IRequest } from '../../lib/utils/types';

describe('Test AbstractRoutingParser', () => {
  describe('.get()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.get).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.get()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.post()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.post).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.post()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.patch()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.patch).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.patch()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.put()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.put).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.put()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.del()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.del).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.del()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.head()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.head).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.head()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.options()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.options).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.options()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.trace()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.trace).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.trace()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.any()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.any).to.be.a('function');
    });

    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.any()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('.all()', () => {
    it('should be a function', () => {
      const router = new FakeRoutingParser();
      expect(router.all).to.be.a('function');
    });
    
    it('should return this', () => {
      const router = new FakeRoutingParser();
      expect(router.all()).to.be.instanceOf(FakeRoutingParser);
    });
  });

  describe('Test BaseRouter', () => {
    it('should have getRouterHandler()', () => {
      const baseRouter = new FakeBaseRouter();
      expect(baseRouter.getRouteHandlers).to.be.a('function');
    });

    describe('.getRouteHandlers()', () => {
      it('should return a map', () => {
        const baseRouter = new FakeBaseRouter();
        expect(baseRouter.getRouteHandlers()).to.be.a('map');
      });
    });
  });

  describe('Test DefaultRouter', () => {
    describe('.route()', () => {
      it('should be a function()', () => {
        const router = new DefaultRouter();
        expect(router.route).to.be.a('function');
      });

      it('should throw TypeError when prefix is not a string', () => {
        const router = new DefaultRouter();
        expect(() => {
          (router as any).route();
        }).to.throw();
      });

      it('should return PrefixRouter when prefix is a string', () => {
        const router = new DefaultRouter();
        expect(router.route('/api')).to.be.instanceOf(PrefixRouter);
      });
    });

    describe('.getPrefixRouter()', () => {
      it('should be a function', () => {
        const router = new DefaultRouter();
        expect(router.getPrefixRouter).to.be.a('function');
      });

      it('should return a PrefixRouter instance', () => {
        const router = new DefaultRouter();
        router.route('/api');
        expect(router.getPrefixRouter()).to.be.instanceOf(PrefixRouter);
      });
    });

    describe('test routing method get/post/put/...', () => {
      it('should return DefaultRouter when calling [method](path, middleware)', () => {
        const router = new DefaultRouter();
        expect(
          router.get('hi', (req, res, next) => {
            res.end('ok');
          })
        ).to.be.instanceOf(DefaultRouter);
      });

      it('should throw TypeError when less than 2 arguments', () => {
        const router = new DefaultRouter();
        expect(() => {
          router.get('/hi');
        }).to.throw();
      });

      it('should accept multiple middlewares', () => {
        const router = new DefaultRouter();
        expect(
          router.get(
            'hi',
            (req, res, next) => {
              next();
            },
            (req, res) => {
              res.end('ok');
            }
          )
        ).to.be.instanceOf(DefaultRouter);
      });

      it('should throw error if middleware is not a function', () => {
        const router = new DefaultRouter();
        expect(() => {
          (router.get as any)(
            '/hi',
            (req: IRequest, res: IResponse) => {
              res.end('ok');
            },
            true
          );
        }).to.throw();
      });
    });

    describe('.getRouteHandlers()', () => {
      it('should return a map of 2 handlers', () => {
        const router = new DefaultRouter();
        router
          .get('/hi', (req, res, next) => {
            next();
          })
          .post('/hi', (req, res, next) => {});
        expect(router.getRouteHandlers().size).to.be.eq(2);
      });

      it('should return a map of handler having typeof middlewares is array', () => {
        const router = new DefaultRouter();
        router.get('/hi', (req, res, next) => {});

        const handler = router.getRouteHandlers().values().next()
          .value as IRouteBaseHandler;

        expect(handler.middlewares).to.be.instanceOf(Array);
        expect(handler.middlewares.length).to.be.eq(1);
      });
    });
  });

  describe('Test PrefixRouter', () => {
    it('should throw error if any middleware is not a function', () => {
      const router = new PrefixRouter('/api');
      expect(() => {
        (router.get as any)('/hi', (req: any, res: any, next: any) => {});
      }).to.throw();
    });

    it('getRouterHandler() should return handlers having path equals to prefixPath', () => {
      const router = new PrefixRouter('/api');
      router.get((req, res, next) => {});
      const handler = router.getRouteHandlers().values().next()
        .value as IRouteBaseHandler;

      expect(handler.path).to.be.eq('/api');
    });
    
    it('getRouteHandlers() should return a map of 2 handlers', () => {
      const router = new PrefixRouter('/api');
      router
        .get((req, res, next) => {
          next();
        })
        .post((req, res, next) => {});
      expect(router.getRouteHandlers().size).to.be.eq(2);
    });
  });
});

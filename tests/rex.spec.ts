/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import ReX, {
  getAppInstance,
  getLoggerInstance,
  Router,
} from '../index';
import Application from '../lib/Application';
import Logger from '../lib/Logger';
import { DefaultRouter } from '../lib/router';

describe('ReX', () => {
  describe('.getLoggerInstance()', () => {
    it('should return undefined when there is no app instance', () => {
      expect(getLoggerInstance()).to.be.an('undefined');
    });
  });
  describe('.getAppInstance()', () => {
    it('should return undefined when there is no app instance', () => {
      expect(getAppInstance()).to.be.an('undefined');
    });
  });
  describe('default()', () => {
    it('should return an Application instance', () => {
      const app = ReX();
      expect(app).to.be.instanceOf(Application);
    });
    describe('.getLoggerInstance()', () => {
      it('should return Logger when there is an app instance without passing argument', () => {
        expect(getLoggerInstance()).to.be.instanceOf(Logger);
      });
    });
    describe('.getAppInstance()', () => {
      it('should return Application when there is an app instance without passing argument', () => {
        expect(getAppInstance()).to.be.instanceOf(Application);
      });
    });
    describe('create app with name `lorem`', () => {
      it('should return an Application instance', () => {
        // expect(sum(1, 3)).to.equal(4);
        const app = ReX({ name: 'lorem' });
        expect(app).to.be.instanceOf(Application);
      });
      describe(".getLoggerInstance('lorem')", () => {
        it('should return Logger when there is an app instance with provided name', () => {
          expect(getLoggerInstance('lorem')).to.be.instanceOf(Logger);
        });
      });
      describe(".getAppInstance('lorem')", () => {
        it('should return Application when there is an app instance with provided name', () => {
          expect(getAppInstance('lorem')).to.be.instanceOf(Application);
        });
      });
    });
  });
  describe('Router()', () => {
    it('should return DefaultRouter', () => {
      expect(Router()).to.be.instanceOf(DefaultRouter);
    });
  });
});

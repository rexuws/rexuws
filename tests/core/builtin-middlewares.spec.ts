/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable import/no-extraneous-dependencies */

import chai from 'chai';
import chaiHttp from 'chai-http';
import * as fs from 'fs';
import * as path from 'path';
import Logger from '../../lib/Logger';

import Application from '../../lib/Application';
import { middlewares } from '../..';
import { TMultipartParsedResult } from '../../lib/middlewares';

chai.use(chaiHttp);

const { expect } = chai;

describe('test body-parser', () => {
  const server = new Application({
    logger: new Logger(),
    useDefaultParser: {
      bodyParser: true,
    },
  })
    .post('/parser', (req, res) => {
      res.type(req.get('content-type') || 'no-type').send(req.body);
    })
    .post('/encoded-form', (req, res) => {
      res.json(req.body);
    })
    .post('/unsupported', (req, res) => {
      res.json({ isBuffer: Buffer.isBuffer(req.body) });
    })
    .post('/multipart', middlewares.multipartParser, (req, res) => {
      const body = req.body as TMultipartParsedResult<{
        hello: string;
      }>;
      const result: Record<string, any> = {};

      for (const prop in body) {
        if (body[prop].data) {
          const clone = { ...body[prop] };
          delete clone.data;
          result[prop] = clone;
        } else result[prop] = body[prop];
      }

      res.json(result);
    });

  it('should start the server', (done) => {
    server.listen(3000, () => {
      done();
    });
  });

  it('should POST 200 on /parser and return application/json', (done) => {
    chai
      .request('http://localhost:3000')
      .post('/parser')
      .type('application/json')
      .send({
        hello: 'world',
      })
      .end((err, res) => {
        expect(res.status).to.be.eq(200);
        expect(res.type).to.be.eq('application/json');
        expect(res.body).to.be.eqls({
          hello: 'world',
        });
        done();
      });
  });

  it('should POST 200 on /parser and return text/plain', (done) => {
    chai
      .request('http://localhost:3000')
      .post('/parser')
      .type('text/plain')
      .send('hello world')
      .end((err, res) => {
        expect(res.status).to.be.eq(200);
        expect(res.type).to.be.eq('text/plain');
        expect(res.text).to.be.eqls('hello world');
        done();
      });
  });

  it('should POST 200 application/x-www-form-urlencoded on /parser and return application/json', (done) => {
    chai
      .request('http://localhost:3000')
      .post('/encoded-form')
      .type('application/x-www-form-urlencoded')
      .send({
        hello: 'world',
      })
      .end((err, res) => {
        expect(res.status).to.be.eq(200);
        expect(res.type).to.be.eq('application/json');
        expect(res.body).to.be.eqls({
          hello: 'world',
        });
        done();
      });
  });

  it('should POST 200 application/dummy on /unsupported and return typeof body as buffer', (done) => {
    chai
      .request('http://localhost:3000')
      .post('/unsupported')
      .type('application/dummy')
      .send('hello world')
      .end((err, res) => {
        expect(res.status).to.be.eq(200);
        expect(res.body).to.be.eqls({
          isBuffer: true,
        });
        done();
      });
  });

  it('should POST 200 application/multipart-form-data on /multipart', (done) => {
    chai
      .request('http://localhost:3000')
      .post('/multipart')
      .attach(
        'testFile',
        fs.readFileSync(path.join(__dirname, './application.spec.ts')),
        {
          filename: 'test.ts',
          contentType: 'text/plain',
        }
      )
      .attach('json', Buffer.from(JSON.stringify({ hello: 'world' })), {
        contentType: 'application/json',
      })
      .end((err, res) => {
        expect(res.status).to.be.eq(200);
        expect(res.body).to.be.eqls({
          json: {
            hello: 'world',
          },
          testFile: {
            filename: 'test.ts',
            type: 'text/plain',
            name: 'testFile',
          },
        });
        done();
      });
  });

  after(() => {
    it('should close the server', (done) => {
      server.close(() => {
        done();
      });
    });
  });
});

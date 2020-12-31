import nanoexpress from 'nanoexpress';
import rex from './index';

import uws from 'uWebSockets.js';

import cluster from 'cluster';

const testpm = () =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        msg: 'after 10ms',
      });
    }, 10);
  });

if (cluster.isMaster) {
  cluster.fork();
} else {
  uws
    .App()
    .get('/test', (res, req) => {
      res.writeHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          msg: 'ok',
        })
      );
    })
    .listen(9001, () => {
      console.log('on 9001');
    });
  (nanoexpress() as any)
    .get('/test', async (req: any, res: any) => {
      res.json(await testpm());
    })
    .get('/user/:id', (req: any, res: any) => {
      console.log(req);
      res.end(req.params.id);
    })
    .post('/user', (req: any, res: any) => {
      res.end('');
    })
    .listen(3001);
  const app = rex();

  app
    .get('/test', async (req, res) => {
      setTimeout(() => {
        res.json({
          msg: 'after 10',
        });
      }, 10);
    })
    .get('/user/:id', (req, res) => {
      res.end(req.params.id);
    })
    .post('/user', (req, res) => {
      res.end('');
    });

  app.listen();
}

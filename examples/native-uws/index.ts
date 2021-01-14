import rex from '../../';

const app = rex();

app
  .get('/rex', (req, res) => {
    res.end('This is rex router');
  })
  .useNativeHandlers((uws) => {
    uws.get('/uws', (res, req) => {
      res.end('This is native uws router');
    });
  })
  .listen(3001);

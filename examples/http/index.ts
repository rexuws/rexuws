import rex from '../../index';

const app = rex({
  useDefaultParser: {
    bodyParser: true,
  },
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

app.listen('0.0.0.0', 3001);

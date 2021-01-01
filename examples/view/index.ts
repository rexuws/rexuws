import path from 'path';
import ejs from 'ejs';
import rex from '../../index';

const app = rex();

app.setView(path.join(__dirname, './views'), {
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

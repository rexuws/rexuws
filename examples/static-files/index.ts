import path from 'path';
import rex, { getLoggerInstance, middlewares } from '../..';

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

  app.use(middlewares.httpLogger(getLoggerInstance()));

  app.use('/docs', router);

  app.listen(3000);
}

bootstrap();

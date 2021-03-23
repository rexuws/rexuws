import { INestApplication } from '@nestjs/common';

export interface IReXNestApplication extends INestApplication {
  setRexViewEngine(
    viewPath: string,
    engine: {
      renderMethod: (...args: any) => any;
      async?: boolean;
      extName: string;
    }
  ): void;
  setRexViewEngine(
    viewPath: string,
    engine: {
      compileMethod: (...args: any) => any;
      extName: string;
    }
  ): void;
}

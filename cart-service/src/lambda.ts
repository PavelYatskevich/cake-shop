import { Context, Handler } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';

let cachedHandler: Handler;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  app.enableCors({
    origin: (req, callback) => callback(null, true),
  });
  app.use(helmet());

  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event: any, context: Context, callback: any) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }

  return cachedHandler(event, context, callback);
};

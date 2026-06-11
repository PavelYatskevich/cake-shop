import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DataSource } from 'typeorm';

import { CartEntity, CartItemEntity } from '../cart/entities';

type RdsSecretPayload = {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
};

type DatabaseConnectionOptions = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private dataSource: DataSource | null = null;
  private readonly secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  async getDataSource(): Promise<DataSource> {
    if (this.dataSource && this.dataSource.isInitialized) {
      return this.dataSource;
    }

    this.dataSource = new DataSource({
      type: 'postgres',
      ...(await this.getConnectionOptions()),
      entities: [CartEntity, CartItemEntity],
      synchronize: process.env.TYPEORM_SYNCHRONIZE !== 'false',
      ssl:
        process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
    });

    return this.dataSource.initialize();
  }

  private async getConnectionOptions(): Promise<DatabaseConnectionOptions> {
    const host = process.env.DB_HOST;

    if (host) {
      return {
        host,
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || '',
      };
    }

    const secretArn = process.env.DATABASE_SECRET_ARN;
    if (!secretArn) {
      throw new Error('Set DB_HOST/DB_USERNAME/DB_PASSWORD/DB_NAME or DATABASE_SECRET_ARN');
    }

    const response = await this.secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
    if (!response.SecretString) {
      throw new Error('Database secret is empty');
    }

    const secret = JSON.parse(response.SecretString) as RdsSecretPayload;

    return {
      host: secret.host,
      port: secret.port,
      username: secret.username,
      password: secret.password,
      database: secret.dbname,
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}

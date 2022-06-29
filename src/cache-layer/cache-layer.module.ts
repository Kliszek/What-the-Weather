import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheLayerService } from './cache-layer.service';

@Module({
  imports: [ConfigModule],
  providers: [
    CacheLayerService,
    {
      provide: 'REDIS_OPTIONS',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        host: configService.get('CACHE_DATABASE_ADDRESS'),
        port: configService.get('CACHE_DATABASE_PORT'),
        username: configService.get('CACHE_USERNAME'),
        password: configService.get('CACHE_PASSWORD'),
        maxRetriesPerRequest: 5,
      }),
    },
    {
      inject: ['REDIS_OPTIONS'],
      provide: 'REDIS_CLIENT',
      useFactory: (options) => {
        const logger = new Logger('RedisModule', { timestamp: true });
        const client = new Redis(options);
        client.on('error', (channel) => {
          logger.error(`Could not connect with Redis ${channel}`);
        });
        logger.log('Connected to Redis database');
        return client;
      },
    },
  ],
  exports: [CacheLayerService, 'REDIS_CLIENT'],
})
export class CacheLayerModule {}

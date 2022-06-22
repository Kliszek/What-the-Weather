import { Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheLayerService } from './cache-layer.service';

@Module({
  providers: [
    CacheLayerService,
    {
      provide: 'REDIS_OPTIONS',
      useValue: {
        host: 'localhost',
        port: '6379',
      },
    },
    {
      inject: ['REDIS_OPTIONS'],
      provide: 'REDIS_CLIENT',
      useFactory: async (options: { host: string }) => {
        const logger = new Logger('RedisModule', { timestamp: true });
        const client = new Redis(options);
        logger.log('Connected to Redis database');
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class CacheLayerModule {}

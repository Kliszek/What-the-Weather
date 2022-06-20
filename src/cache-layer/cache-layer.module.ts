import { Logger, Module } from '@nestjs/common';
import { createClient } from 'redis';
import { CacheLayerService } from './cache-layer.service';

@Module({
  providers: [
    CacheLayerService,
    {
      provide: 'REDIS_OPTIONS',
      useValue: {
        url: 'redis://localhost:6379',
      },
    },
    {
      inject: ['REDIS_OPTIONS'],
      provide: 'REDIS_CLIENT',
      useFactory: async (options: { url: string }) => {
        const logger = new Logger('RedisModule', { timestamp: true });
        const client = createClient(options);
        await client.connect();
        logger.log('Connected to Redis database');
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class CacheLayerModule {}

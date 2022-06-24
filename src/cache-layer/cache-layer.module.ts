import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheLayerService } from './cache-layer.service';

@Module({
  imports: [ConfigModule],
  providers: [
    CacheLayerService,
    {
      provide: 'REDIS_OPTIONS',
      useValue: {
        host: 'localhost',
        port: '6379',
        retryStrategy: (times: number) => {
          if (times > 5) {
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 5,
      },
    },
    {
      inject: ['REDIS_OPTIONS'],
      provide: 'REDIS_CLIENT',
      useFactory: async (options: { host: string }) => {
        const logger = new Logger('RedisModule', { timestamp: true });
        const client = new Redis(options);
        client.on('error', (channel) => {
          logger.error('Could not connect with Redis', channel);
        });
        client.on('message', (channel, message) => {
          console.log('message:', channel, message);
        });
        logger.log('Connected to Redis database');
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class CacheLayerModule {}

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
      useFactory: async (configService: ConfigService) => ({
        host: configService.get('CACHE_DATABASE_ADDRESS'),
        port: configService.get('CACHE_DATABASE_PORT'),
        //Retry strategy, after 5 tries each reconnect will only take 1 try
        retryStrategy: (times: number) => {
          if (times > 5) {
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 5,
      }),
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
        logger.log('Connected to Redis database');
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class CacheLayerModule {}

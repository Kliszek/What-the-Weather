import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';
import { Observable } from 'rxjs';

/**
 * Checks if connection to the cache database is established and tries to reconnect.
 */
@Injectable()
export class RedisInterceptor implements NestInterceptor {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private logger = new Logger('RedisInterceptor', { timestamp: true });
  async intercept(
    _context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    if (this.redis.status !== 'ready') {
      this.logger.log('Trying to reconnect to Redis...');
      await this.redis
        .connect()
        .then(() => this.logger.log('Succesfully connected to Redis!'))
        .catch(() => null);
    }
    return next.handle();
  }
}

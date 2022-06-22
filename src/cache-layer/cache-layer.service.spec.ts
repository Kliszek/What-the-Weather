import { Test, TestingModule } from '@nestjs/testing';
import { CacheLayerService } from './cache-layer.service';
import * as RedisMocked from 'ioredis-mock';
import { Redis } from 'ioredis';

describe('CacheLayerService', () => {
  let cacheLayerService: CacheLayerService;

  /**
   * I use original type definitions, because the ones
   * from @types/ioredis-mock are deprecated and not working properly
   */
  let redisMocked: Redis;

  beforeEach(async () => {
    redisMocked = new RedisMocked();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheLayerService,
        {
          provide: 'REDIS_CLIENT',
          useFactory: () => redisMocked,
        },
      ],
    }).compile();

    cacheLayerService = module.get<CacheLayerService>(CacheLayerService);
  });

  afterEach(async () => {
    await redisMocked.quit();
  });

  it('should be defined', () => {
    expect(cacheLayerService).toBeDefined();
  });
});

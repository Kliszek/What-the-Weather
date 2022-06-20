import { Test, TestingModule } from '@nestjs/testing';
import { CacheLayerService } from './cache-layer.service';

describe('CacheLayerService', () => {
  let service: CacheLayerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheLayerService],
    }).compile();

    service = module.get<CacheLayerService>(CacheLayerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

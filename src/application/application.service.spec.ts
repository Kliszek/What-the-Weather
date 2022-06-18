import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { ApplicationModule } from './application.module';

describe('ApplicationService', () => {
  let applicationService: ApplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApplicationService],
      imports: [ApplicationModule],
    }).compile();

    applicationService = module.get<ApplicationService>(ApplicationService);
  });

  it('should be defined', () => {
    expect(applicationService).toBeDefined();
  });
});

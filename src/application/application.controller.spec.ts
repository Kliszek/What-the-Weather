import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationController } from './application.controller';
import { ApplicationModule } from './application.module';
import { ApplicationService } from './application.service';

describe('ApplicationController', () => {
  let applicationController: ApplicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [ApplicationService],
      imports: [ApplicationModule],
    }).compile();

    applicationController = module.get<ApplicationController>(
      ApplicationController,
    );
  });

  it('should be defined', () => {
    expect(applicationController).toBeDefined();
  });
});

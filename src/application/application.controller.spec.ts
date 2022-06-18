import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationController } from './application.controller';

describe('ApplicationController', () => {
  let applicationController: ApplicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
    }).compile();

    applicationController = module.get<ApplicationController>(
      ApplicationController,
    );
  });

  it('should be defined', () => {
    expect(applicationController).toBeDefined();
  });
});

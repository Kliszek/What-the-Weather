import { Module } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { RetryLogic } from '../common/retry-logic';

@Module({
  providers: [GeolocationService, RetryLogic],
  controllers: [GeolocationController],
  exports: [GeolocationService, RetryLogic],
})
export class GeolocationModule {}

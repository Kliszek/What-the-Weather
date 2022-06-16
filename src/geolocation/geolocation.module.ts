import { Module } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { RetryLogic } from '../base-services/retry-logic';

@Module({
  providers: [GeolocationService, RetryLogic],
  controllers: [GeolocationController],
})
export class GeolocationModule {}

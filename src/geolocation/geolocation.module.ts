import { Module } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { RetryLogic } from '../common/retry-logic';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [GeolocationService, RetryLogic],
  controllers: [GeolocationController],
  exports: [GeolocationService, RetryLogic],
})
export class GeolocationModule {}

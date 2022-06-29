import { Module } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { RetryLogic } from '../common/retry-logic';
import { ConfigModule } from '@nestjs/config';
import { CacheLayerModule } from '../cache-layer/cache-layer.module';

@Module({
  imports: [ConfigModule, CacheLayerModule],
  providers: [GeolocationService, RetryLogic],
  controllers: [GeolocationController],
  exports: [GeolocationService, RetryLogic, CacheLayerModule],
})
export class GeolocationModule {}

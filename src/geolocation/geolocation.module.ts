import { Module } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { RetryLogic } from '../common/retry-logic';
import { ConfigModule } from '@nestjs/config';
import { CacheLayerModule } from '../cache-layer/cache-layer.module';
import { CacheLayerService } from '../cache-layer/cache-layer.service';

@Module({
  imports: [ConfigModule, CacheLayerModule],
  providers: [GeolocationService, RetryLogic, CacheLayerService],
  controllers: [GeolocationController],
  exports: [GeolocationService, RetryLogic],
})
export class GeolocationModule {}

import { Module } from '@nestjs/common';
import { RetryLogic } from '../common/retry-logic';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';
import { ConfigModule } from '@nestjs/config';
import { CacheLayerModule } from '../cache-layer/cache-layer.module';
import { CacheLayerService } from '../cache-layer/cache-layer.service';

@Module({
  imports: [ConfigModule, CacheLayerModule],
  providers: [WeatherService, RetryLogic, CacheLayerService],
  controllers: [WeatherController],
  exports: [WeatherService, RetryLogic, CacheLayerModule],
})
export class WeatherModule {}

import { Module } from '@nestjs/common';
import { RetryLogic } from '../common/retry-logic';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';

@Module({
  providers: [WeatherService, RetryLogic],
  controllers: [WeatherController],
  exports: [WeatherService, RetryLogic],
})
export class WeatherModule {}

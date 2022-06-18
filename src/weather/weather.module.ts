import { Module } from '@nestjs/common';
import { RetryLogic } from 'src/common/retry-logic';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';

@Module({
  providers: [WeatherService, RetryLogic],
  controllers: [WeatherController],
  exports: [RetryLogic],
})
export class WeatherModule {}

import { Module } from '@nestjs/common';
import { RetryLogic } from 'src/base-services/retry-logic';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';

@Module({
  providers: [WeatherService, RetryLogic],
  controllers: [WeatherController],
})
export class WeatherModule {}

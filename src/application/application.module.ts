import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  providers: [ApplicationService],
  controllers: [ApplicationController],
  imports: [GeolocationModule, WeatherModule],
  exports: [ApplicationService, GeolocationModule, WeatherModule],
})
export class ApplicationModule {}

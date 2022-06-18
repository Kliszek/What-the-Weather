import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { GeolocationService } from '../geolocation/geolocation.service';
import { WeatherService } from '../weather/weather.service';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  providers: [ApplicationService, GeolocationService, WeatherService],
  controllers: [ApplicationController],
  imports: [GeolocationModule, WeatherModule],
})
export class ApplicationModule {}

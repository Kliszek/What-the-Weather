import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { WeatherModule } from '../weather/weather.module';
import { CacheLayerModule } from 'src/cache-layer/cache-layer.module';

@Module({
  providers: [ApplicationService],
  controllers: [ApplicationController],
  imports: [GeolocationModule, WeatherModule, CacheLayerModule],
  exports: [ApplicationService, GeolocationModule, WeatherModule],
})
export class ApplicationModule {}

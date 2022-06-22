import { Controller, Get, Query } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { CacheLayerService } from 'src/cache-layer/cache-layer.service';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(
    private weatherService: WeatherService,
    private cacheLayer: CacheLayerService,
  ) {}

  @ApiExcludeEndpoint()
  @Get('')
  async getLocation(@Query('lon') lon: number, @Query('lat') lat: number) {
    return this.weatherService.getWeather(lon, lat);
  }
}

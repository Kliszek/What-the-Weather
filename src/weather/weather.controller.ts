import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { RedisInterceptor } from '../cache-layer/cache-layer.interceptor';
import { CacheLayerService } from '../cache-layer/cache-layer.service';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(
    private weatherService: WeatherService,
    private cacheLayer: CacheLayerService,
  ) {}

  @ApiExcludeEndpoint()
  @Get('')
  @UseInterceptors(RedisInterceptor)
  async getLocation(@Query('lon') lon: string, @Query('lat') lat: string) {
    return this.weatherService.getWeather(lon, lat).then(async (result) => {
      return result;
    });
  }
}

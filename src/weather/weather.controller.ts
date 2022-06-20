import { Controller, Get, Query } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @ApiExcludeEndpoint()
  @Get('')
  getLocation(@Query('lon') lon: number, @Query('lat') lat: number) {
    return this.weatherService.getWeather(lon, lat);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @Get('')
  getLocation(@Query('lon') lon: number, @Query('lat') lat: number) {
    return this.weatherService.getWeather(lon, lat);
  }
}

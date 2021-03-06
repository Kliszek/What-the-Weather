import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { DevOnlyGuard } from '../common/dev-only.guard';
import { WeatherService } from './weather.service';

/**
 * Controller related to the weather service.
 * Should be available only for testing purposes in development stage.
 */
@UseGuards(DevOnlyGuard)
@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  /**
   * Returns the weather forecast based on longitude and latitude given in query.
   */
  @ApiExcludeEndpoint()
  @Get()
  async getLocation(@Query('lon') lon: string, @Query('lat') lat: string) {
    return this.weatherService.getWeather({ longitude: lon, latitude: lat });
  }
}

import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { DevOnlyGuard } from '../common/dev-only.guard';
import { RedisInterceptor } from '../cache-layer/cache-layer.interceptor';
import { WeatherService } from './weather.service';

@UseGuards(DevOnlyGuard)
@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @ApiExcludeEndpoint()
  @Get('')
  @UseInterceptors(RedisInterceptor)
  async getLocation(@Query('lon') lon: string, @Query('lat') lat: string) {
    return this.weatherService.getWeather(lon, lat).then(async (result) => {
      return result;
    });
  }
}

import { Controller, Get, Param, Req, UseInterceptors } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RedisInterceptor } from '../cache-layer/cache-layer.interceptor';
import {
  WeatherErrorResponse,
  WeatherResponse,
} from '../weather/weather-response.model';
import { ApplicationService } from './application.service';

@Controller('v1/api/weather')
@UseInterceptors(RedisInterceptor)
export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  @ApiTags('Weather')
  @ApiOperation({
    description: 'Get a weather broadcast at the current location',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the weather.',
    type: WeatherResponse,
  })
  @Get()
  getWeather(@Req() req: Request): Promise<WeatherResponse> {
    const userIp = req.header('x-forwarded-for') || req.socket.remoteAddress;
    return this.applicationService.getWeatherForIP(userIp);
  }

  @ApiTags('Weather')
  @ApiOperation({
    description: 'Get a weather broadcast at the specified city',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the weather.',
    type: WeatherResponse,
  })
  @ApiNotFoundResponse({
    description: 'Specified city was not found',
    type: WeatherErrorResponse,
  })
  @Get(':city_name')
  getWeatherByCityName(
    @Param('city_name') cityName: string,
  ): Promise<WeatherResponse> {
    return this.applicationService.getWeatherForCity(cityName);
  }
}

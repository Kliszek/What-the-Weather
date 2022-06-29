import { Controller, Get, Logger, Param, Req, UseGuards } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
//import { RedisInterceptor } from '../cache-layer/cache-layer.interceptor';
import {
  WeatherErrorResponse,
  WeatherResponse,
} from '../weather/weather-response.model';
import { ApplicationService } from './application.service';

/**
 * Controller related to the main services served by the app.
 */
@Controller('v1/api/weather')
@UseGuards(ThrottlerGuard)
//@UseInterceptors(RedisInterceptor)
export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  private logger = new Logger('ApplicationController', { timestamp: true });

  /**
   * Returns the weather forecast based on the location determined by user's IP address.
   */
  @ApiTags('Weather')
  @ApiOkResponse({
    description: 'Successfully retrieved the weather.',
    type: WeatherResponse,
  })
  @Get()
  getWeather(@Req() req: Request): Promise<WeatherResponse> {
    const userIp = req.header('x-forwarded-for') || req.socket.remoteAddress;
    this.logger.log(
      `Received a request for a weather forecast by IP address ${userIp}`,
    );
    return this.applicationService.getWeatherForIP(userIp);
  }

  /**
   * Returns the weather forecast based on the specified city.
   */
  @ApiTags('Weather')
  @ApiOkResponse({
    description: 'Successfully retrieved the weather.',
    type: WeatherResponse,
  })
  @ApiNotFoundResponse({
    description: 'Specified city was not found.',
    type: WeatherErrorResponse,
  })
  @Get(':city_name')
  getWeatherByCityName(
    @Param('city_name') cityName: string,
  ): Promise<WeatherResponse> {
    this.logger.log(
      `Received a request for a weather forecast by city name '${cityName}'`,
    );
    return this.applicationService.getWeatherForCity(cityName);
  }
}

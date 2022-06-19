import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { WeatherResponse } from '../weather/weather-response.model';
import { ApplicationService } from './application.service';

@Controller('v1/api/weather')
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
    return this.applicationService.getWeather(userIp);
  }
}

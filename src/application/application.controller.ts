import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApplicationService } from './application.service';

@Controller('v1/api/weather')
export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  @Get()
  getWeather(@Req() req: Request) {
    const userIp = req.header('x-forwarded-for') || req.socket.remoteAddress;
    return this.applicationService.getWeather(userIp);
  }
}

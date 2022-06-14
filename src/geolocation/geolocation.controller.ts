import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { GeolocationService } from './geolocation.service';

@Controller('geolocation')
export class GeolocationController {
  constructor(private geolocationService: GeolocationService) {}

  @Get('')
  getLocation(@Req() req: Request) {
    const userIp = req.header('x-forwarded-for') || req.socket.remoteAddress;
    return this.geolocationService.getLocation(userIp);
  }
}

import {
  Controller,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { DevOnlyGuard } from '../common/dev-only.guard';
import { RedisInterceptor } from '../cache-layer/cache-layer.interceptor';
import { GeolocationService } from './geolocation.service';

@UseGuards(DevOnlyGuard)
@Controller('geolocation')
export class GeolocationController {
  constructor(private geolocationService: GeolocationService) {}

  @ApiExcludeEndpoint()
  @Get('')
  @UseInterceptors(RedisInterceptor)
  getLocation(@Req() req: Request) {
    const userIp = req.header('x-forwarded-for') || req.socket.remoteAddress;
    return this.geolocationService.getLocation(userIp);
  }
}

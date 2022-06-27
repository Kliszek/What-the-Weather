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

/**
 * Controller related to the geolocation service.
 * Should be available only for testing purposes in developement stage.
 */
@UseGuards(DevOnlyGuard)
@Controller('geolocation')
export class GeolocationController {
  constructor(private geolocationService: GeolocationService) {}

  /**
   * Returns the longitude and latitude of the user's IP address.
   */
  @ApiExcludeEndpoint()
  @Get('')
  @UseInterceptors(RedisInterceptor)
  getLocation(@Req() req: Request) {
    const userIp = req.header('x-forwarded-for') || req.socket.remoteAddress;
    return this.geolocationService.getLocation(userIp);
  }
}

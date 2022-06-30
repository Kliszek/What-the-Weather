import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { UserIP } from '../application/IP.decorator';
import { IPValidationPipe } from '../application/IPValidation.pipe';
import { DevOnlyGuard } from '../common/dev-only.guard';
import { GeolocationService } from './geolocation.service';

/**
 * Controller related to the geolocation service.
 * Should be available only for testing purposes in development stage.
 */
@UseGuards(DevOnlyGuard)
@Controller('geolocation')
export class GeolocationController {
  constructor(private geolocationService: GeolocationService) {}

  /**
   * Returns the longitude and latitude of the user's IP address.
   */
  @ApiExcludeEndpoint()
  @Get()
  getLocation(@UserIP(new IPValidationPipe()) userIp: string) {
    return this.geolocationService.getLocation(userIp);
  }
}

import { Controller, Get } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';

@Controller('geolocation')
export class GeolocationController {
  constructor(private geolocationService: GeolocationService) {}

  @Get('')
  getLocation() {
    this.geolocationService.getLocation('159.205.253.147');
  }
}

import { Module } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';

@Module({
  providers: [GeolocationService],
})
export class GeolocationModule {}

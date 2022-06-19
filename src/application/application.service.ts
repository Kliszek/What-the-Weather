import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GeolocationResponse } from '../geolocation/geolocation-response.interface';
import { GeolocationService } from '../geolocation/geolocation.service';
import { WeatherResponse } from '../weather/weather-response.interface';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class ApplicationService {
  constructor(
    private geolocationService: GeolocationService,
    private weatherService: WeatherService,
  ) {}

  async getWeather(userIp: string) {
    const ipv4RegEx = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/;
    if (!ipv4RegEx.test(userIp)) {
      throw new InternalServerErrorException('Wrong IP');
    }
    return this.geolocationService
      .getLocation(userIp)
      .then((geolocation: GeolocationResponse) => {
        if (!('latitude' in geolocation && 'longitude' in geolocation)) {
          throw new InternalServerErrorException();
        }
        const { latitude, longitude } = geolocation;
        if (latitude == null || longitude == null) {
          throw new InternalServerErrorException();
        }
        return this.weatherService.getWeather(+latitude, +longitude);
      })
      .catch((error) => {
        console.log(`ERROR GETTING THE WEATHER:\n${JSON.stringify(error)}`);
        throw error;
      });
  }
}

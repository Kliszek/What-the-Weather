import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { GeolocationResponse } from '../geolocation/geolocation-response.model';
import { GeolocationService } from '../geolocation/geolocation.service';
import { WeatherResponse } from '../weather/weather-response.model';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class ApplicationService {
  constructor(
    private geolocationService: GeolocationService,
    private weatherService: WeatherService,
  ) {}

  async getWeatherForIP(userIp: string): Promise<WeatherResponse> {
    const ipv4RegEx = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/;
    if (!ipv4RegEx.test(userIp)) {
      throw new InternalServerErrorException('Wrong IP');
    }
    return this.geolocationService
      .getLocation(userIp)
      .then((geolocation: GeolocationResponse) =>
        this.getWeatherForGeolocation(geolocation),
      )
      .catch((error) => {
        //console.log(`ERROR GETTING THE WEATHER:\n${JSON.stringify(error)}`);
        throw error;
      });
  }

  async getWeatherForCity(cityName: string): Promise<WeatherResponse> {
    if (!cityName) {
      throw new BadRequestException('Wrong city name');
    }
    return this.weatherService.getWeatherByCityName(cityName);
  }

  private async getWeatherForGeolocation(
    geolocation: GeolocationResponse,
  ): Promise<WeatherResponse> {
    if (!('latitude' in geolocation && 'longitude' in geolocation)) {
      throw new InternalServerErrorException();
    }
    const { longitude, latitude } = geolocation;
    if (latitude == null || longitude == null) {
      throw new InternalServerErrorException(
        'Longitude and/or latidude were not returned!',
      );
    }
    return this.weatherService.getWeather(longitude, latitude);
  }
}

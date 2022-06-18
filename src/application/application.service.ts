import { Injectable } from '@nestjs/common';
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
    // const geolocation: GeolocationResponse =
    //   await this.geolocationService.getLocation(userIp);

    // const { latitude, longitude } = geolocation;

    // const weather: WeatherResponse = await this.weatherService.getWeather(
    //   latitude,
    //   longitude,
    // );
    // return weather;
    throw new Error('Not implemented');
  }
}

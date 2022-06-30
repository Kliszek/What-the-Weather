import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GeolocationResponse } from '../geolocation/geolocation-response.model';
import { GeolocationService } from '../geolocation/geolocation.service';
import { WeatherResponse } from '../weather/weather-response.model';
import { WeatherService } from '../weather/weather.service';

/**
 * Main service of the application. Responsible for calling the
 * geolocation and weather services in the right order and returning the result to user.
 */
@Injectable()
export class ApplicationService {
  constructor(
    private geolocationService: GeolocationService,
    private weatherService: WeatherService,
  ) {}

  /**
   * Returns the weather forecast based on the user's IP.
   * @param userIp user's IPv4 address
   */
  async getWeatherForIP(userIp: string): Promise<WeatherResponse> {
    return this.geolocationService
      .getLocation(userIp)
      .then((geolocation: GeolocationResponse) =>
        this.getWeatherForGeolocation(geolocation),
      )
      .catch((error) => {
        throw error;
      });
  }

  /**
   * Returns the weather forecast based on a city name.
   * @param cityName the city name
   */
  async getWeatherForCity(cityName: string): Promise<WeatherResponse> {
    if (!cityName) {
      throw new NotFoundException('Wrong city name');
    }
    return this.weatherService.getWeatherByCityName(cityName);
  }

  /**
   * Returns the weather forecast based on a specific geolocation.
   * @param geolocation the geolocation
   */
  private async getWeatherForGeolocation(
    geolocation: GeolocationResponse,
  ): Promise<WeatherResponse> {
    if (!(geolocation.latitude && geolocation.longitude)) {
      throw new InternalServerErrorException(
        'Longitude and/or latitude were not returned!',
      );
    }
    return this.weatherService.getWeather(geolocation);
  }
}

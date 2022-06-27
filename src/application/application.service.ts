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
 * Regex for an IPv4 address
 */
const IPV4_REGEX = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/;

/**
 * Service responsible for calling the other services in the right order.
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
    //It's the server's fault that it couldn't get the IP right, ...right?
    if (!IPV4_REGEX.test(userIp)) {
      throw new InternalServerErrorException('Wrong IP');
    }
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
    if (!('latitude' in geolocation && 'longitude' in geolocation)) {
      throw new InternalServerErrorException(
        'Longitude and/or latidude were not returned!',
      );
    }
    const { longitude, latitude } = geolocation;
    if (!(latitude && longitude)) {
      throw new InternalServerErrorException(
        'Longitude and/or latidude were not returned!',
      );
    }
    return this.weatherService.getWeather(longitude, latitude);
  }
}

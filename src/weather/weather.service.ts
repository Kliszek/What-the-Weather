import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { RequestObject } from '../common/request-object.interface';
import { CacheLayerService } from '../cache-layer/cache-layer.service';
import { RetryLogic } from '../common/retry-logic';
import {
  WeatherErrorResponse,
  WeatherResponse,
} from './weather-response.model';

/**
 * Service responsible for forecasting the weather.
 */
@Injectable()
export class WeatherService {
  constructor(
    private config: ConfigService,
    private retryLogic: RetryLogic,
    private cacheLayerService: CacheLayerService,
  ) {}
  private logger = new Logger('WeatherService', { timestamp: true });

  /**
   * Returns the weather forecast for a given geolocation.
   * @param longitude the longitude
   * @param latitude the latitude
   */
  async getWeather(
    longitude: string | number,
    latitude: string | number,
  ): Promise<WeatherResponse> {
    if (!(latitude && longitude)) {
      throw new BadRequestException(
        'Latitude or longitude not specified correctly',
      );
    }

    //clearing the expired weather entries
    await this.cacheLayerService.clearWeather().catch((error) => {
      this.logger.error(
        'Error clearing the expired Weather entries from cache!',
        error,
      );
    });

    //trying to get the weather ID from the specified radius from the cache
    this.logger.verbose('Trying to find a weather in the cache...');
    const weatherID = await this.cacheLayerService
      .getWeatherID({ longitude, latitude })
      .catch((error) => {
        this.logger.error(
          `Error getting weather ID from cache: ${error.message}`,
        );
      });
    //the weather was found in the radius
    if (weatherID) {
      this.logger.verbose(`Cache hit!  - Using the closest cached weather!`);
      const weatherData = await this.cacheLayerService
        .getWeather(weatherID)
        .catch((error) => {
          this.logger.error(
            `Error getting weather data from cache: ${error.message}`,
          );
        });
      if (weatherData) {
        this.logger.log('Successfully returning weather response');
        return weatherData as WeatherResponse;
      }
    }

    //the weather was not found in the radius
    //calling the API
    this.logger.verbose('Cache miss! - Sending weather request to API...');
    return this.getWeatherFromAPI(
      this.getRequestObject(longitude, latitude),
    ).then((result) => {
      const ttl: number = this.config.get('CACHE_WEATHER_TTL');
      //awaiting this is not needed and not wanted
      this.cacheLayerService
        .saveWeather(result, { longitude, latitude }, ttl)
        .catch((error) => {
          this.logger.error(
            `Error saving the IP address to cache: ${error.message}`,
          );
        });
      return result;
    });
  }

  /**
   * Returns the weather forecast based on a given city or 404 error.
   * @param cityName the name of the city
   */
  async getWeatherByCityName(cityName: string): Promise<WeatherResponse> {
    //trying to get the weather ID by the specified city from the cache
    this.logger.verbose('Looking for the city location in the cache...');
    const geolocation = await this.cacheLayerService
      .getCityGeolocation(cityName)
      .catch((error) => {
        this.logger.error(
          `Error reading city geolocation from cache: ${error.message}`,
        );
      });
    //the city and its geolocation were found in the cache
    if (geolocation) {
      this.logger.verbose('Cache hit! - city geolocation found');
      return this.getWeather(geolocation.longitude, geolocation.latitude);
    }

    //the city was not found in cache
    //calling the API
    this.logger.verbose(
      'Cache miss! - sending a weather request for the specified city',
    );
    return this.getWeatherFromAPI(this.getRequestObject(cityName)).then(
      (result) => {
        const ttl: number = this.config.get('CACHE_WEATHER_TTL');
        //awaiting this is not needed and not wanted
        const { lon, lat } = result.coord;
        this.cacheLayerService
          .saveWeather(result, { longitude: lon, latitude: lat }, ttl)
          .catch((error) => {
            this.logger.error(
              `Error saving the IP address to cache: ${error.message}`,
            );
          });
        return result;
      },
    );
  }

  /**
   * Calls the API and returns the weather forecast
   * @param requestObject the request object containing the API url and params
   * @param retries number of retries in case of connection failure
   * @param backoff the initial back-off time between retries
   */
  async getWeatherFromAPI(
    requestObject: RequestObject,
    retries: number = this.config.get('RETRIES'),
    backoff: number = this.config.get('BACKOFF'),
  ): Promise<WeatherResponse> {
    const { url, params } = requestObject;

    return axios
      .get(url, { params, timeout: 10000 })
      .then((response) => {
        const data: object = response.data;

        //in case of an error like 'city not found' openweathermap will respond with status 200 :/
        //cod (status code) is a string in case of error, but a number in case of success O.o
        if ('cod' in data && +data['cod'] !== 200) {
          throw new HttpException(
            (<WeatherErrorResponse>data).message,
            +(<WeatherErrorResponse>data).cod,
          );
        }
        this.logger.log('Successfully returning weather response');
        return data as WeatherResponse;
      })
      .catch(async (error: AxiosError) => {
        //retry or throw an error
        return this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(() =>
            this.getWeatherFromAPI(requestObject, retries - 1, backoff * 2),
          );
      });
  }

  /**
   * Returns a request object of the weather API, provides a geolocation.
   * @param lon the longitude
   * @param lat the latitude
   */
  getRequestObject(lon: string | number, lat: string | number): RequestObject;

  /**
   * Returns a request object of the weather API, provides a city name.
   * @param cityName the name of the city
   */
  getRequestObject(cityName: string): RequestObject;

  getRequestObject(p1: string | number, p2?: string | number): RequestObject {
    const data = p2 ? `lon=${p1}&lat=${p2}` : `q=${`${p1}`.replace(' ', '+')}`;
    return {
      url: `${this.config.get('WEATHER_BASEURL')}?${data}`,
      params: {
        appid: this.config.get('WEATHER_ACCESS_KEY'),
        units: 'metric',
        exclude: 'current,minutely,hourly,daily,alerts',
      },
    };
  }
}

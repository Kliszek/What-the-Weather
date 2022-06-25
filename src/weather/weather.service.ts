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

@Injectable()
export class WeatherService {
  constructor(
    private config: ConfigService,
    private retryLogic: RetryLogic,
    private cacheLayerService: CacheLayerService,
  ) {}
  private logger = new Logger('WeatherService', { timestamp: true });

  async getWeather(
    longitude: string | number,
    latitude: string | number,
  ): Promise<WeatherResponse> {
    if (latitude == null || longitude == null) {
      throw new BadRequestException(
        'Latitude or longitude not specified correctly',
      );
    }

    await this.cacheLayerService.clearWeather().catch((error) => {
      this.logger.error(
        'Error clearing the expired Weather entries from cache!',
        error,
      );
    });

    const weatherID = await this.cacheLayerService
      .getWeatherID({ longitude, latitude })
      .catch((error) => {
        this.logger.error('Error getting weather ID from cache!', error);
      });
    if (weatherID) {
      this.logger.verbose(`Cache hit!  - Using the closest cached weather!`);
      const weatherData = await this.cacheLayerService
        .getWeather(weatherID)
        .catch((error) => {
          this.logger.error('Error getting weather data from cache!', error);
        });
      if (weatherData) {
        this.logger.log('Successfully returning weather response');
        return weatherData as WeatherResponse;
      }
    }
    this.logger.verbose('Cache miss! - Sending weather request to API...');
    return this.getWeatherFromAPI(
      this.getRequestObject(longitude, latitude),
    ).then((result) => {
      const ttl: number = this.config.get('CACHE_WEATHER_TTL');
      //awaiting this is not needed and not wanted
      this.cacheLayerService
        .saveWeather(result, { longitude, latitude }, ttl)
        .catch((error) => {
          this.logger.error('Error saving the IP address to cache!', error);
        });
      return result;
    });
  }

  async getWeatherByCityName(cityName: string): Promise<WeatherResponse> {
    this.logger.verbose('Reading city location from cache...');
    const geolocation = await this.cacheLayerService
      .getCityGeolocation(cityName)
      .catch((error) => {
        this.logger.error('Error reading city geolocation from cache!', error);
      });
    if (geolocation) {
      this.logger.verbose('Cache hit! - city geolocation found');
      return this.getWeather(geolocation.longitude, geolocation.latitude);
    }
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
            this.logger.error('Error saving the IP address to cache!', error);
          });
        return result;
      },
    );
  }

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
        return this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(async () =>
            this.getWeatherFromAPI(requestObject, retries - 1, backoff * 2),
          );
        //any errors that may be thrown here I would just forward
      });
  }

  getRequestObject(lon: string | number, lat: string | number): RequestObject;

  getRequestObject(cityName: string): RequestObject;

  getRequestObject(p1: string | number, p2?: string | number): RequestObject {
    const data = p2 ? { lon: p1, lat: p2 } : { q: `${p1}`.replace(' ', '+') };
    return {
      url: `${this.config.get('WEATHER_BASEURL')}`,
      params: {
        ...data,
        appid: this.config.get('WEATHER_ACCESS_KEY'),
        units: 'metric',
        exclude: 'current,minutely,hourly,daily,alerts',
      },
    };
  }
}

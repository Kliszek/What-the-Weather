import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { CacheLayerService } from '../cache-layer/cache-layer.service';
import { RetryLogic } from '../common/retry-logic';
import { WeatherResponse } from './weather-response.model';

@Injectable()
export class WeatherService {
  constructor(
    private config: ConfigService,
    private retryLogic: RetryLogic,
    private cacheLayerService: CacheLayerService,
  ) {}
  private logger = new Logger('WeatherService', { timestamp: true });

  async getWeather(
    latitude: string,
    longitude: string,
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
      .getWeatherID({ latitude, longitude })
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
      if (weatherData) return weatherData as WeatherResponse;
    }
    this.logger.verbose('Cache miss! - Sending weather request to API...');
    return this.getWeatherFromAPI(latitude, longitude).then((result) => {
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

  async getWeatherFromAPI(
    latitude: string,
    longitude: string,
    retries: number = this.config.get('RETRIES'),
    backoff: number = this.config.get('BACKOFF'),
  ): Promise<WeatherResponse> {
    if (latitude == null || longitude == null) {
      throw new BadRequestException(
        'Latitude or longitude not specified correctly',
      );
    }

    const { url, params } = this.getRequestObject(latitude, longitude);

    return axios
      .get(url, { params, timeout: 10000 })
      .then((response) => {
        const data: WeatherResponse = response.data;
        this.logger.verbose('Successfully returning weather response');
        return data;
      })
      .catch(async (error: AxiosError) => {
        return this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(async () =>
            this.getWeatherFromAPI(
              latitude,
              longitude,
              retries - 1,
              backoff * 2,
            ),
          );
        //any errors that may be thrown here I would just forward
      });
  }

  private getRequestObject = (
    lat: string,
    lon: string,
  ): {
    url: string;
    params: object;
  } => ({
    url: `${this.config.get('WEATHER_BASEURL')}`,
    params: {
      lat,
      lon,
      appid: this.config.get('WEATHER_ACCESS_KEY'),
      units: 'metric',
      exclude: 'current,minutely,hourly,daily,alerts',
    },
  });
}

import { BadRequestException, Get, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { CacheLayerService } from 'src/cache-layer/cache-layer.service';
import { RetryLogic } from '../common/retry-logic';
import { WeatherResponse } from './weather-response.model';

@Injectable()
export class WeatherService {
  constructor(
    private config: ConfigService,
    private retryLogic: RetryLogic,
    private cacheLayerService: CacheLayerService,
  ) {}
  private logger = new Logger();

  @Get()
  async getWeather(
    lat: string,
    lon: string,
    retries: number = this.config.get('RETRIES'),
    backoff: number = this.config.get('BACKOFF'),
  ): Promise<WeatherResponse> {
    if (lat == null || lon == null) {
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
      .getWeatherID({ latitude: lat, longitude: lon })
      .catch((error) => {
        this.logger.error('Error getting the Weather ID from cache!', error);
      });
    if (weatherID) {
      this.logger.verbose('Cache hit!');
      return this.cacheLayerService.getWeather(weatherID);
    }
    this.logger.verbose('Cache miss!');

    const { url, params } = this.getRequestObject(lat, lon);

    return axios
      .get(url, { params, timeout: 10000 })
      .then((response) => {
        const data: WeatherResponse = response.data;
        this.logger.verbose('Successfully returning weather response');
        const ttl: number = this.config.get('CACHE_WEATHER_TTL');
        //awaiting this is not needed and not wanted
        this.logger.verbose('Saving received data to cache');
        this.cacheLayerService
          .saveWeather(data, { longitude: lon, latitude: lat }, ttl)
          .catch((error) => {
            this.logger.error('Error saving the IP address to cache!', error);
          });
        return data;
      })
      .catch(async (error: AxiosError) => {
        return this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(async () =>
            this.getWeather(lat, lon, retries - 1, backoff * 2),
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

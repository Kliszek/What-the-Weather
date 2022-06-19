import { Get, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { RetryLogic } from '../common/retry-logic';
import { WeatherResponse } from './weather-response.interface';

@Injectable()
export class WeatherService {
  constructor(private config: ConfigService, private retryLogic: RetryLogic) {}
  private logger = new Logger();

  @Get()
  async getWeather(
    lat: number,
    lon: number,
    retries: number = this.config.get('RETRIES'),
    backoff: number = this.config.get('BACKOFF'),
  ): Promise<WeatherResponse> {
    const { url, params } = this.getRequestObject(lat, lon);

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
            this.getWeather(lat, lon, retries - 1, backoff * 2),
          );
        //any errors that may be thrown here I would just forward
      });
  }

  private getRequestObject = (
    lat: number,
    lon: number,
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

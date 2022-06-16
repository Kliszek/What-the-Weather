import { Get, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { RetryLogic } from '../base-services/retry-logic';
import { WeatherResponse } from './weather-response.interface';

@Injectable()
export class WeatherService {
  constructor(private retryLogic: RetryLogic) {}

  @Get()
  async getWeather(
    lat: number,
    lon: number,
    retries = 5,
    backoff = 300,
  ): Promise<WeatherResponse> {
    const { url, params } = this.getRequestObject(lat, lon);

    return await axios
      .get(url, { params, timeout: 10000 })
      .then((response) => {
        const data: WeatherResponse = response.data;
        return data;
      })
      .catch(async (error: AxiosError) => {
        return await this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(async () => {
            return await this.getWeather(lat, lon, retries - 1, backoff * 2);
          });
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
    url: `${process.env.WEATHER_BASEURL}`,
    params: {
      lat,
      lon,
      appid: process.env.WEATHER_ACCESS_KEY,
      units: 'metric',
      exclude: 'current,minutely,hourly,daily,alerts',
    },
  });
}

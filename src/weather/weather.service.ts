import { Get, Injectable } from '@nestjs/common';
import { WeatherResponse } from './weather-response.interface';

@Injectable()
export class WeatherService {
  @Get()
  getWeather(lat: number, lon: number): WeatherResponse {
    throw new Error('Not implemented');
  }
}

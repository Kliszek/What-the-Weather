import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { WeatherResponse } from 'src/weather/weather-response.model';

interface Geolocation {
  lon: number;
  lat: number;
}

@Injectable()
export class CacheLayerService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async getIPLocation(ipAddress: string): Promise<Geolocation> {
    throw new Error('Not implemented');
  }

  async saveIP(ipAddress: string, lon: number, lat: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async setIPExp(ipAddress: string, exp: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async clearIPs(): Promise<void> {
    throw new Error('Not implemented');
  }

  async getWeatherID(lon: number, lat: number): Promise<string> {
    throw new Error('Not implemented');
  }

  async getWeather(id: string): Promise<WeatherResponse> {
    throw new Error('Not implemented');
  }

  async saveWeather(weather: WeatherResponse): Promise<void> {
    throw new Error('Not implemented');
  }

  async setWeatherExp(id: string, exp: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async clearWeather(): Promise<void> {
    throw new Error('Not implemented');
  }
}

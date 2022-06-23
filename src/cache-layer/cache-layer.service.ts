import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { WeatherResponse } from '../weather/weather-response.model';

interface Geolocation {
  lon: string;
  lat: string;
}

@Injectable()
export class CacheLayerService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private configService: ConfigService,
  ) {}

  private async getGeolocation(
    key: string,
    value: string,
  ): Promise<Geolocation> {
    return this.redis
      .geopos(key, value)
      .then((result) => {
        if (result.length === 0) {
          throw new InternalServerErrorException();
        }
        if (result[0] == null) {
          return null;
        }
        const [lon, lat] = result[0];
        return { lon, lat };
      })
      .catch((error) => {
        console.log(
          `ERROR FETCHING THE GEOLOCATION OF ${value} FROM ${key}`,
          error,
        );
        throw error;
      });
  }

  async getIPGeolocation(ipAddress: string): Promise<Geolocation> {
    return this.getGeolocation(
      this.configService.get('CACHE_IPADDRESSES_KEYNAME'),
      ipAddress,
    );
  }

  async saveIP(
    ipAddress: string,
    geolocation: Geolocation,
    ttl: number,
  ): Promise<void> {
    const expTime = new Date().getTime() + ttl;
    return this.redis
      .pipeline()
      .zadd(
        this.configService.get('CACHE_IPEXP_KEYNAME'),
        'NX',
        expTime,
        ipAddress,
      )
      .geoadd(
        this.configService.get('CACHE_IPADDRESSES_KEYNAME'),
        geolocation.lon,
        geolocation.lat,
        ipAddress,
      )
      .exec()
      .then((results) => this.handlePipeline(results, 1));
  }

  async clearIPs(): Promise<void> {
    return this.redis
      .zrange(
        this.configService.get('CACHE_IPEXP_KEYNAME'),
        0,
        new Date().getTime(),
        'BYSCORE',
      )
      .then(async (ipAddressTable) => {
        if (ipAddressTable.length === 0) {
          return;
        }
        return this.redis
          .pipeline()
          .zrem(
            this.configService.get('CACHE_IPADDRESSES_KEYNAME'),
            ...ipAddressTable,
          )
          .zrem(
            this.configService.get('CACHE_IPEXP_KEYNAME'),
            ...ipAddressTable,
          )
          .exec()
          .then((results) =>
            this.handlePipeline(results, ipAddressTable.length),
          );
      })
      .catch((error) => {
        console.log('ERROR CALLING ZRANGE', error);
        throw error;
      });
  }

  private async handlePipeline(
    results: [error: Error, result: unknown][],
    length: number,
  ): Promise<void> {
    results.forEach((resultError) => {
      const [error, result] = resultError;
      if (error) throw error;
      if (result !== length) {
        console.log('PIPELINE RETURNED VALUE:', result);
        throw new InternalServerErrorException();
      }
    });
  }

  async getWeatherID(geolocation: Geolocation): Promise<string> {
    const { lon, lat } = geolocation;
    const radius: number = this.configService.get('CACHE_WEATHER_RADIUS');
    return this.redis
      .geosearch(
        this.configService.get('CACHE_WEATHERID_KEYNAME'),
        'FROMLONLAT',
        lon,
        lat,
        'BYRADIUS',
        radius,
        'KM',
        'ASC',
        'COUNT',
        1,
      )
      .then((result: string[]) => {
        if (result.length === 0) {
          return null;
        }
        return result[0];
      })
      .catch((error) => {
        console.log('ERROR SEARCHING FOR THE CLOSEST WEATHER DATA', error);
        throw error;
      });
  }

  async getWeather(id: string): Promise<WeatherResponse> {
    return this.redis
      .hget(this.configService.get('CACHE_WEATHERDATA_KEYNAME'), id)
      .then((result) => {
        if (result == null) {
          throw new InternalServerErrorException();
        }
        return JSON.parse(result);
      });
  }

  async saveWeather(
    weather: WeatherResponse,
    geolocation: Geolocation,
    ttl: number,
  ): Promise<void> {
    const expTime = new Date().getTime() + ttl;
    const weatherStr = JSON.stringify(weather);
    const weatherID: string = createHash('md5')
      .update(weatherStr)
      .digest('hex');

    return this.redis
      .pipeline()
      .zadd(
        this.configService.get('CACHE_WEATHEREXP_KEYNAME'),
        'NX',
        expTime,
        weatherID,
      )
      .hset(
        this.configService.get('CACHE_WEATHERDATA_KEYNAME'),
        weatherID,
        weatherStr,
      )
      .geoadd(
        this.configService.get('CACHE_WEATHERID_KEYNAME'),
        geolocation.lon,
        geolocation.lat,
        weatherID,
      )
      .exec()
      .then((results) => this.handlePipeline(results, 1));
  }

  async clearWeather(): Promise<void> {
    return this.redis
      .zrange(
        this.configService.get('CACHE_WEATHEREXP_KEYNAME'),
        0,
        new Date().getTime(),
        'BYSCORE',
      )
      .then(async (weatherIDTable) => {
        if (weatherIDTable.length === 0) {
          return;
        }
        return this.redis
          .pipeline()
          .hdel(
            this.configService.get('CACHE_WEATHERDATA_KEYNAME'),
            ...weatherIDTable,
          )
          .zrem(
            this.configService.get('CACHE_WEATHERID_KEYNAME'),
            ...weatherIDTable,
          )
          .zrem(
            this.configService.get('CACHE_WEATHEREXP_KEYNAME'),
            ...weatherIDTable,
          )
          .exec()
          .then((results) =>
            this.handlePipeline(results, weatherIDTable.length),
          );
      })
      .catch((error) => {
        console.log('ERROR CALLING ZRANGE', error);
        throw error;
      });
  }
}

import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { GeolocationResponse } from '../geolocation/geolocation-response.model';
import { WeatherResponse } from '../weather/weather-response.model';

@Injectable()
export class CacheLayerService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private configService: ConfigService,
  ) {}

  private logger = new Logger('CacheService', { timestamp: true });

  private async getGeolocation(
    key: string,
    value: string,
  ): Promise<GeolocationResponse> {
    this.logger.verbose('Trying to fetch IP geolocation from the cache...');
    return this.redis
      .geopos(key, value)
      .then((result) => {
        if (result.length === 0) {
          throw new InternalServerErrorException(
            "Couldn't fetch IP geolocation from cache!",
          );
        }
        if (result[0] == null) {
          return null;
        }
        const [longitude, latitude] = result[0];
        return { longitude, latitude };
      })
      .catch((error) => {
        console.log(
          `ERROR FETCHING THE GEOLOCATION OF ${value} FROM ${key}`,
          error,
        );
        throw error;
      });
  }

  async getIPGeolocation(ipAddress: string): Promise<GeolocationResponse> {
    return this.getGeolocation(
      this.configService.get('CACHE_IPADDRESSES_KEYNAME'),
      ipAddress,
    );
  }

  async saveIP(
    ipAddress: string,
    geolocation: GeolocationResponse,
    ttl: number,
  ): Promise<void> {
    const expTime = new Date().getTime() + ttl;
    this.logger.verbose('Saving IP address in the cache...');
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
        geolocation.longitude,
        geolocation.latitude,
        ipAddress,
      )
      .exec()
      .then((results) => this.handlePipeline(results, 1));
  }

  async clearIPs(): Promise<void> {
    this.logger.verbose(
      `Checking if there are expired IP addresses in the cache...`,
    );
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
        this.logger.verbose(
          `Deleting ${ipAddressTable.length} expired IP addresses from cache...`,
        );
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
        throw new InternalServerErrorException(
          `Unexpected number of deleted entries from cache: ${result} (should be ${length})`,
        );
      }
    });
  }

  async getWeatherID(geolocation: GeolocationResponse): Promise<string> {
    const { longitude, latitude } = geolocation;
    const radius: number = this.configService.get('CACHE_WEATHER_RADIUS');
    this.logger.verbose(
      `Checking if there is any weather ID in ${radius} km range in the cache...`,
    );
    return this.redis
      .geosearch(
        this.configService.get('CACHE_WEATHERID_KEYNAME'),
        'FROMLONLAT',
        longitude,
        latitude,
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
    this.logger.verbose('Fetching Weather data from the cache...');
    return this.redis
      .hget(this.configService.get('CACHE_WEATHERDATA_KEYNAME'), id)
      .then((result) => {
        if (result == null) {
          throw new InternalServerErrorException(
            "Couldn't fetch weather data from cache!",
          );
        }
        return JSON.parse(result);
      });
  }

  async saveWeather(
    weather: WeatherResponse,
    geolocation: GeolocationResponse,
    ttl: number,
  ): Promise<void> {
    const expTime = new Date().getTime() + ttl;
    const weatherStr = JSON.stringify(weather);
    const weatherID: string = createHash('md5')
      .update(weatherStr)
      .digest('hex');

    this.logger.verbose('Saving weather data in the cache...');
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
        geolocation.longitude,
        geolocation.latitude,
        weatherID,
      )
      .exec()
      .then(async (results) =>
        this.handlePipeline(results, 1).then((result) => {
          this.saveCity(weather.name, geolocation);
          return result;
        }),
      );
  }

  async clearWeather(): Promise<void> {
    this.logger.verbose(
      `Checking if there are expired weather entries in the cache...`,
    );
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
        this.logger.verbose(
          `Deleting ${weatherIDTable.length} expired weather entries from cache...`,
        );
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

  async saveCity(
    cityName: string,
    geolocation: GeolocationResponse,
  ): Promise<void> {
    if (!cityName) return;
    this.logger.verbose(`Adding city '${cityName}' to the city list`);
    return this.redis
      .pipeline()
      .geoadd(
        this.configService.get('CACHE_CITIES_KEYNAME'),
        geolocation.longitude,
        geolocation.latitude,
        cityName,
      )
      .exec()
      .then((results) => this.handlePipeline(results, 1))
      .catch((error) => {
        console.log('ERROR CALLING GEOADD', error);
        throw error;
      });
  }

  async getCityGeolocation(cityName: string): Promise<GeolocationResponse> {
    return this.getGeolocation(
      this.configService.get('CACHE_CITIES_KEYNAME'),
      cityName,
    );
  }
}

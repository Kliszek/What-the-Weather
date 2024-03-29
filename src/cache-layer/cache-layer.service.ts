import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { GeolocationResponse } from '../geolocation/geolocation-response.model';
import { WeatherResponse } from '../weather/weather-response.model';

/**
 * Service responsible for reading and saving data in cache.
 */
@Injectable()
export class CacheLayerService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  private logger = new Logger('CacheService', { timestamp: true });

  /**
   * Returns geolocation of a given value (or null) from the cache.
   * @param key Database key name of the sorted set
   * @param value The value in the sorted set
   */
  private async getGeolocation(
    key: string,
    value: string,
  ): Promise<GeolocationResponse> {
    this.logger.verbose('Trying to fetch IP geolocation from the cache...');
    return this.redis.geopos(key, value).then((result) => {
      //this shouldn't normally happen
      if (result.length === 0) {
        throw new InternalServerErrorException(
          "Couldn't fetch geolocation from cache!",
        );
      }
      //the geolocation was not found
      if (result[0] == null) {
        return null;
      }
      //the geolocation was found
      const [longitude, latitude] = result[0];
      return { longitude, latitude };
    });
  }

  /**
   * Returns the geolocation of the given IP address (or null) from the cache.
   * @param ipAddress IPv4 address
   */
  async getIPGeolocation(ipAddress: string): Promise<GeolocationResponse> {
    return this.getGeolocation(
      this.configService.get('CACHE_IPADDRESSES_KEYNAME'),
      ipAddress,
    );
  }

  /**
   * Saves the given IP with its assigned geolocation in the cache.
   * Also sets the TTL.
   * @param ipAddress IPv4 address
   * @param geolocation geolocation that should be assigned to this IP
   * @param ttl Time To Live, how long should this entry be valid
   */
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
      .then((results) => this.handlePipeline(results, 1, 'saveIP'));
  }

  /**
   * Looks for expired IP addresses in the cache and removes them.
   */
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
            this.handlePipeline(results, ipAddressTable.length, 'clearIPs'),
          );
      });
  }

  /**
   * Checks for any improprieties in the return value of the pipeline exec() function
   * and logs them.
   * @param results the results array
   * @param length expected number of elements that should be affected
   * @param context the name of the method this function was called from, used in logs
   */
  private async handlePipeline(
    results: [error: Error, result: unknown][],
    length: number,
    context: string,
  ): Promise<void> {
    results.forEach((resultError, i) => {
      const [error, result] = resultError;
      if (error)
        this.logger.error(
          `Error in ${context} pipeline (${i}): ${error.message}`,
        );
      else if (result !== length) {
        this.logger.warn(
          `Unexpected number of affected entries in cache in ${context}: ${result} (should be ${length})`,
        );
      }
    });
  }

  /**
   * Returns the weather ID, which is the closest to the given geolocation (or null).
   * Only searches in a radius specified in the config file.
   * @param geolocation the geolocation to be searched around
   */
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
        'km',
        'ASC',
        'COUNT',
        1,
      )
      .then((result: string[]) => {
        if (result.length === 0) {
          return null;
        }
        return result[0];
      });
  }

  /**
   * Returns the weather JSON data based on the given ID from the cache.
   * @param id the weather ID
   */
  async getWeather(id: string): Promise<WeatherResponse> {
    this.logger.verbose('Fetching Weather data from the cache...');
    return this.redis
      .hget(this.configService.get('CACHE_WEATHERDATA_KEYNAME'), id)
      .then((result) => {
        //the weather SHOULD be in the cache if its ID was already fetched
        if (result == null) {
          throw new InternalServerErrorException(
            "Couldn't fetch weather data from cache!",
          );
        }
        return JSON.parse(result);
      });
  }

  /**
   * Saves the given weather data with its assigned geolocation in the cache.
   * Generates a weather ID.
   * Also sets the TTL.
   * @param weather the weather data in JSON format
   * @param geolocation the geolocation that the weather should be assigned to
   * @param ttl Time To Live, how long should this entry be valid
   */
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
        this.handlePipeline(results, 1, 'saveWeather').then(async (result) => {
          this.eventEmitter.emit('saveCity', weather.name, geolocation);
          return result;
        }),
      );
  }

  /**
   * Looks for expired weather entries in the cache and removes them.
   */
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
            this.handlePipeline(results, weatherIDTable.length, 'clearWeather'),
          );
      });
  }

  /**
   * Saves the given city with its assigned geolocation in the cache.
   * Does not set TTL.
   * @param payload object consisting of the weather data in JSON format and the geolocation that the city should be assigned to
   */
  @OnEvent('saveCity')
  async saveCity(cityName: string, geolocation: GeolocationResponse) {
    if (!cityName) return;
    const cityNameNormalized = this.normalizeString(cityName);
    this.logger.verbose(
      `Adding city '${cityNameNormalized}' to the city list...`,
    );
    return this.redis
      .pipeline()
      .geoadd(
        this.configService.get('CACHE_CITIES_KEYNAME'),
        geolocation.longitude,
        geolocation.latitude,
        cityNameNormalized,
      )
      .exec()
      .then((results) => {
        results.forEach((resultError) => {
          const [error, result] = resultError;
          if (error) this.logger.error(`Error in saveCity: ${error.message}`);
          else
            this.logger.verbose(
              `City '${cityNameNormalized}' ${
                result ? 'successfully' : 'was already'
              } saved in cache`,
            );
        });
      });
  }

  /**
   * Returns the geolocation of the given city (or null) from the cache.
   * @param cityName the name of the city
   */
  async getCityGeolocation(cityName: string): Promise<GeolocationResponse> {
    const cityNameNormalized = this.normalizeString(cityName);
    return this.getGeolocation(
      this.configService.get('CACHE_CITIES_KEYNAME'),
      cityNameNormalized,
    );
  }

  private normalizeString = (text: string) =>
    text
      .replace('ł', 'l')
      .replace('Ł', 'L')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
}

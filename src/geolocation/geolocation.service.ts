import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { CacheLayerService } from 'src/cache-layer/cache-layer.service';
import { RetryLogic } from '../common/retry-logic';
import {
  GeolocationResponse,
  GeolocationErrorResponse,
} from './geolocation-response.model';

@Injectable()
export class GeolocationService {
  constructor(
    private config: ConfigService,
    private retryLogic: RetryLogic,
    private cacheLayerService: CacheLayerService,
  ) {}
  private logger = new Logger('GeolocationService', { timestamp: true });

  async getLocation(ipAddress: string): Promise<GeolocationResponse> {
    await this.cacheLayerService.clearIPs().catch((error) => {
      this.logger.error(
        'Error clearing the expired IP addresses from cache!',
        error,
      );
    });

    const cachedGeolocation = await this.cacheLayerService
      .getIPGeolocation(ipAddress)
      .catch((error) => {
        this.logger.error(
          'Error getting the IP address location from cache!',
          error,
        );
      });
    if (cachedGeolocation) {
      this.logger.verbose(
        `Cache hit! - Using cached geolocation for ${ipAddress}`,
      );
      return cachedGeolocation as GeolocationResponse;
    }
    this.logger.verbose('Cache miss! - Sending geolocation request to API...');
    return this.getLocationFromAPI(ipAddress);
  }

  async getLocationFromAPI(
    ipAddress: string,
    retries: number = this.config.get('RETRIES'),
    backoff: number = this.config.get('BACKOFF'),
    fallback = false,
  ): Promise<GeolocationResponse> {
    const { url, params } = this.getRequestObject(ipAddress, fallback);

    return axios
      .get(url, { params, timeout: 10000 })
      .then(async (response) => {
        const data: object = response.data;
        //in case of errors ipstack returns status 200 and an error object :/
        if ('success' in data && data['success'] === false) {
          throw new BadRequestException(
            `Incorrect request: ${(<GeolocationErrorResponse>data).error.info}`,
          );
        }
        if (!('longitude' in data && 'latitude' in data)) {
          throw new InternalServerErrorException(
            'Longitude and/or latidude were not returned!',
          );
        }
        this.logger.verbose('Successfully returning geolocation response');
        const result = data as GeolocationResponse;
        const ttl: number = this.config.get('CACHE_IP_TTL');
        //awaiting this is not needed and not wanted
        this.cacheLayerService.saveIP(ipAddress, result, ttl).catch((error) => {
          this.logger.error('Error saving the IP address to cache!', error);
        });
        return result;
      })
      .catch(async (error: AxiosError) => {
        return this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(async () => {
            return this.getLocationFromAPI(
              ipAddress,
              retries - 1,
              backoff * 2,
              fallback,
            );
          })
          .catch(async (error) => {
            if (!fallback) {
              return this.getLocationFromAPI(ipAddress, 3, 300, true);
            } else {
              throw error;
            }
          });
      });
  }

  private getRequestObject(
    ipAddress: string,
    fallback = false,
  ): {
    url: string;
    params: object;
  } {
    if (!fallback)
      return {
        url: `${this.config.get('GEOLOCATION_BASEURL')}/${ipAddress}`,
        params: {
          access_key: this.config.get('GEOLOCATION_ACCESS_KEY'),
          output: 'json',
          fields: 'latitude,longitude',
        },
      };
    else
      return {
        url: this.config.get('GEOLOCATION_BASEURL2'),
        params: {
          ip: ipAddress,
          apiKey: this.config.get('GEOLOCATION_ACCESS_KEY2'),
          fields: 'latitude,longitude',
        },
      };
  }
}

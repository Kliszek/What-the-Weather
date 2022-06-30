import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { RequestObject } from '../common/request-object.interface';
import { CacheLayerService } from '../cache-layer/cache-layer.service';
import { RetryLogic } from '../common/retry-logic';
import {
  GeolocationResponse,
  GeolocationErrorResponse,
} from './geolocation-response.model';

/**
 * Service responsible for locating the user by IP.
 */
@Injectable()
export class GeolocationService {
  constructor(
    private config: ConfigService,
    private retryLogic: RetryLogic,
    private cacheLayerService: CacheLayerService,
  ) {}
  private logger = new Logger('GeolocationService', { timestamp: true });

  /**
   * Returns the geolocation of a given IP address
   * @param ipAddress IPv4 address
   */
  async getLocation(ipAddress: string): Promise<GeolocationResponse> {
    //clearing the expired IP addresses
    await this.cacheLayerService.clearIPs().catch((error) => {
      this.logger.error(
        `Error clearing the expired IP addresses from cache: ${error.message}`,
      );
    });

    //trying to get the IP address from the cache
    const cachedGeolocation = await this.cacheLayerService
      .getIPGeolocation(ipAddress)
      .catch((error) => {
        this.logger.error(
          `Error getting the IP address location from cache: ${error.message}`,
        );
      });
    //the IP address was found in the cache
    if (cachedGeolocation) {
      this.logger.verbose(
        `Cache hit! - Using cached geolocation for ${ipAddress}`,
      );
      return cachedGeolocation as GeolocationResponse;
    }
    //the IP address was not found in the cache
    //calling the API
    this.logger.verbose('Cache miss! - Sending geolocation request to API...');
    return this.getLocationFromAPI(this.getRequestObject(ipAddress)).then(
      (result) => {
        const ttl: number = this.config.get('CACHE_IP_TTL');
        //awaiting this is not needed and not wanted
        this.cacheLayerService.saveIP(ipAddress, result, ttl).catch((error) => {
          this.logger.error(
            `Error saving the IP address to cache: ${error.message}`,
          );
        });
        return result;
      },
    );
  }

  /**
   * Calls the API and returns the geolocation
   * @param requestObject the request object containing the API url and params
   * @param retries number of retries in case of connection failure
   * @param backoff the initial back-off time between retries
   */
  async getLocationFromAPI(
    requestObject: RequestObject,
    retries: number = this.config.get('RETRIES'),
    backoff: number = this.config.get('BACKOFF'),
  ): Promise<GeolocationResponse> {
    const { url, params } = requestObject;

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
            'Longitude and/or latitude were not returned!',
          );
        }
        this.logger.verbose('Successfully returning geolocation response');
        return data as GeolocationResponse;
      })
      .catch(async (error: AxiosError) => {
        return this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(() =>
            //retry
            this.getLocationFromAPI(requestObject, retries - 1, backoff * 2),
          )
          .catch(async (error) => {
            //if an error was thrown, try again with a fallback API
            if (requestObject.useFallback) {
              return this.getLocationFromAPI(
                requestObject.useFallback(),
                3,
                300,
              );
            } else {
              throw error;
            }
          });
      });
  }

  /**
   * Returns a request object of the geolocation API
   * @param ipAddress IPv4 address
   * @param index the index of the returned API
   */
  getRequestObject = (ipAddress: string, index = 0): RequestObject =>
    [
      {
        url: `${this.config.get('GEOLOCATION_BASEURL')}/${ipAddress}`,
        params: {
          access_key: this.config.get('GEOLOCATION_ACCESS_KEY'),
          output: 'json',
          fields: 'latitude,longitude',
        },
        useFallback: () => this.getRequestObject(ipAddress, 1),
      },
      {
        url: this.config.get('GEOLOCATION_BASEURL2'),
        params: {
          ip: ipAddress,
          apiKey: this.config.get('GEOLOCATION_ACCESS_KEY2'),
          fields: 'latitude,longitude',
        },
      },
    ][index];
}

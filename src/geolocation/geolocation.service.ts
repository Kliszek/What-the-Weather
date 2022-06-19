import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { RetryLogic } from '../common/retry-logic';
import {
  GeolocationResponse,
  GeolocationErrorResponse,
} from './geolocation-response.interface';

@Injectable()
export class GeolocationService {
  constructor(private config: ConfigService, private retryLogic: RetryLogic) {}
  private logger = new Logger();

  async getLocation(
    ipAddress: string,
    retries: number = this.config.get('RETRIES'),
    backoff: number = this.config.get('BACKOFF'),
    fallback = false,
  ): Promise<GeolocationResponse> {
    const { url, params } = this.getRequestObject(ipAddress, fallback);

    return axios
      .get(url, { params, timeout: 10000 })
      .then((response) => {
        const data: object = response.data;
        //in case of errors ipstack returns status 200 and an error object :/
        if ('success' in data && data['success'] === false) {
          throw new BadRequestException(
            `Incorrect request: ${(<GeolocationErrorResponse>data).error.info}`,
          );
        }
        if (!('longitude' in data && 'latitude' in data)) {
          throw new InternalServerErrorException();
        }
        this.logger.verbose('Successfully returning geolocation response');
        return data as GeolocationResponse;
      })
      .catch(async (error: AxiosError) => {
        return this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(async () => {
            return this.getLocation(
              ipAddress,
              retries - 1,
              backoff * 2,
              fallback,
            );
          })
          .catch(async (error) => {
            if (!fallback) {
              return this.getLocation(ipAddress, 3, 300, true);
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
          fields: 'ip,city,latitude,longitude',
        },
      };
    else
      return {
        url: this.config.get('GEOLOCATION_BASEURL2'),
        params: {
          ip: ipAddress,
          apiKey: this.config.get('GEOLOCATION_ACCESS_KEY2'),
          fields: 'city,latitude,longitude',
        },
      };
  }
}

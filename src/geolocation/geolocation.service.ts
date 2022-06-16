import { HttpException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { RetryLogic } from '../base-services/retry-logic';
import {
  GeolocationResponse,
  GeolocationErrorResponse,
} from './geolocation-response.interface';

@Injectable()
export class GeolocationService {
  constructor(private retryLogic: RetryLogic) {}
  private logger = new Logger();

  async getLocation(
    ipAddress: string,
    retries = 5,
    backoff = 300,
    fallback = false,
  ): Promise<GeolocationResponse> {
    const { url, params } = this.getRequestObject(ipAddress, fallback);

    return await axios
      .get(url, { params, timeout: 10000 })
      .then((response) => {
        const data: object = response.data;
        //in case of errors ipstack returns status 200 and an error object :/
        if ('success' in data && data['success'] === false) {
          throw new HttpException(
            `Incorrect request: ${(<GeolocationErrorResponse>data).error.info}`,
            400,
          );
        }
        this.logger.verbose('Successfully returning geolocation response');
        return data as GeolocationResponse;
      })
      .catch(async (error: AxiosError) => {
        return await this.retryLogic
          .checkIfRetry(retries, backoff, error)
          .then(async () => {
            return await this.getLocation(
              ipAddress,
              retries - 1,
              backoff * 2,
              fallback,
            );
          })
          .catch(async (error) => {
            if (!fallback) {
              return await this.getLocation(ipAddress, 3, 300, true);
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
        url: `${process.env.GEOLOCATION_BASEURL}/${ipAddress}`,
        params: {
          access_key: process.env.GEOLOCATION_ACCESS_KEY,
          output: 'json',
          fields: 'ip,city,latitude,longitude',
        },
      };
    else
      return {
        url: process.env.GEOLOCATION_BASEURL2,
        params: {
          ip: ipAddress,
          apiKey: process.env.GEOLOCATION_ACCESS_KEY2,
          fields: 'city,latitude,longitude',
        },
      };
  }
}

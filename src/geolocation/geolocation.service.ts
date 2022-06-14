import { HttpException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  GeolocationResponse,
  GeolocationErrorResponse,
} from './geolocation-response.interface';

@Injectable()
export class GeolocationService {
  private logger = new Logger();

  async getLocation(
    ipAddress: string,
    retries = 5,
    backoff = 300,
    fallback = false,
  ): Promise<GeolocationResponse> {
    const reqObj = this.getRequestObject(ipAddress, fallback);

    return await axios
      .get(reqObj.url, { params: reqObj.params })
      .then((response) => {
        const data: object = response.data;
        //in case of errors ipstack returns status 200 and an error object :/
        if ('success' in data && data['success'] === false) {
          throw new HttpException(
            `Incorrect request: ${(<GeolocationErrorResponse>data).error.info}`,
            400,
          );
        }
        return data as GeolocationResponse;
      })
      .catch(async (error: AxiosError) => {
        const retry_codes = [408, 500, 502, 503, 504, 522, 524];
        //no response may indicate timeout or network error. For sure not a bad request
        if (
          !error.response ||
          (error.response?.status &&
            retry_codes.includes(+error.response.status))
        ) {
          if (retries <= 0) {
            if (!fallback) {
              this.logger.warn(
                "Couldn't reach the API, trying to use the fallback API!",
              );
              return await this.getLocation(ipAddress, 3, 300, true);
            }
            throw new HttpException("Couldn't reach after retries.", 503);
          }
          this.logger.warn(
            `Couldn't reach the API, ${
              retries - 1
            } retries remaining. Back-off = ${backoff} ms`,
          );
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                this.getLocation(ipAddress, retries - 1, backoff * 2, fallback),
              );
            }, backoff);
          });
        }
        throw new HttpException(
          `${error.message}`,
          error.status ? +error.status : 500,
        );
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

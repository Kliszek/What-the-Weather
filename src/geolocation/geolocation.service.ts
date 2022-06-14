import { Injectable, Logger } from '@nestjs/common';
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
    retries = 3,
    backoff = 300,
  ): Promise<GeolocationResponse> {
    const requestUrl = `${process.env.GEOLOCATION_BASEURL}/${ipAddress}?access_key=${process.env.GEOLOCATION_ACCESS_KEY}`;

    return await axios
      .get(requestUrl)
      .then((response) => {
        const data: object = response.data;
        if ('success' in data && data['success'] === false) {
          throw new Error(
            `Incorrect request: ${(<GeolocationErrorResponse>data).error.info}`,
          );
        }
        return data as GeolocationResponse;
      })
      .catch(async (error: AxiosError) => {
        const retry_codes = [408, 500, 502, 503, 504, 522, 524];
        console.log(`STATUS: ${error}`);
        if (
          error.response?.status &&
          retry_codes.includes(+error.response.status)
        ) {
          console.log('SHOULD RETRY');
          if (retries <= 0) {
            throw new Error("Couldn't reach after retries.");
          }
          this.logger.warn(
            `Couldn't reach the API, ${
              retries - 1
            } retries remaining. Back-off = ${backoff} ms`,
          );
          await setTimeout(() => {
            return this.getLocation(ipAddress, retries - 1, backoff * 2);
          }, backoff);
        }
        throw new Error(`lolo ${error}`);
      });
  }
}

import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError } from 'axios';

/**
 * Status codes after which the request should be sent again.
 */
const RETRY_CODES = [408, 500, 502, 503, 504, 522, 524];

/**
 * A provider containing functions related to the retry logic.
 */
@Injectable()
export class RetryLogic {
  private logger = new Logger('RetryLogic', { timestamp: true });

  /**
   * Resolves if the request should be retried or rejects to an error.
   * @param retries maximal number of retries that should be made
   * @param backoff the initial time between requests
   * @param error the error received from as the last response
   */
  async checkIfRetry(
    retries: number,
    backoff: number,
    error: AxiosError,
  ): Promise<void> {
    //no response may indicate timeout or network error. For sure not a bad request
    if (
      !error.response ||
      (error.response?.status && RETRY_CODES.includes(+error.response.status))
    ) {
      if (retries <= 0) {
        this.logger.error(
          `Couldn't reach the API after all retries! Error message: ${error.message}`,
        );
        throw new ServiceUnavailableException(
          "Couldn't reach API after retries.",
        );
      } else {
        this.logger.error(`Error: ${error.message}`);
        this.logger.warn(
          `Couldn't reach the API, ${
            retries - 1
          } retries remaining. Back-off = ${backoff} ms`,
        );
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, backoff);
        });
      }
    }

    this.logger.error(
      `Couldn't reach the API! Error message: ${error.message}`,
    );
    throw new HttpException(
      `${error.message}`,
      error.status ? +error.status : 500,
    );
  }
}

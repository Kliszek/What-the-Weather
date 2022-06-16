import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';

@Injectable()
export class RetryLogic {
  async checkIfRetry(
    retries: number,
    backoff: number,
    error: AxiosError,
  ): Promise<void> {
    const logger = new Logger();
    const retry_codes = [408, 500, 502, 503, 504, 522, 524];
    //no response may indicate timeout or network error. For sure not a bad request
    if (
      !error.response ||
      (error.response?.status && retry_codes.includes(+error.response.status))
    ) {
      if (retries <= 0) {
        throw new HttpException("Couldn't reach API after retries.", 503);
      } else {
        logger.warn(
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

    logger.error(`Couldn't reach the API! Error message: ${error.message}`);
    throw new HttpException(
      `${error.message}`,
      error.status ? +error.status : 500,
    );
  }
}

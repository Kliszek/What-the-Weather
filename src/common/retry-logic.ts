import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';

const RETRY_CODES = [408, 500, 502, 503, 504, 522, 524];

@Injectable()
export class RetryLogic {
  async checkIfRetry(
    retries: number,
    backoff: number,
    error: AxiosError,
  ): Promise<void> {
    const logger = new Logger();
    //no response may indicate timeout or network error. For sure not a bad request
    if (
      !error.response ||
      (error.response?.status && RETRY_CODES.includes(+error.response.status))
    ) {
      if (retries <= 0) {
        logger.error(
          `Couldn't reach the API after all retries! Error message: ${error.message}`,
        );
        throw new HttpException("Couldn't reach API after retries.", 503);
      } else {
        logger.error(`Error: ${error.message}`);
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

import { Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  WeatherErrorResponse,
  WeatherResponse,
} from '../weather/weather-response.model';
import { ApplicationService } from './application.service';
import { UserIP } from './IP.decorator';
import { IPValidationPipe } from './IPValidation.pipe';

/**
 * Controller related to the main services served by the app.
 */
@Controller('v1/api/weather')
@UseGuards(ThrottlerGuard)
export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  private logger = new Logger('ApplicationController', { timestamp: true });

  /**
   * Returns the weather forecast based on the location determined by user's IP address.
   */
  @ApiTags('Weather')
  @ApiOkResponse({
    description: 'Successfully retrieved the weather.',
    type: WeatherResponse,
  })
  @Get()
  getWeather(
    @UserIP(new IPValidationPipe()) userIP: string,
  ): Promise<WeatherResponse> {
    this.logger.verbose(
      `Received a request for a weather forecast by IP address ${userIP}`,
    );
    return this.applicationService.getWeatherForIP(userIP);
  }

  /**
   * Returns the weather forecast based on the specified city.
   */
  @ApiTags('Weather')
  @ApiOkResponse({
    description: 'Successfully retrieved the weather.',
    type: WeatherResponse,
  })
  @ApiNotFoundResponse({
    description: 'Specified city was not found.',
    type: WeatherErrorResponse,
  })
  @Get(':city_name')
  getWeatherByCityName(
    @Param('city_name') cityName: string,
  ): Promise<WeatherResponse> {
    this.logger.verbose(
      `Received a request for a weather forecast by city name '${cityName}'`,
    );
    return this.applicationService.getWeatherForCity(cityName);
  }
}

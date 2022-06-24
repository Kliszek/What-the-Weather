import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { WeatherResponse } from '../weather/weather-response.model';
import { WeatherService } from '../weather/weather.service';
import { GeolocationService } from '../geolocation/geolocation.service';
import { GeolocationResponse } from '../geolocation/geolocation-response.model';
import { InternalServerErrorException } from '@nestjs/common';
import {
  mockedGeolocationResponse,
  mockedIPAddress,
  mockedWeatherResponse,
} from '../common/mocked-values';
import {
  mockGeolocationService,
  mockWeatherService,
} from '../common/mocked-services';

describe('ApplicationService', () => {
  let applicationService: ApplicationService;
  let weatherService: { getWeather: jest.Mock };
  let geolocationService: { getLocation: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        { provide: GeolocationService, useFactory: mockGeolocationService },
        { provide: WeatherService, useFactory: mockWeatherService },
      ],
    }).compile();

    applicationService = module.get<ApplicationService>(ApplicationService);
    weatherService = module.get(WeatherService);
    geolocationService = module.get(GeolocationService);

    weatherService.getWeather.mockResolvedValue(mockedWeatherResponse);
    geolocationService.getLocation.mockResolvedValue(mockedGeolocationResponse);
  });

  it('should be defined', () => {
    expect(applicationService).toBeDefined();
  });

  describe('getWeather', () => {
    it('calls the geolocation API and the weather API and returns the response', async () => {
      const result = await applicationService.getWeatherForIP(mockedIPAddress);
      expect(result).toEqual(mockedWeatherResponse);
    });

    it("throws an error when it can't reach the geolocation API", async () => {
      geolocationService.getLocation.mockRejectedValue(
        new InternalServerErrorException(),
      );
      await expect(
        applicationService.getWeatherForIP(mockedIPAddress),
      ).rejects.toThrow();
    });

    it("throws an error when it can't reach the weather API", async () => {
      weatherService.getWeather.mockRejectedValue(
        new InternalServerErrorException(),
      );
      await expect(
        applicationService.getWeatherForIP(mockedIPAddress),
      ).rejects.toThrow();
    });

    it('handles latitude and longitude being given as strings', async () => {
      const geolocationResponseString: GeolocationResponse = {
        // ip: '155.52.187.7',
        // city: 'Boston',
        latitude: '42.3424',
        longitude: '-71.0878',
      };
      geolocationService.getLocation.mockResolvedValue(
        geolocationResponseString,
      );
      const result = await applicationService.getWeatherForIP(mockedIPAddress);
      expect(result).toEqual(mockedWeatherResponse);
    });

    //not like 'asd' could happen, but I want to at least assure, that I have a valid IPv4 address,
    //not an empty string or IPv6, (ipstack can't handle IPv4-mapped IPv6 addresses for some reason)
    it("should throw an error when didn't receive a valid IPv4 address", () => {
      expect(applicationService.getWeatherForIP('')).rejects.toThrow();
      expect(applicationService.getWeatherForIP('asd')).rejects.toThrow();
      expect(applicationService.getWeatherForIP('1.2.3.4.5')).rejects.toThrow();
      expect(applicationService.getWeatherForIP('3.2.287.1')).rejects.toThrow();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { WeatherResponse } from '../weather/weather-response.model';
import { WeatherService } from '../weather/weather.service';
import { GeolocationService } from '../geolocation/geolocation.service';
import { GeolocationResponse } from '../geolocation/geolocation-response.model';
import { InternalServerErrorException } from '@nestjs/common';

describe('ApplicationService', () => {
  const mockWeatherService = () => ({
    getWeather: jest.fn(),
  });
  const mockGeolocationService = () => ({
    getLocation: jest.fn(),
  });

  let applicationService: ApplicationService;
  let weatherService: { getWeather: jest.Mock };
  let geolocationService: { getLocation: jest.Mock };

  const mockedGeolocationResponse: GeolocationResponse = {
    // ip: '155.52.187.7',
    // city: 'Boston',
    latitude: '42.3424',
    longitude: '-71.0878',
  };
  const mockedWeatherResponse: WeatherResponse = {
    coord: {
      lon: 20.9806,
      lat: 52.2169,
    },
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    ],
    base: 'stations',
    main: {
      temp: 24.47,
      feels_like: 24.15,
      temp_min: 22.89,
      temp_max: 26.06,
      pressure: 1011,
      humidity: 45,
    },
    visibility: 10000,
    wind: {
      speed: 2.68,
      deg: 87,
      gust: 3.13,
    },
    clouds: {
      all: 0,
    },
    dt: 1655394565,
    sys: {
      type: 2,
      id: 2040355,
      country: 'PL',
      sunrise: 1655345656,
      sunset: 1655405957,
    },
    timezone: 7200,
    id: 756135,
    name: 'Warsaw',
    cod: 200,
  };

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
      const result = await applicationService.getWeather('1.2.3.4');
      expect(result).toEqual(mockedWeatherResponse);
    });

    it("throws an error when it can't reach the geolocation API", async () => {
      geolocationService.getLocation.mockRejectedValue(
        new InternalServerErrorException(),
      );
      await expect(applicationService.getWeather('1.2.3.4')).rejects.toThrow();
    });

    it("throws an error when it can't reach the weather API", async () => {
      weatherService.getWeather.mockRejectedValue(
        new InternalServerErrorException(),
      );
      await expect(applicationService.getWeather('1.2.3.4')).rejects.toThrow();
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
      const result = await applicationService.getWeather('1.2.3.4');
      expect(result).toEqual(mockedWeatherResponse);
    });

    //not like 'asd' could happen, but I want to at least assure, that I have a valid IPv4 address,
    //not an empty string or IPv6, (ipstack can't handle IPv4-mapped IPv6 addresses for some reason)
    it("should throw an error when didn't receive a valid IPv4 address", () => {
      expect(applicationService.getWeather('')).rejects.toThrow();
      expect(applicationService.getWeather('asd')).rejects.toThrow();
      expect(applicationService.getWeather('1.2.3.4.5')).rejects.toThrow();
      expect(applicationService.getWeather('32.2.287.4')).rejects.toThrow();
    });
  });
});

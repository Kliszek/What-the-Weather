import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { RetryLogic } from '../common/retry-logic';
import { WeatherResponse } from './weather-response.interface';
import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  let weatherService: WeatherService;

  const axiosMocked = new MockAdapter(axios);

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
      providers: [WeatherService, RetryLogic],
    }).compile();

    weatherService = module.get<WeatherService>(WeatherService);
  });

  describe('getWeather', () => {
    it('should be defined', () => {
      expect(weatherService).toBeDefined();
    });

    it('should return a weather response on a successful call', async () => {
      axiosMocked.onGet().reply(200, mockedWeatherResponse);
      const result = await weatherService.getWeather(1, 1);
      expect(result).toEqual(mockedWeatherResponse);
    });

    it('handles API error responses', async () => {
      axiosMocked.onGet().reply(401);
      await expect(weatherService.getWeather(1, 1)).rejects.toThrow();
      axiosMocked.onGet().reply(400);
      await expect(weatherService.getWeather(1, 1)).rejects.toThrow();
    });

    it('uses retry logic', async () => {
      const axiosMocked = new MockAdapter(axios);
      axiosMocked
        .onGet()
        .replyOnce(500)
        .onGet()
        .networkErrorOnce()
        .onGet()
        .timeoutOnce()
        .onGet()
        .replyOnce(200, mockedWeatherResponse);
      const result = await weatherService.getWeather(0, 0);
      expect(result).toEqual(mockedWeatherResponse);
    });
  });
});

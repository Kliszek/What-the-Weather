import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { createHash } from 'crypto';
import { CacheLayerService } from '../cache-layer/cache-layer.service';
import { RetryLogic } from '../common/retry-logic';
import { WeatherResponse } from './weather-response.model';
import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  let weatherService: WeatherService;
  let cacheLayerService: {
    clearWeather: jest.Mock;
    getWeatherID: jest.Mock;
    getWeather: jest.Mock;
    saveWeather: jest.Mock;
  };

  const mockCacheLayerService = () => ({
    clearWeather: jest.fn().mockResolvedValue(void 0),
    getWeatherID: jest.fn().mockResolvedValue(mockedWeatherID),
    getWeather: jest.fn().mockResolvedValue(mockedWeatherResponse),
    saveWeather: jest.fn().mockResolvedValue(void 0),
  });

  let axiosMocked: MockAdapter;

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

  const mockedWeatherID = createHash('md5')
    .update(JSON.stringify(mockedWeatherResponse))
    .digest('hex');

  const mockedGeolocation: [string, string] = ['20.9806', '52.2169'];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheLayerService,
          useFactory: mockCacheLayerService,
        },
        WeatherService,
        RetryLogic,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RETRIES') return 5;
              if (key === 'BACKOFF') return 300;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    axiosMocked = new MockAdapter(axios);
    weatherService = module.get<WeatherService>(WeatherService);
    cacheLayerService = module.get(CacheLayerService);
  });

  it('should be defined', () => {
    expect(weatherService).toBeDefined();
  });

  describe('getWeather', () => {
    it('should return a weather response on a successful call', async () => {
      axiosMocked.onGet().reply(200, mockedWeatherResponse);
      const result = await weatherService.getWeatherFromAPI(
        ...mockedGeolocation,
      );
      expect(result).toEqual(mockedWeatherResponse);
    });

    it('handles API error responses', async () => {
      axiosMocked.onGet().reply(401);
      await expect(
        weatherService.getWeatherFromAPI(...mockedGeolocation),
      ).rejects.toThrow();
      axiosMocked.onGet().reply(400);
      await expect(
        weatherService.getWeatherFromAPI(...mockedGeolocation),
      ).rejects.toThrow();
    });

    it('uses retry logic', async () => {
      axiosMocked
        .onGet()
        .replyOnce(500)
        .onGet()
        .networkErrorOnce()
        .onGet()
        .timeoutOnce()
        .onGet()
        .replyOnce(200, mockedWeatherResponse);
      const result = await weatherService.getWeatherFromAPI(
        ...mockedGeolocation,
      );
      expect(result).toEqual(mockedWeatherResponse);
    });

    it('throws an error when longitude or latitude are not specified', async () => {
      await expect(
        weatherService.getWeatherFromAPI(undefined, undefined),
      ).rejects.toThrow();
    });
  });

  describe('getLocation', () => {
    let getWeatherFromAPI: jest.SpyInstance;
    beforeEach(() => {
      getWeatherFromAPI = jest
        .spyOn(weatherService, 'getWeatherFromAPI')
        .mockResolvedValue(mockedWeatherResponse);
    });

    it('should fetch data from the cache and not call the API', async () => {
      const result = await weatherService.getWeather(...mockedGeolocation);
      expect(result).toEqual(mockedWeatherResponse);
      expect(cacheLayerService.getWeatherID).toHaveBeenCalled();
      expect(cacheLayerService.getWeather).toHaveBeenCalledWith(
        mockedWeatherID,
      );
      expect(getWeatherFromAPI).not.toHaveBeenCalled();
      expect(cacheLayerService.saveWeather).not.toHaveBeenCalled();
    });

    it('should call the API in case of cache miss', async () => {
      cacheLayerService.getWeatherID.mockResolvedValue(null);

      const result = await weatherService.getWeather(...mockedGeolocation);
      expect(result).toEqual(mockedWeatherResponse);
      expect(getWeatherFromAPI).toHaveBeenCalledWith(...mockedGeolocation);
      expect(cacheLayerService.saveWeather).toHaveBeenCalled();
    });

    it('should continue in case of cache error', async () => {
      cacheLayerService.getWeather.mockRejectedValue(
        new Error('some cache error'),
      );

      const result = await weatherService.getWeather(...mockedGeolocation);
      expect(result).toEqual(mockedWeatherResponse);
      expect(getWeatherFromAPI).toHaveBeenCalledWith(...mockedGeolocation);
    });
  });
});

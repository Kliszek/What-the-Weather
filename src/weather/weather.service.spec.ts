import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { CacheLayerService } from '../cache-layer/cache-layer.service';
import { RetryLogic } from '../common/retry-logic';
import { WeatherService } from './weather.service';
import {
  mockedGeolocation,
  mockedWeatherID,
  mockedWeatherResponse,
} from '../common/mocked-values';
import {
  mockCacheLayerService,
  mockedCacheLayerService,
} from '../common/mocked-services';

describe('WeatherService', () => {
  let weatherService: WeatherService;
  let cacheLayerService: mockedCacheLayerService;

  let axiosMocked: MockAdapter;

  const mockedRequestObject = { url: 'url', params: {} };

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
        mockedRequestObject,
      );
      expect(result).toEqual(mockedWeatherResponse);
    });

    it('handles API error responses', async () => {
      axiosMocked.onGet().reply(401);
      await expect(
        weatherService.getWeatherFromAPI(mockedRequestObject),
      ).rejects.toThrow();
      axiosMocked.onGet().reply(400);
      await expect(
        weatherService.getWeatherFromAPI(mockedRequestObject),
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
        mockedRequestObject,
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
      jest
        .spyOn(weatherService, 'getRequestObject')
        .mockReturnValue(mockedRequestObject);
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
      expect(getWeatherFromAPI).toHaveBeenCalledWith(mockedRequestObject);
      expect(cacheLayerService.saveWeather).toHaveBeenCalled();
    });

    it('should continue in case of cache error', async () => {
      cacheLayerService.getWeather.mockRejectedValue(
        new Error('some cache error'),
      );

      const result = await weatherService.getWeather(...mockedGeolocation);
      expect(result).toEqual(mockedWeatherResponse);
      expect(getWeatherFromAPI).toHaveBeenCalledWith(mockedRequestObject);
    });
  });
});

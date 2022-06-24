import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { CacheLayerService } from '../cache-layer/cache-layer.service';
import { RetryLogic } from '../common/retry-logic';
import { GeolocationService } from './geolocation.service';
import {
  mockedIPAddress,
  mockedGeolocationResponse,
  mockedGeolocationErrorResponse,
} from '../common/mocked-values';
import {
  mockCacheLayerService,
  mockedCacheLayerService,
} from '../common/mocked-services';

describe('GeolocationService', () => {
  let geolocationService: GeolocationService;
  let cacheLayerService: mockedCacheLayerService;

  const mockedRequestObject = {
    url: '',
    params: {},
    useFallback: () => ({ url: '', params: {} }),
  };

  let axiosMocked: MockAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheLayerService,
          useFactory: mockCacheLayerService,
        },
        GeolocationService,
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
    geolocationService = module.get<GeolocationService>(GeolocationService);
    cacheLayerService = module.get(CacheLayerService);
  });

  it('should be defined', () => {
    expect(geolocationService).toBeDefined();
  });

  describe('getLocationFromAPI', () => {
    it('calls the API and returns the result object', async () => {
      axiosMocked.onGet().reply(200, mockedGeolocationResponse);
      const response = await geolocationService.getLocationFromAPI(
        mockedRequestObject,
      );
      expect(response).toEqual(mockedGeolocationResponse);
    });
    //specifically for ipstack.com, which responds with status 200 in case of errors
    //codes 404, 101, 102, 103, 104, 105, 301, 302, 303
    it('handles API error responses and switches to a fallback API', async () => {
      axiosMocked
        .onGet()
        .replyOnce(200, mockedGeolocationErrorResponse)
        .onGet()
        .replyOnce(200, mockedGeolocationResponse);
      const response = await geolocationService.getLocationFromAPI(
        mockedRequestObject,
      );
      expect(response).toEqual(mockedGeolocationResponse);
    });

    it('handles rejected promises and/or exceptions', async () => {
      axiosMocked.onGet().reply(404);
      await expect(
        geolocationService.getLocationFromAPI(mockedRequestObject),
      ).rejects.toThrow();
    });

    it('uses retry logic', async () => {
      axiosMocked
        .onGet()
        .replyOnce(408)
        .onGet()
        .replyOnce(500)
        .onGet()
        .networkErrorOnce()
        .onGet()
        .timeoutOnce()
        .onGet()
        .replyOnce(200, mockedGeolocationResponse);
      const response = await geolocationService.getLocationFromAPI(
        mockedRequestObject,
      );
      expect(response).toEqual(mockedGeolocationResponse);
    });

    it('throws an error when latitude or longitude are not returned', async () => {
      const geolocationResponseUndefined = {
        ip: '155.52.187.7',
        city: 'Boston',
      };
      axiosMocked.onGet().reply(200, geolocationResponseUndefined);

      await expect(
        geolocationService.getLocationFromAPI(mockedRequestObject),
      ).rejects.toThrow();
    });
  });

  describe('getLocation', () => {
    let getLocationFromAPI: jest.SpyInstance;
    beforeEach(() => {
      getLocationFromAPI = jest
        .spyOn(geolocationService, 'getLocationFromAPI')
        .mockResolvedValue(mockedGeolocationResponse);
      jest
        .spyOn(geolocationService, 'getRequestObject')
        .mockReturnValue(mockedRequestObject);
    });

    it('should fetch data from the cache and not call the API', async () => {
      const result = await geolocationService.getLocation(mockedIPAddress);
      expect(result).toEqual(mockedGeolocationResponse);
      expect(cacheLayerService.getIPGeolocation).toHaveBeenCalled();
      expect(getLocationFromAPI).not.toHaveBeenCalled();
      expect(cacheLayerService.saveIP).not.toHaveBeenCalled();
    });

    it('should call the API in case of cache miss', async () => {
      cacheLayerService.getIPGeolocation.mockResolvedValue(null);

      const result = await geolocationService.getLocation(mockedIPAddress);
      expect(result).toEqual(mockedGeolocationResponse);
      expect(getLocationFromAPI).toHaveBeenCalledWith(mockedRequestObject);
      expect(cacheLayerService.saveIP).toHaveBeenCalled();
    });

    it('should continue in case of cache error', async () => {
      cacheLayerService.getIPGeolocation.mockRejectedValue(
        new Error('some cache error'),
      );

      const result = await geolocationService.getLocation(mockedIPAddress);
      expect(result).toEqual(mockedGeolocationResponse);
      expect(getLocationFromAPI).toHaveBeenCalledWith(mockedRequestObject);
    });
  });
});

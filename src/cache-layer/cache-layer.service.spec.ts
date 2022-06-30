import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheLayerService } from './cache-layer.service';
import {
  mockedGeolocation,
  mockedGeolocationResponse,
  mockedIPAddress,
  mockedWeatherID,
  mockedWeatherResponse,
} from '../common/mocked-values';
import {
  mockConfigService,
  mockedEventEmitter,
  mockedRedis,
  mockEventEmitter,
  mockRedis,
} from '../common/mocked-services';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('CacheLayerService', () => {
  let cacheLayerService: CacheLayerService;

  let redisMocked: mockedRedis;
  let eventEmitterMocked: mockedEventEmitter;

  const mockedDate = new Date();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheLayerService,
        {
          provide: 'REDIS_CLIENT',
          useFactory: mockRedis,
        },
        {
          provide: ConfigService,
          useFactory: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useFactory: mockEventEmitter,
        },
      ],
    }).compile();

    cacheLayerService = module.get<CacheLayerService>(CacheLayerService);
    redisMocked = module.get('REDIS_CLIENT');
    eventEmitterMocked = module.get(EventEmitter2);

    jest.useFakeTimers('modern');
    jest.setSystemTime(mockedDate);
  });

  it('should be defined', () => {
    expect(cacheLayerService).toBeDefined();
  });

  describe('getIPLocation', () => {
    it('should return the geolocation of a saved IP address', async () => {
      redisMocked.geopos.mockResolvedValue([mockedGeolocation]);
      const result = await cacheLayerService.getIPGeolocation(mockedIPAddress);
      expect(redisMocked.geopos).toHaveBeenCalledWith(
        'IPAddresses',
        mockedIPAddress,
      );
      expect(result).toEqual(mockedGeolocationResponse);
    });

    it('should return null if the IP address is not in the cache', async () => {
      redisMocked.geopos.mockResolvedValue([null]);
      const result = await cacheLayerService.getIPGeolocation(mockedIPAddress);
      expect(result).toBeNull();
    });

    it('should throw in case of unexpected result', () => {
      redisMocked.geopos.mockResolvedValueOnce(null);
      expect(cacheLayerService.getIPGeolocation('')).rejects.toThrow();
    });

    it('should throw in case of fetching error', async () => {
      redisMocked.geopos.mockRejectedValue(new Error('some error'));
      await expect(cacheLayerService.getIPGeolocation('')).rejects.toThrowError(
        new Error('some error'),
      );
    });
  });

  describe('saveIP', () => {
    it('should save the given IP to the database and resolve', async () => {
      redisMocked.exec.mockResolvedValue([[null, 1]]);
      await expect(
        cacheLayerService.saveIP(
          mockedIPAddress,
          mockedGeolocationResponse,
          3600000,
        ),
      ).resolves.not.toThrow();
      expect(redisMocked.geoadd).toHaveBeenCalledWith(
        'IPAddresses',
        ...mockedGeolocation,
        mockedIPAddress,
      );
      expect(redisMocked.zadd).toHaveBeenCalledWith(
        'IPExp',
        'NX',
        mockedDate.getTime() + 3600000,
        mockedIPAddress,
      );
    });

    it('should catch a saving error', async () => {
      redisMocked.exec.mockResolvedValue([[new Error('some error'), 0]]);
      await expect(
        cacheLayerService.saveIP('', mockedGeolocationResponse, 0),
      ).resolves.not.toThrow();
    });
  });

  describe('clearIP', () => {
    const mockedIPTable = [mockedIPAddress, '1.2.3.4', '3.4.5.6'];

    it('should fetch the expired IPs and delete them', async () => {
      redisMocked.zrange.mockResolvedValue(mockedIPTable);
      // redisMocked.zrem.mockResolvedValue(mockedIPTable.length);
      redisMocked.exec.mockResolvedValue([
        [null, mockedIPTable.length],
        [null, mockedIPTable.length],
      ]);
      await expect(cacheLayerService.clearIPs()).resolves.not.toThrow();
      expect(redisMocked.zrange).toHaveBeenCalledWith(
        'IPExp',
        0,
        mockedDate.getTime(),
        'BYSCORE',
      );
      expect(redisMocked.zrem).toHaveBeenCalledWith(
        'IPAddresses',
        ...mockedIPTable,
      );
      expect(redisMocked.zrem).toHaveBeenCalledWith('IPExp', ...mockedIPTable);
    });

    it("doesn't call ZREM if there is nothing to remove", async () => {
      const mockedIPTable = [];
      redisMocked.zrange.mockResolvedValue(mockedIPTable);
      await expect(cacheLayerService.clearIPs()).resolves.not.toThrow();
      expect(redisMocked.zrem).not.toHaveBeenCalled();
    });

    it('should catch a pipeline error', async () => {
      redisMocked.zrange.mockResolvedValue(mockedIPTable);
      redisMocked.exec.mockResolvedValue([
        [null, mockedIPTable.length],
        [new Error('some pipeline error'), 0],
      ]);
      await expect(cacheLayerService.clearIPs()).resolves.not.toThrow();
    });

    it('should throw in case of database error', async () => {
      redisMocked.zrange.mockRejectedValue(new Error('some error'));
      await expect(cacheLayerService.clearIPs()).rejects.toThrowError(
        new Error('some error'),
      );
    });
  });

  describe('getWeatherID', () => {
    it('returns the ID of the closest weather', async () => {
      const mockedWeatherID = 'superrandomuuid';
      redisMocked.geosearch.mockResolvedValue([mockedWeatherID]);
      const result = await cacheLayerService.getWeatherID(
        mockedGeolocationResponse,
      );
      expect(result).toEqual(mockedWeatherID);
    });

    it('resolves to null when there is no weather in given radius', async () => {
      redisMocked.geosearch.mockResolvedValue([]);
      const result = await cacheLayerService.getWeatherID(
        mockedGeolocationResponse,
      );
      expect(result).toBeNull();
    });

    it('should throw in case of database error', async () => {
      redisMocked.geosearch.mockRejectedValue(new Error('some error'));
      await expect(
        cacheLayerService.getWeatherID(mockedGeolocationResponse),
      ).rejects.toThrowError(new Error('some error'));
    });
  });

  describe('getWeatherData', () => {
    it('returns the weather data', async () => {
      redisMocked.hget.mockResolvedValue(JSON.stringify(mockedWeatherResponse));
      const result = await cacheLayerService.getWeather('blabla');
      expect(result).toEqual(mockedWeatherResponse);
    });

    it("throws when the weather data couldn't be found", async () => {
      redisMocked.hget.mockResolvedValue(null);
      await expect(cacheLayerService.getWeather('sadf')).rejects.toThrow();
    });

    it('should throw in case of database error', async () => {
      redisMocked.hget.mockRejectedValue(new Error('some error'));
      await expect(cacheLayerService.getWeather('sadf')).rejects.toThrowError(
        new Error('some error'),
      );
    });
  });

  describe('saveWeather', () => {
    it('should save weather id to WeatherID and WeatherData', async () => {
      redisMocked.exec.mockResolvedValue([
        [null, 1],
        [null, 1],
      ]);

      await expect(
        cacheLayerService.saveWeather(
          mockedWeatherResponse,
          mockedGeolocationResponse,
          3600000,
        ),
      ).resolves.not.toThrow();

      expect(redisMocked.zadd).toHaveBeenCalledWith(
        'WeatherExp',
        'NX',
        mockedDate.getTime() + 3600000,
        mockedWeatherID,
      );

      expect(redisMocked.hset).toHaveBeenCalledWith(
        'WeatherData',
        mockedWeatherID,
        JSON.stringify(mockedWeatherResponse),
      );

      expect(redisMocked.geoadd).toHaveBeenCalledWith(
        'WeatherID',
        ...mockedGeolocation,
        mockedWeatherID,
      );

      expect(eventEmitterMocked.emit).toHaveBeenCalledWith(
        'saveCity',
        mockedWeatherResponse.name,
        mockedGeolocationResponse,
      );
    });

    it('should catch a saving error', async () => {
      redisMocked.exec.mockResolvedValue([[new Error('some error'), 0]]);
      await expect(
        cacheLayerService.saveWeather(
          mockedWeatherResponse,
          mockedGeolocationResponse,
          0,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('clearWeather', () => {
    const mockedWeatherTable = [
      mockedWeatherID,
      'superuniqueid',
      'totallyrandom',
    ];

    it('should fetch the expired weather ids and data and delete them', async () => {
      redisMocked.zrange.mockResolvedValue(mockedWeatherTable);
      // redisMocked.zrem.mockResolvedValue(mockedIPTable.length);
      redisMocked.exec.mockResolvedValue([
        [null, mockedWeatherTable.length],
        [null, mockedWeatherTable.length],
        [null, mockedWeatherTable.length],
      ]);
      await expect(cacheLayerService.clearWeather()).resolves.not.toThrow();
      expect(redisMocked.zrange).toHaveBeenCalledWith(
        'WeatherExp',
        0,
        mockedDate.getTime(),
        'BYSCORE',
      );
      expect(redisMocked.hdel).toHaveBeenCalledWith(
        'WeatherData',
        ...mockedWeatherTable,
      );
      expect(redisMocked.zrem).toHaveBeenCalledWith(
        'WeatherID',
        ...mockedWeatherTable,
      );
      expect(redisMocked.zrem).toHaveBeenCalledWith(
        'WeatherExp',
        ...mockedWeatherTable,
      );
    });

    it("doesn't call ZREM or HDEL if there is nothing to remove", async () => {
      const mockedWeatherTable = [];
      redisMocked.zrange.mockResolvedValue(mockedWeatherTable);
      await expect(cacheLayerService.clearWeather()).resolves.not.toThrow();
      expect(redisMocked.zrem).not.toHaveBeenCalled();
    });

    it('should catch a pipeline error', async () => {
      redisMocked.zrange.mockResolvedValue(mockedWeatherTable);
      redisMocked.exec.mockResolvedValue([
        [null, mockedWeatherTable.length],
        [null, mockedWeatherTable.length],
        [new Error('some pipeline error'), 0],
      ]);
      await expect(cacheLayerService.clearWeather()).resolves.not.toThrow();
    });

    it('should throw in case of database error', async () => {
      redisMocked.zrange.mockRejectedValue(new Error('some error'));
      await expect(cacheLayerService.clearWeather()).rejects.toThrowError(
        new Error('some error'),
      );
    });
  });

  describe('saveCity', () => {
    it('should normalize the string and save the city to cache', async () => {
      redisMocked.exec.mockResolvedValue([[null, 1]]);
      await expect(
        cacheLayerService.saveCity('Góra Kalwaria', mockedGeolocationResponse),
      ).resolves.not.toThrow();

      expect(redisMocked.geoadd).toHaveBeenCalledWith(
        'Cities',
        ...mockedGeolocation,
        'gora kalwaria',
      );
    });

    it('should not throw in case of database error', async () => {
      redisMocked.exec.mockResolvedValue([[new Error('some error'), 0]]);
      //it doesn't throw, but it logs the error
      await expect(
        cacheLayerService.saveCity('', mockedGeolocationResponse),
      ).resolves.not.toThrow();
    });
  });

  describe('getCityGeolocation', () => {
    it('should normalize the string and request the city from cache', async () => {
      redisMocked.geopos.mockResolvedValue(mockedGeolocationResponse);
      await expect(
        cacheLayerService.getCityGeolocation('Góra Kalwaria'),
      ).resolves.not.toThrow();

      expect(redisMocked.geopos).toHaveBeenCalledWith(
        'Cities',
        'gora kalwaria',
      );
    });

    it('should throw in case of database error', async () => {
      redisMocked.geopos.mockRejectedValue(new Error('some error'));
      await expect(
        cacheLayerService.getCityGeolocation(''),
      ).rejects.toThrowError(new Error('some error'));
    });
  });
});

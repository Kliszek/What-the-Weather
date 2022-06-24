import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheLayerService } from './cache-layer.service';
import { createHash } from 'crypto';

describe('CacheLayerService', () => {
  let cacheLayerService: CacheLayerService;

  let redisMocked: any;

  const mockRedis = () => ({
    geoadd: jest.fn().mockReturnThis(),
    geopos: jest.fn(),
    geosearch: jest.fn(),
    zadd: jest.fn().mockReturnThis(),
    zrange: jest.fn(),
    zrem: jest.fn().mockReturnThis(),
    hset: jest.fn().mockReturnThis(),
    hget: jest.fn(),
    hdel: jest.fn().mockReturnThis(),
    pipeline: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  });

  // const mockedUUID = 'supertotallyrandomuniqueID';

  const mockedDate = new Date();

  const mockedGeolocation = {
    longitude: '51.2467',
    latitude: '23.1236',
  };

  const mockedIPAddress = '12.34.56.78';

  const mockedWeatherResponse = {
    weather: 'much beautiful',
    clouds: 'no clouds, just sun',
  };

  const mockedWeatherID = createHash('md5')
    .update(JSON.stringify(mockedWeatherResponse))
    .digest('hex');

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
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CACHE_IPADDRESSES_KEYNAME') return 'IPAddresses';
              if (key === 'CACHE_IPEXP_KEYNAME') return 'IPExp';
              if (key === 'CACHE_WEATHERID_KEYNAME') return 'WeatherID';
              if (key === 'CACHE_WEATHERDATA_KEYNAME') return 'WeatherData';
              if (key === 'CACHE_WEATHEREXP_KEYNAME') return 'WeatherExp';
              if (key === 'CACHE_WEATHER_RADIUS') return '50';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    cacheLayerService = module.get<CacheLayerService>(CacheLayerService);
    redisMocked = module.get('REDIS_CLIENT');

    jest.useFakeTimers('modern');
    jest.setSystemTime(mockedDate);
  });

  it('should be defined', () => {
    expect(cacheLayerService).toBeDefined();
  });

  describe('getIPLocation', () => {
    it('should return the geolocation of a saved IP address', async () => {
      redisMocked.geopos.mockResolvedValue([
        [mockedGeolocation.longitude, mockedGeolocation.latitude],
      ]);
      const result = await cacheLayerService.getIPGeolocation(mockedIPAddress);
      expect(redisMocked.geopos).toHaveBeenCalledWith(
        'IPAddresses',
        mockedIPAddress,
      );
      expect(result).toEqual(mockedGeolocation);
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
        cacheLayerService.saveIP(mockedIPAddress, mockedGeolocation, 3600000),
      ).resolves.not.toThrow();
      expect(redisMocked.geoadd).toHaveBeenCalledWith(
        'IPAddresses',
        mockedGeolocation.longitude,
        mockedGeolocation.latitude,
        mockedIPAddress,
      );
      expect(redisMocked.zadd).toHaveBeenCalledWith(
        'IPExp',
        'NX',
        mockedDate.getTime() + 3600000,
        mockedIPAddress,
      );
    });

    it('should throw when the given IP address is already in the database', async () => {
      redisMocked.exec.mockResolvedValue([[null, 0]]);
      await expect(
        cacheLayerService.saveIP(mockedIPAddress, mockedGeolocation, 0),
      ).rejects.toThrow();
      expect(redisMocked.geoadd).toHaveBeenCalledWith(
        'IPAddresses',
        mockedGeolocation.longitude,
        mockedGeolocation.latitude,
        mockedIPAddress,
      );
    });

    it('should throw in case of saving error', async () => {
      redisMocked.exec.mockResolvedValue([[new Error('some error'), 0]]);
      await expect(
        cacheLayerService.saveIP('', mockedGeolocation, 0),
      ).rejects.toThrowError(new Error('some error'));
    });
  });

  // describe('setIPExp', () => {
  //   it('should save the given IP to the IPExp sorted set', async () => {
  //     redisMocked.exec.mockResolvedValue([[null, 1]]);
  //     expect(
  //       cacheLayerService.setIPExp(mockedIPAddress, 3600000),
  //     ).resolves.not.toThrow();
  //     const expTime = mockedDate.getTime() + 3600000;
  //     expect(redisMocked.zadd).toHaveBeenCalledWith(
  //       'IPExp',
  //       'NX',
  //       expTime,
  //       mockedIPAddress,
  //     );
  //   });

  //   it('should throw if no records were added', async () => {
  //     redisMocked.exec.mockResolvedValue([[null, 0]]);
  //     await expect(
  //       cacheLayerService.setIPExp(mockedIPAddress, 3600000),
  //     ).rejects.toThrow();
  //   });

  //   it('should throw in case of saving error', async () => {
  //     redisMocked.exec.mockResolvedValue([[new Error('some error'), 0]]);
  //     await expect(cacheLayerService.setIPExp('', 0)).rejects.toThrowError(
  //       new Error('some error'),
  //     );
  //   });
  // });

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

    it('should throw if incorrect number of items were removed', async () => {
      redisMocked.zrange.mockResolvedValue(mockedIPTable);
      redisMocked.exec.mockResolvedValue([
        [null, 4],
        [null, 0],
      ]);
      await expect(cacheLayerService.clearIPs()).rejects.toThrow();
    });

    it('should forward a pipeline error', async () => {
      redisMocked.zrange.mockResolvedValue(mockedIPTable);
      redisMocked.exec.mockResolvedValue([
        [null, mockedIPTable.length],
        [new Error('some pipeline error'), 0],
      ]);
      await expect(cacheLayerService.clearIPs()).rejects.toThrowError(
        new Error('some pipeline error'),
      );
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
      const result = await cacheLayerService.getWeatherID(mockedGeolocation);
      expect(result).toEqual(mockedWeatherID);
    });

    it('resolves to null when there is no weather in given radius', async () => {
      redisMocked.geosearch.mockResolvedValue([]);
      const result = await cacheLayerService.getWeatherID(mockedGeolocation);
      expect(result).toBeNull();
    });

    it('should throw in case of database error', async () => {
      redisMocked.geosearch.mockRejectedValue(new Error('some error'));
      await expect(
        cacheLayerService.getWeatherID(mockedGeolocation),
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
      // redisMocked.hset.mockResolvedValue(1);
      // redisMocked.geoadd.mockResolvedValue(1);
      redisMocked.exec.mockResolvedValue([
        [null, 1],
        [null, 1],
      ]);

      await expect(
        cacheLayerService.saveWeather(
          mockedWeatherResponse as any,
          mockedGeolocation,
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
        mockedGeolocation.longitude,
        mockedGeolocation.latitude,
        mockedWeatherID,
      );
    });

    it('should throw when the given WeatherID is already in the database', async () => {
      redisMocked.exec.mockResolvedValue([[null, 0]]);
      await expect(
        cacheLayerService.saveWeather(
          mockedWeatherResponse as any,
          mockedGeolocation,
          0,
        ),
      ).rejects.toThrow();
    });

    it('should throw in case of saving error', async () => {
      redisMocked.exec.mockResolvedValue([[new Error('some error'), 0]]);
      await expect(
        cacheLayerService.saveWeather(
          mockedWeatherResponse as any,
          mockedGeolocation,
          0,
        ),
      ).rejects.toThrowError(new Error('some error'));
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

    it('should throw if incorrect number of items were removed', async () => {
      redisMocked.zrange.mockResolvedValue(mockedWeatherTable);
      redisMocked.exec.mockResolvedValue([
        [null, 4],
        [null, 3],
        [null, 0],
      ]);
      await expect(cacheLayerService.clearWeather()).rejects.toThrow();
    });

    it('should forward a pipeline error', async () => {
      redisMocked.zrange.mockResolvedValue(mockedWeatherTable);
      redisMocked.exec.mockResolvedValue([
        [null, mockedWeatherTable.length],
        [null, mockedWeatherTable.length],
        [new Error('some pipeline error'), 0],
      ]);
      await expect(cacheLayerService.clearWeather()).rejects.toThrowError(
        new Error('some pipeline error'),
      );
    });

    it('should throw in case of database error', async () => {
      redisMocked.zrange.mockRejectedValue(new Error('some error'));
      await expect(cacheLayerService.clearWeather()).rejects.toThrowError(
        new Error('some error'),
      );
    });
  });
});

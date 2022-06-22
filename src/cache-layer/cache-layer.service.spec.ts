import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheLayerService } from './cache-layer.service';

describe('CacheLayerService', () => {
  let cacheLayerService: CacheLayerService;

  let redisMocked;

  const mockRedis = () => ({
    geoadd: jest.fn(),
    geopos: jest.fn(),
    geosearch: jest.fn(),
    zadd: jest.fn(),
    zrange: jest.fn(),
    zrem: jest.fn(),
  });

  const mockedDate = new Date();

  const mockedGeolocation = {
    lon: '51.2467',
    lat: '23.1236',
  };

  const mockedIPAddress = '12.34.56.78';

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
        [mockedGeolocation.lon, mockedGeolocation.lat],
      ]);
      const result = await cacheLayerService.getIPLocation(mockedIPAddress);
      expect(redisMocked.geopos).toHaveBeenCalledWith(
        'IPAddresses',
        mockedIPAddress,
      );
      expect(result).toEqual(mockedGeolocation);
    });

    it('should return null if the IP address is not in the cache', async () => {
      redisMocked.geopos.mockResolvedValue([null]);
      const result = await cacheLayerService.getIPLocation(mockedIPAddress);
      expect(result).toBeNull();
    });

    it('should throw in case of unexpected result', () => {
      redisMocked.geopos.mockResolvedValueOnce(null);
      expect(cacheLayerService.getIPLocation('')).rejects.toThrow();
    });

    it('should throw in case of fetching error', async () => {
      redisMocked.geopos.mockRejectedValue(new Error('some error'));
      await expect(cacheLayerService.getIPLocation('')).rejects.toThrowError(
        new Error('some error'),
      );
    });
  });

  describe('saveIP', () => {
    it('should save the given IP to the database and resolve', async () => {
      redisMocked.geoadd.mockResolvedValue(1);
      await expect(
        cacheLayerService.saveIP(mockedIPAddress, mockedGeolocation),
      ).resolves.not.toThrow();
      expect(redisMocked.geoadd).toHaveBeenCalledWith(
        'IPAddresses',
        mockedGeolocation.lon,
        mockedGeolocation.lat,
        mockedIPAddress,
      );
    });

    it('should throw when the given IP address is already in the database', async () => {
      redisMocked.geoadd.mockResolvedValue(0);
      await expect(
        cacheLayerService.saveIP(mockedIPAddress, mockedGeolocation),
      ).rejects.toThrow();
      expect(redisMocked.geoadd).toHaveBeenCalledWith(
        'IPAddresses',
        mockedGeolocation.lon,
        mockedGeolocation.lat,
        mockedIPAddress,
      );
    });

    it('should throw in case of saving error', async () => {
      redisMocked.geoadd.mockRejectedValue(new Error('some error'));
      await expect(
        cacheLayerService.saveIP('', mockedGeolocation),
      ).rejects.toThrowError(new Error('some error'));
    });
  });

  describe('setIPExp', () => {
    it('should save the given IP to the IPExp sorted set', async () => {
      redisMocked.zadd.mockResolvedValue(1);
      expect(
        cacheLayerService.setIPExp(mockedIPAddress, 3600000),
      ).resolves.not.toThrow();
      const expTime = mockedDate.getTime() + 3600000;
      expect(redisMocked.zadd).toHaveBeenCalledWith(
        'IPExp',
        'NX',
        expTime,
        mockedIPAddress,
      );
    });

    it('should throw if no records were added', async () => {
      redisMocked.zadd.mockResolvedValue(0);
      await expect(
        cacheLayerService.setIPExp(mockedIPAddress, 3600000),
      ).rejects.toThrow();
    });

    it('should throw in case of saving error', async () => {
      redisMocked.zadd.mockRejectedValue(new Error('some error'));
      await expect(cacheLayerService.setIPExp('', 0)).rejects.toThrowError(
        new Error('some error'),
      );
    });
  });

  describe('clearIP', () => {
    it('should fetch the expired IPs and delete them', async () => {
      const mockedIPTable = [mockedIPAddress, '1.2.3.4', '3.4.5.6'];
      redisMocked.zrange.mockResolvedValue(mockedIPTable);
      redisMocked.zrem.mockResolvedValue(mockedIPTable.length);
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

    it('should throw in case of database error', async () => {
      redisMocked.zrange.mockRejectedValue(new Error('some error'));
      await expect(cacheLayerService.clearIPs()).rejects.toThrowError(
        new Error('some error'),
      );
    });
  });
});

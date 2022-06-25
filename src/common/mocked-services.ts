import {
  mockedGeolocationResponse,
  mockedWeatherID,
  mockedWeatherResponse,
} from './mocked-values';

export const mockConfigService = () => ({
  get: jest.fn((key: string) => {
    if (key === 'RETRIES') return '5';
    if (key === 'BACKOFF') return '300';
    if (key === 'CACHE_IPADDRESSES_KEYNAME') return 'IPAddresses';
    if (key === 'CACHE_IPEXP_KEYNAME') return 'IPExp';
    if (key === 'CACHE_WEATHERID_KEYNAME') return 'WeatherID';
    if (key === 'CACHE_WEATHERDATA_KEYNAME') return 'WeatherData';
    if (key === 'CACHE_WEATHEREXP_KEYNAME') return 'WeatherExp';
    if (key === 'CACHE_CITIES_KEYNAME') return 'Cities';
    if (key === 'CACHE_WEATHER_RADIUS') return '50';
    return undefined;
  }),
});

export const mockRedis = () => ({
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
  exec: jest.fn().mockResolvedValue([[null, 1]]),
});

export interface mockedRedis {
  geoadd: jest.Mock;
  geopos: jest.Mock;
  geosearch: jest.Mock;
  zadd: jest.Mock;
  zrange: jest.Mock;
  zrem: jest.Mock;
  hset: jest.Mock;
  hget: jest.Mock;
  hdel: jest.Mock;
  pipeline: jest.Mock;
  exec: jest.Mock;
}

export const mockCacheLayerService = () => ({
  clearIPs: jest.fn().mockResolvedValue(void 0),
  getIPGeolocation: jest.fn().mockResolvedValue(mockedGeolocationResponse),
  saveIP: jest.fn().mockResolvedValue(void 0),
  clearWeather: jest.fn().mockResolvedValue(void 0),
  getWeatherID: jest.fn().mockResolvedValue(mockedWeatherID),
  getWeather: jest.fn().mockResolvedValue(mockedWeatherResponse),
  saveWeather: jest.fn().mockResolvedValue(void 0),
  saveCity: jest.fn().mockResolvedValue(void 0),
  getCityGeolocation: jest.fn().mockResolvedValue(mockedGeolocationResponse),
});

export interface mockedCacheLayerService {
  clearWeather: jest.Mock;
  getWeatherID: jest.Mock;
  getWeather: jest.Mock;
  saveWeather: jest.Mock;
  clearIPs: jest.Mock;
  getIPGeolocation: jest.Mock;
  saveIP: jest.Mock;
  saveCity: jest.Mock;
  getCityGeolocation: jest.Mock;
}

export const mockWeatherService = () => ({
  getWeather: jest.fn(),
});

export const mockGeolocationService = () => ({
  getLocation: jest.fn(),
});

import {
  mockedGeolocationResponse,
  mockedWeatherID,
  mockedWeatherResponse,
} from './mocked-values';

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
  exec: jest.fn(),
});

export const mockCacheLayerService = () => ({
  clearIPs: jest.fn().mockResolvedValue(void 0),
  getIPGeolocation: jest.fn().mockResolvedValue(mockedGeolocationResponse),
  saveIP: jest.fn().mockResolvedValue(void 0),
  clearWeather: jest.fn().mockResolvedValue(void 0),
  getWeatherID: jest.fn().mockResolvedValue(mockedWeatherID),
  getWeather: jest.fn().mockResolvedValue(mockedWeatherResponse),
  saveWeather: jest.fn().mockResolvedValue(void 0),
});

export interface mockedCacheLayerService {
  clearWeather: jest.Mock;
  getWeatherID: jest.Mock;
  getWeather: jest.Mock;
  saveWeather: jest.Mock;
  clearIPs: jest.Mock;
  getIPGeolocation: jest.Mock;
  saveIP: jest.Mock;
}

export const mockWeatherService = () => ({
  getWeather: jest.fn(),
});

export const mockGeolocationService = () => ({
  getLocation: jest.fn(),
});

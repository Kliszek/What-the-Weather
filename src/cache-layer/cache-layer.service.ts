import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { WeatherResponse } from 'src/weather/weather-response.model';

interface Geolocation {
  lon: string;
  lat: string;
}

@Injectable()
export class CacheLayerService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private configService: ConfigService,
  ) {}

  async getIPLocation(ipAddress: string): Promise<Geolocation> {
    return this.redis
      .geopos(this.configService.get('CACHE_IPADDRESSES_KEYNAME'), ipAddress)
      .then((result) => {
        if (result.length === 0) {
          throw new InternalServerErrorException();
        }
        if (result[0] == null) {
          return null;
        }
        const [lon, lat] = result[0];
        return { lon, lat };
      })
      .catch((error) => {
        console.log('ERROR FETCHING THE IP LOCATION', error);
        throw error;
      });
  }

  async saveIP(ipAddress: string, geolocation: Geolocation): Promise<void> {
    const { lon, lat } = geolocation;
    return this.redis
      .geoadd(
        this.configService.get('CACHE_IPADDRESSES_KEYNAME'),
        lon,
        lat,
        ipAddress,
      )
      .then((result) => {
        if (result === 1) {
          return;
        } else {
          console.log('GEOADD RETURNED VALUE:', result);
          throw new InternalServerErrorException();
        }
      })
      .catch((error) => {
        console.log('ERROR FETCHING THE IP LOCATION', error);
        throw error;
      });
  }

  async setIPExp(ipAddress: string, ttl: number): Promise<void> {
    const expTime = new Date().getTime() + ttl;
    return this.redis
      .zadd(
        this.configService.get('CACHE_IPEXP_KEYNAME'),
        'NX',
        expTime,
        ipAddress,
      )
      .then((result) => {
        if (result === 1) {
          return;
        } else {
          console.log('ZADD RETURNED VALUE:', result);
          throw new InternalServerErrorException();
        }
      })
      .catch((error) => {
        console.log('ERROR ADDING IP EXPIRATION', error);
        throw error;
      });
  }

  async clearIPs(): Promise<void> {
    return this.redis
      .zrange(
        this.configService.get('CACHE_IPEXP_KEYNAME'),
        0,
        new Date().getTime(),
        'BYSCORE',
      )
      .then(async (ipAddressTable) => {
        if (ipAddressTable.length === 0) {
          return;
        }
        return this.removeElements(
          this.configService.get('CACHE_IPADDRESSES_KEYNAME'),
          ipAddressTable,
        ).then(() =>
          this.removeElements(
            this.configService.get('CACHE_IPEXP_KEYNAME'),
            ipAddressTable,
          ),
        );
      })
      .catch((error) => {
        console.log('ERROR CALLING ZRANGE', error);
        throw error;
      });
  }

  private async removeElements(key: string, elements: string[]): Promise<void> {
    if (elements.length === 0) {
      return;
    }
    return this.redis.zrem(key, ...elements).then((result) => {
      if (result === elements.length) {
        return;
      } else {
        console.log('ZREM RETURNED VALUE:', result);
        throw new InternalServerErrorException();
      }
    });
  }

  async getWeatherID(lon: number, lat: number): Promise<string> {
    throw new Error('Not implemented');
  }

  async getWeather(id: string): Promise<WeatherResponse> {
    throw new Error('Not implemented');
  }

  async saveWeather(weather: WeatherResponse): Promise<void> {
    throw new Error('Not implemented');
  }

  async setWeatherExp(id: string, exp: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async clearWeather(): Promise<void> {
    throw new Error('Not implemented');
  }
}

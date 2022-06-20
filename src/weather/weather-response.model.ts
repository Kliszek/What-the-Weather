import { ApiProperty } from '@nestjs/swagger';

class WeatherProperty {
  // @example 800
  id: number;
  // @example Clear
  main: string;
  // @example "clear sky"
  description: string;
  // @example 01n
  icon: string;
}

class CoordProperty {
  // @example 20.9806
  lon: number;
  // @example 52.2169
  lat: number;
}

class MainProperty {
  // @example 16.44
  temp: number;
  // @example 16.36
  feels_like: number;
  // @example 14.07
  temp_min: number;
  // @example 17.17
  temp_max: number;
  // @example 1014
  pressure: number;
  // @example 85
  humidity: number;
}

class WindProperty {
  // @example 2.68
  speed: number;
  // @example 87
  deg: number;
  // @example 3.13
  gust: number;
}

class CloudsProperty {
  // @example 0
  all: number;
}

class SysProperty {
  // @example 2
  type: number;
  // @example 2000452
  id: number;
  // @example PL
  country: string;
  // @example 1655604857
  sunrise: number;
  // @example 1655665229
  sunset: number;
}

export class WeatherResponse {
  @ApiProperty()
  coord: CoordProperty;
  @ApiProperty({ type: [WeatherProperty] })
  weather: [WeatherProperty];
  // @example stations
  base: string;
  main: MainProperty;
  // @example 10000
  visibility: number;
  wind: WindProperty;
  clouds: CloudsProperty;
  // @example 1655674557
  dt: number;
  sys: SysProperty;
  // @example 7200
  timezone: number;
  // @example 756135
  id: number;
  // @example Warsaw
  name: string;
  // @example 200
  cod: number;
}

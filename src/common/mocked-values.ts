import { createHash } from 'crypto';
import { WeatherResponse } from '../weather/weather-response.model';
import {
  GeolocationErrorResponse,
  GeolocationResponse,
} from '../geolocation/geolocation-response.model';

export const mockedIPAddress = '12.34.56.78';

export const mockedGeolocationResponse: GeolocationResponse = {
  latitude: '20.9806',
  longitude: '52.2169',
};

export const mockedGeolocationErrorResponse: GeolocationErrorResponse = {
  success: false,
  error: {
    code: 104,
    type: 'monthly_limit_reached',
    info: 'Your monthly API request volume has been reached. Please upgrade your plan.',
  },
};

export const mockedWeatherResponse: WeatherResponse = {
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

export const mockedWeatherID = createHash('md5')
  .update(JSON.stringify(mockedWeatherResponse))
  .digest('hex');

export const mockedGeolocation: [string, string] = ['52.2169', '20.9806'];

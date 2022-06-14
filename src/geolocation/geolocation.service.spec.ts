import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  GeolocationErrorResponse,
  GeolocationResponse,
} from './geolocation-response.interface';
import { GeolocationService } from './geolocation.service';

//jest.mock('axios');

describe('GeolocationService', () => {
  let geolocationService: GeolocationService;

  //const axiosMocked = jest.mocked(axios, true);
  const axiosMocked = new MockAdapter(axios);
  const mockedGeolocationResponse: GeolocationResponse = {
    ip: '155.52.187.7',
    type: 'ipv4',
    continent_code: 'NA',
    continent_name: 'North America',
    country_code: 'US',
    country_name: 'United States',
    region_code: 'MA',
    region_name: 'Massachusetts',
    city: 'Boston',
    zip: '02115',
    latitude: 42.3424,
    longitude: -71.0878,
  };
  const mockedGeolocationErrorResponse: GeolocationErrorResponse = {
    success: false,
    error: {
      code: 104,
      type: 'monthly_limit_reached',
      info: 'Your monthly API request volume has been reached. Please upgrade your plan.',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeolocationService],
    }).compile();

    geolocationService = module.get<GeolocationService>(GeolocationService);
  });

  it('should be defined', () => {
    expect(geolocationService).toBeDefined();
  });

  describe('getLocation', () => {
    it('calls the API and returns the result object', async () => {
      axiosMocked.onGet().reply(200, mockedGeolocationResponse);
      const response = await geolocationService.getLocation('159.205.253.147');
      //expect(axiosMocked.get).toHaveBeenCalled();
      expect(response).toEqual(mockedGeolocationResponse);
    });
    //codes 404, 101, 102, 103, 104, 105, 301, 302, 303
    it('handles API error responses', async () => {
      axiosMocked.onGet().reply(200, mockedGeolocationErrorResponse);
      await expect(geolocationService.getLocation).rejects.toThrow();
    });

    it('handles rejected promises and/or exceptions', async () => {
      axiosMocked.onGet().reply(404);
      await expect(geolocationService.getLocation).rejects.toThrow();
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
        .reply(200, mockedGeolocationResponse);
      const response = await geolocationService.getLocation('159.205.253.147');
      expect(response).toEqual(mockedGeolocationResponse);
    });
  });
});

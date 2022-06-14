import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import {
  GeolocationErrorResponse,
  GeolocationResponse,
} from './geolocation-response.interface';
import { GeolocationService } from './geolocation.service';

describe('GeolocationService', () => {
  let service: GeolocationService;

  jest.mock('axios');
  const axiosMocked = jest.mocked(axios, true);
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

    service = module.get<GeolocationService>(GeolocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLocation', () => {
    it('calls the API and returns the result object', async () => {
      axiosMocked.get.mockResolvedValue(mockedGeolocationResponse);
      const response = await service.getLocation();
      expect(axiosMocked.get).toHaveBeenCalled();
      expect(response).toEqual(mockedGeolocationResponse);
    });
    //codes 404, 101, 102, 103, 104, 105, 301, 302, 303
    it('handles API error responses', async () => {
      axiosMocked.get.mockResolvedValue(mockedGeolocationErrorResponse);
      expect(service.getLocation).toThrow();
    });

    it('handles rejected promises and/or exceptions', async () => {
      axiosMocked.get.mockRejectedValue(new NotFoundException());
      expect(service.getLocation).toThrow();
    });

    it('uses retry logic', async () => {
      axiosMocked.get
        .mockRejectedValueOnce(new Error())
        .mockRejectedValueOnce(new Error())
        .mockResolvedValue(mockedGeolocationResponse);
      const response = await service.getLocation();
      expect(service.getLocation).toHaveBeenCalledTimes(3);
      expect(response).toEqual(mockedGeolocationResponse);
    });
  });
});

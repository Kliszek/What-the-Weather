import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GeolocationResponse } from './geolocation-response.interface';

@Injectable()
export class GeolocationService {
  async getLocation() {
    const response = await axios
      .get('https://gg.deals/asdf')
      .then((data) => {
        console.log('SFFAFA');
        console.log(data.statusText);
        console.log(data.data);
      })
      .catch((error) => {
        console.log('AAA');
        console.log(error);
      })
      .finally(() => {
        throw new Error('Not implemented');
      });
  }
}

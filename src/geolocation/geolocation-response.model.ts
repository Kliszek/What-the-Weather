/**
 * An object containing longitude and latitude.
 */
export class GeolocationResponse {
  // ip: string;
  // city: string;
  latitude: number | string;
  longitude: number | string;
}

/**
 * An error response structure of ipstack.com.
 */
export class GeolocationErrorResponse {
  success: boolean;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

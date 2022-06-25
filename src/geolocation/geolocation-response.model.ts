export class GeolocationResponse {
  // ip: string;
  // city: string;
  latitude: number | string;
  longitude: number | string;
}

export class GeolocationErrorResponse {
  success: boolean;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

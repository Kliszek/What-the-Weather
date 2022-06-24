export class GeolocationResponse {
  // ip: string;
  // city: string;
  latitude: string;
  longitude: string;
}

export class GeolocationErrorResponse {
  success: boolean;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

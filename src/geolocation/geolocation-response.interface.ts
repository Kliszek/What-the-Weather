export interface GeolocationResponse {
  ip: string;
  city: string;
  latitude: number | string;
  longitude: number | string;
}

export interface GeolocationErrorResponse {
  success: boolean;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

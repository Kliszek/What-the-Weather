export interface GeolocationResponse {
  ip: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface GeolocationErrorResponse {
  success: boolean;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

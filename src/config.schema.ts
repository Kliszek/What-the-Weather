import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  STAGE: Joi.string().required(),
  GEOLOCATION_BASEURL: Joi.string().uri().required(),
  GEOLOCATION_ACCESS_KEY: Joi.string().required(),
  GEOLOCATION_BASEURL2: Joi.string().uri().required(),
  GEOLOCATION_ACCESS_KEY2: Joi.string().required(),
  WEATHER_BASEURL: Joi.string().uri().required(),
  WEATHER_ACCESS_KEY: Joi.string().required(),
  RETRIES: Joi.number().integer().default(5).required(),
  BACKOFF: Joi.number().integer().default(300).required(),
  CACHE_IPADDRESSES_KEYNAME: Joi.string().default('IPAddresses').required(),
  CACHE_IPEXP_KEYNAME: Joi.string().default('IPExp').required(),
  CACHE_WEATHERID_KEYNAME: Joi.string().default('WeatherID').required(),
  CACHE_WEATHERDATA_KEYNAME: Joi.string().default('WeatherData').required(),
  CACHE_WEATHEREXP_KEYNAME: Joi.string().default('WeatherExp').required(),
  CACHE_IP_TTL: Joi.number().integer().default(3600000).required(),
  CACHE_WEATHER_TTL: Joi.number().integer().default(3600000).required(),
});

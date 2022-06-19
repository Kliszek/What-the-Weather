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
});

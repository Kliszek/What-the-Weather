# What the Weather?

A simple weather application written in [Nest.js](https://github.com/nestjs/nest).

### Test it [here](https://what-the-weather-1.herokuapp.com/).

Or see the OpenAPI documentation [here](https://what-the-weather-backend.herokuapp.com/v1/api/).

## Description

This application serves as a weather forecasting service. It uses external APIs to locate the user by their IP address and then presents them with current weather condition in their area.

There are two endpoints available:

    /v1/api/weather
    /v1/api/weather/:city-name

The prior one will use user's local position,

the latter will serve weather forecast for a chosen city.

### How does it work?

- It uses [ipstack.com](https://ipstack.com/documentation) and [ipgeolocation.io](https://ipgeolocation.io/documentation/ip-geolocation-api.html) as the geolocation APIs
- It uses [openweathermap.org](https://openweathermap.org/current) as the weather API
- It uses Redis as the caching database
- After each request, the IP location, weather location and city location are saved in cache
- A single weather entry is valid in a 50 km radius from the assigned location
- IP location and weather location do expire after an hour, city location does not

## Installation

```bash
$ npm install
```

## Running the app

To run the app you can use docker-compose file.
First, you have to specify all the environmental variables in **_docker-compose.yaml_** and then run the command:

```bash
# running in docker
$ docker-compose -f ./docker-compose.yaml up
```

You can also run the app using Node.js locally:

```bash
# development
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Configuration

The application takes some config values. They are read from a file **_.env.{STAGE}_**, where **_STAGE_** is a environmental variable, that has to be specified. The rest of the values are presented here:

| Name                      | Description                                                                                         | Default value         |
| ------------------------- | --------------------------------------------------------------------------------------------------- | --------------------- |
| STAGE                     | _dev_ for development, _prod_ for production                                                        | _none_ (required)     |
| PORT                      | The port number of the application                                                                  | 3000                  |
| GEOLOCATION_BASEURL       | The base URL of the geolocation API                                                                 | _none_ (required)     |
| GEOLOCATION_ACCESS_KEY    | The access key for the geolocation API                                                              | _none_ (required)     |
| GEOLOCATION_BASEURL2      | The base URL of the second geolocation API                                                          | _none_                |
| GEOLOCATION_ACCESS_KEY2   | The access key for the second geolocation API                                                       | _none_                |
| WEATHER_BASEURL           | The base URL of the weather API                                                                     | _none_ (required)     |
| WEATHER_ACCESS_KEY        | The access key for the weather API                                                                  | _none_ (required)     |
| RETRIES                   | The maximal number of trials to establish connection to an API before returning an error            | 5                     |
| BACKOFF                   | The initial back-off time between retries, in milliseconds (after each retry it is multiplied by 2) | 300                   |
| CACHE_USERNAME            | The username for accessing the Redis database                                                       | _none_                |
| CACHE_PASSWORD            | The password for accessing the Redis database                                                       | _none_                |
| CACHE_DATABASE_ADDRESS    | The address of the Redis cache database                                                             | _none_ (required)     |
| CACHE_DATABASE_PORT       | The port of the Redis cache database                                                                | _none_ (required)     |
| CACHE_IPADDRESSES_KEYNAME | The keyname of the Sorted Set in which the geolocation of IP addresses should be kept               | IPAddresses           |
| CACHE_IPEXP_KEYNAME       | The keyname of the IP addresses expiration Sorted Set                                               | IPExp                 |
| CACHE_WEATHERID_KEYNAME   | The keyname of the Sorted Set in which the weather IDs should be kept                               | WeatherID             |
| CACHE_WEATHERDATA_KEYNAME | The keyname of the Hash in which the weather JSON data should be kept                               | WeatherData           |
| CACHE_WEATHEREXP_KEYNAME  | The keyname of the weather entries expiration Sorted Set                                            | WeatherExp            |
| CACHE_CITIES_KEYNAME      | The keyname of the city geolocation Sorted Set                                                      | Cities                |
| CACHE_WEATHER_RADIUS      | The radius of the cached weather in kilometers                                                      | 50                    |
| CACHE_IP_TTL              | The IP addresses' geolocation's Time To Live in milliseconds                                        | 3600000               |
| CACHE_WEATHER_TTL         | The weather's geolocation's Time To Live in milliseconds                                            | 3600000               |
| CORS_ORIGIN               | The allowed origin for Cross-Origin-Resource-Sharing                                                | http://localhost:3001 |
| THROTTLER_TTL             | The time in seconds for which each request will last in storage                                     | 60                    |
| THROTTLER_LIMIT           | The maximum number of requests that can be made within the limit                                    | 10                    |

## Tests

I only wrote unit tests for this application.

```bash
$ npm run test
```

## Possible improvements

Due to the fact that my skills are still limited, the solutions I used could be most probably greatly improved (most noticeably cache management):

- The cache expiration should be ideally handled by the cache database itself (not possible with Redis)
- All the queries (including wrong city names) could be saved in cache, at least for short period of time. TypeORM can do that efficiently ([link](https://orkhan.gitbook.io/typeorm/docs/caching))
- There should be more tests
- The geolocation RequestObject should be more flexible (it should be easier to add a new API)
- For a bigger number of APIs, maybe an API hub like [rapidapi.com](https://docs.rapidapi.com/docs/what-is-rapidapi) should be used (?)
- Cache should be ideally managed in interceptors
- Global validation pipes could have been used for checking some arguments

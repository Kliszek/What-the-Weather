/**
 * Such request object makes it easy to handle different urls and parameters structure
 * in one function. useFallback() allows to chain next RequestObject in case of API failure.
 * Maybe it was enough to just use a regular array, I don't know.
 * I already did this and it works. Pros are that it's easy to check and switch to the next API.
 */

/**
 * An object containing url address and params of a request.
 * It can hold a fallback function returning the next instance.
 */
export interface RequestObject {
  url: string;
  params: object;
  useFallback?: () => RequestObject;
}

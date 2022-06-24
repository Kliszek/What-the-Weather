/**
 * Such request object makes it easy to handle different urls and parameters structure
 * in one function. useFallback() allows to chain next RequestObject in case of API failure
 */

export interface RequestObject {
  url: string;
  params: object;
  useFallback?: () => RequestObject;
}

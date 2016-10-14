# vicarious
General node.js proxy

Request

Is this a cacheable request? (GET, HEAD, ?)

 * can cacheable be determined by policy
 * execute policy on the request/response objects
   and store the results in those objects
 * decisions are made based on the state stored
   in the object

If it is not cacheable then send it to the origin, and forward
the response.

 * Is request cacheable?
     * call policy hook to determine cacheability
 * Yes:
     * request policy hook
     * Is it in the cache?
     * Yes:
         * Has it expired?
         * No:
         * Does policy say to validate from origin anyway?
           * Check origin
         * serve from the cache
         * Yes:
         * Attempt refresh from origin
           * if is succeeds - save cache
         * serve from cache
           * this will be fresh if origin succeeded
           * this will be stale if origin failed
     * No:
         * Attempt to fill cache from origin
         * Fail:
           * serve error page
         * Succeed:
           * send fresh from cache
 * No:
     * Send request to origin

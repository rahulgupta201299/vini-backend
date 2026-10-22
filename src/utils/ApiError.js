/** An error with an HTTP status code. Throw it anywhere; the error middleware sends it to the client. */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export default ApiError;

// Legacy schedule-api
// TODO: This Lambda has been superseded by analytics-service.
// It is retired and not expected to receive traffic.

exports.handler = async () => {
  return {
    statusCode: 410,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      error: "GONE",
      message: "This API has been retired. Use the analytics-service endpoints instead."
    })
  };
};
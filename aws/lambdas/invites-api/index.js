// Legacy invites-api
// TODO: This Lambda has been superseded by features-service.
// It is retired and not expected to receive traffic.

exports.handler = async () => {
  return {
    statusCode: 410,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      error: "GONE",
      message: "This API has been retired. Use the features-service endpoints instead."
    })
  };
};
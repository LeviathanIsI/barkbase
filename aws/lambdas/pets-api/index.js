// Legacy pets-api
// This Lambda has been superseded by entity-service (pets/owners/staff).
// It is retired and returns 410 for all requests.

exports.handler = async () => {
  return {
    statusCode: 410,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      error: "GONE",
      message: "This API has been retired. Use the entity-service endpoints instead."
    })
  };
};

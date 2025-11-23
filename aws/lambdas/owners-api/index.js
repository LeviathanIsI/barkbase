// Legacy owners-api
// TODO: This Lambda has been superseded by entity-service (pets/owners/staff).
// It is retired and not expected to receive traffic.

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
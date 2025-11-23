// Legacy properties-api (v1)
// TODO: This Lambda has been superseded by properties-api-v2.
// It is now retired and will be removed in the next decommission phase.

exports.handler = async () => {
  return {
    statusCode: 410,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      error: "GONE",
      message: "The v1 Properties API has been retired. Use /api/v2/properties instead."
    })
  };
};

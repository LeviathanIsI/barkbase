/**
 * =============================================================================
 * BarkBase Square POS Integration
 * =============================================================================
 * 
 * Square integration for point-of-sale payments, inventory, and catalog
 * 
 * Required Environment Variables:
 * - SQUARE_ACCESS_TOKEN: Square access token
 * - SQUARE_ENVIRONMENT: 'sandbox' or 'production'
 * - SQUARE_LOCATION_ID: Square location ID
 * 
 * =============================================================================
 */

let squareClient = null;

/**
 * Initialize Square client (lazy initialization)
 */
function getSquareClient() {
  if (!squareClient) {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';

    if (!accessToken) {
      console.warn('[SQUARE] Square access token not configured');
      return null;
    }

    const { Client, Environment } = require('square');
    squareClient = new Client({
      accessToken,
      environment: environment === 'production' ? Environment.Production : Environment.Sandbox,
    });
  }
  return squareClient;
}

/**
 * Get Square location ID
 */
function getLocationId() {
  return process.env.SQUARE_LOCATION_ID;
}

/**
 * Check if Square is configured
 */
function isSquareConfigured() {
  return Boolean(
    process.env.SQUARE_ACCESS_TOKEN &&
    process.env.SQUARE_LOCATION_ID
  );
}

// =============================================================================
// PAYMENTS
// =============================================================================

/**
 * Create a Square payment
 * @param {object} params - Payment parameters
 * @returns {Promise<object>}
 */
async function createPayment(params) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  const {
    sourceId, // Payment source (nonce from Web Payments SDK)
    amount, // Amount in cents
    currency = 'USD',
    customerId,
    referenceId,
    note,
    autocomplete = true,
  } = params;

  console.log('[SQUARE] Creating payment:', { amount, customerId, referenceId });

  try {
    const response = await client.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: `${referenceId || 'pay'}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      amountMoney: {
        amount: BigInt(amount),
        currency,
      },
      locationId: getLocationId(),
      customerId,
      referenceId,
      note,
      autocomplete,
    });

    console.log('[SQUARE] Payment created:', response.result.payment?.id);

    return {
      success: true,
      paymentId: response.result.payment?.id,
      status: response.result.payment?.status,
      receiptUrl: response.result.payment?.receiptUrl,
      payment: response.result.payment,
    };
  } catch (error) {
    console.error('[SQUARE] Payment failed:', error.message);
    throw error;
  }
}

/**
 * Get a payment by ID
 */
async function getPayment(paymentId) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  try {
    const response = await client.paymentsApi.getPayment(paymentId);
    return response.result.payment;
  } catch (error) {
    console.error('[SQUARE] Get payment failed:', error.message);
    throw error;
  }
}

/**
 * Refund a payment
 */
async function refundPayment(paymentId, amount, reason) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  console.log('[SQUARE] Refunding payment:', { paymentId, amount });

  try {
    const response = await client.refundsApi.refundPayment({
      idempotencyKey: `refund-${paymentId}-${Date.now()}`,
      paymentId,
      amountMoney: amount ? {
        amount: BigInt(amount),
        currency: 'USD',
      } : undefined,
      reason,
    });

    return {
      success: true,
      refundId: response.result.refund?.id,
      status: response.result.refund?.status,
      refund: response.result.refund,
    };
  } catch (error) {
    console.error('[SQUARE] Refund failed:', error.message);
    throw error;
  }
}

// =============================================================================
// CUSTOMERS
// =============================================================================

/**
 * Create a Square customer
 */
async function createCustomer(params) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  const { email, firstName, lastName, phone, referenceId, note } = params;

  console.log('[SQUARE] Creating customer:', { email, firstName });

  try {
    const response = await client.customersApi.createCustomer({
      idempotencyKey: `customer-${referenceId || Date.now()}`,
      emailAddress: email,
      givenName: firstName,
      familyName: lastName,
      phoneNumber: phone,
      referenceId,
      note,
    });

    return {
      success: true,
      customerId: response.result.customer?.id,
      customer: response.result.customer,
    };
  } catch (error) {
    console.error('[SQUARE] Create customer failed:', error.message);
    throw error;
  }
}

/**
 * Search for a customer by email or reference ID
 */
async function searchCustomer(params) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  const { email, referenceId } = params;

  try {
    const filters = [];
    
    if (email) {
      filters.push({
        emailAddress: { exact: email },
      });
    }
    
    if (referenceId) {
      filters.push({
        referenceId: { exact: referenceId },
      });
    }

    const response = await client.customersApi.searchCustomers({
      query: {
        filter: {
          emailAddress: email ? { exact: email } : undefined,
          referenceId: referenceId ? { exact: referenceId } : undefined,
        },
      },
    });

    return {
      success: true,
      customers: response.result.customers || [],
    };
  } catch (error) {
    console.error('[SQUARE] Search customer failed:', error.message);
    throw error;
  }
}

/**
 * Get or create a Square customer
 */
async function getOrCreateCustomer(params) {
  const { email, referenceId, firstName, lastName, phone } = params;

  // Try to find existing customer
  const searchResult = await searchCustomer({ email, referenceId });
  
  if (searchResult.customers.length > 0) {
    return {
      success: true,
      customerId: searchResult.customers[0].id,
      customer: searchResult.customers[0],
      created: false,
    };
  }

  // Create new customer
  const createResult = await createCustomer({
    email,
    firstName,
    lastName,
    phone,
    referenceId,
  });

  return {
    ...createResult,
    created: true,
  };
}

// =============================================================================
// CATALOG (SERVICES)
// =============================================================================

/**
 * List catalog items (services)
 */
async function listCatalogItems(types = ['ITEM']) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  try {
    const response = await client.catalogApi.listCatalog(undefined, types.join(','));

    return {
      success: true,
      items: response.result.objects || [],
    };
  } catch (error) {
    console.error('[SQUARE] List catalog failed:', error.message);
    throw error;
  }
}

/**
 * Create a catalog item (service)
 */
async function createCatalogItem(params) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  const { name, description, price, currency = 'USD' } = params;

  console.log('[SQUARE] Creating catalog item:', { name, price });

  try {
    const response = await client.catalogApi.upsertCatalogObject({
      idempotencyKey: `item-${name}-${Date.now()}`,
      object: {
        type: 'ITEM',
        id: `#${name.replace(/\s+/g, '_').toUpperCase()}`,
        itemData: {
          name,
          description,
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: `#${name.replace(/\s+/g, '_').toUpperCase()}_VAR`,
              itemVariationData: {
                name: 'Regular',
                pricingType: 'FIXED_PRICING',
                priceMoney: {
                  amount: BigInt(price),
                  currency,
                },
              },
            },
          ],
        },
      },
    });

    return {
      success: true,
      itemId: response.result.catalogObject?.id,
      item: response.result.catalogObject,
    };
  } catch (error) {
    console.error('[SQUARE] Create catalog item failed:', error.message);
    throw error;
  }
}

// =============================================================================
// CHECKOUT / TERMINAL
// =============================================================================

/**
 * Create a checkout link (hosted checkout page)
 */
async function createCheckoutLink(params) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  const {
    orderId,
    customerId,
    lineItems,
    redirectUrl,
    note,
  } = params;

  console.log('[SQUARE] Creating checkout link:', { orderId, lineItems: lineItems?.length });

  try {
    // First create an order
    const orderResponse = await client.ordersApi.createOrder({
      idempotencyKey: `order-${orderId || Date.now()}`,
      order: {
        locationId: getLocationId(),
        customerId,
        referenceId: orderId,
        lineItems: lineItems.map(item => ({
          name: item.name,
          quantity: String(item.quantity || 1),
          basePriceMoney: {
            amount: BigInt(item.price),
            currency: 'USD',
          },
          note: item.note,
        })),
        metadata: {
          barkbase_order_id: orderId || '',
        },
      },
    });

    const order = orderResponse.result.order;

    // Create checkout link
    const checkoutResponse = await client.checkoutApi.createPaymentLink({
      idempotencyKey: `checkout-${orderId || Date.now()}`,
      order: {
        locationId: getLocationId(),
        lineItems: order.lineItems,
      },
      checkoutOptions: {
        redirectUrl,
        askForShippingAddress: false,
      },
      prePopulatedData: customerId ? {
        buyerEmail: undefined, // Will be populated from customer
      } : undefined,
    });

    return {
      success: true,
      checkoutUrl: checkoutResponse.result.paymentLink?.url,
      orderId: order.id,
      paymentLinkId: checkoutResponse.result.paymentLink?.id,
    };
  } catch (error) {
    console.error('[SQUARE] Create checkout failed:', error.message);
    throw error;
  }
}

// =============================================================================
// TRANSACTIONS / ORDERS
// =============================================================================

/**
 * List recent orders
 */
async function listOrders(params = {}) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  const { limit = 50, cursor } = params;

  try {
    const response = await client.ordersApi.searchOrders({
      locationIds: [getLocationId()],
      query: {
        sort: {
          sortField: 'CREATED_AT',
          sortOrder: 'DESC',
        },
      },
      limit,
      cursor,
    });

    return {
      success: true,
      orders: response.result.orders || [],
      cursor: response.result.cursor,
    };
  } catch (error) {
    console.error('[SQUARE] List orders failed:', error.message);
    throw error;
  }
}

/**
 * Get an order by ID
 */
async function getOrder(orderId) {
  const client = getSquareClient();
  if (!client) throw new Error('Square not configured');

  try {
    const response = await client.ordersApi.retrieveOrder(orderId);
    return response.result.order;
  } catch (error) {
    console.error('[SQUARE] Get order failed:', error.message);
    throw error;
  }
}

module.exports = {
  getSquareClient,
  isSquareConfigured,
  getLocationId,
  // Payments
  createPayment,
  getPayment,
  refundPayment,
  // Customers
  createCustomer,
  searchCustomer,
  getOrCreateCustomer,
  // Catalog
  listCatalogItems,
  createCatalogItem,
  // Checkout
  createCheckoutLink,
  // Orders
  listOrders,
  getOrder,
};


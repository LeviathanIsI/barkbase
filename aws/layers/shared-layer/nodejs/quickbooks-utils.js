/**
 * =============================================================================
 * BarkBase QuickBooks Online Integration
 * =============================================================================
 * 
 * QuickBooks integration for syncing invoices, payments, and customers
 * 
 * Required Environment Variables:
 * - QUICKBOOKS_CLIENT_ID: QuickBooks OAuth client ID
 * - QUICKBOOKS_CLIENT_SECRET: QuickBooks OAuth client secret
 * - QUICKBOOKS_REDIRECT_URI: OAuth redirect URI
 * - QUICKBOOKS_ENVIRONMENT: 'sandbox' or 'production'
 * 
 * Note: QuickBooks uses OAuth 2.0, so tokens must be stored and refreshed per tenant
 * 
 * =============================================================================
 */

const BASE_URL = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com',
};

const AUTH_URL = {
  sandbox: 'https://appcenter.intuit.com/connect/oauth2',
  production: 'https://appcenter.intuit.com/connect/oauth2',
};

/**
 * Get QuickBooks configuration
 */
function getConfig() {
  return {
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
    environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox',
  };
}

/**
 * Check if QuickBooks is configured
 */
function isQuickBooksConfigured() {
  const config = getConfig();
  return Boolean(config.clientId && config.clientSecret);
}

/**
 * Get the base API URL
 */
function getBaseUrl() {
  const env = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
  return BASE_URL[env] || BASE_URL.sandbox;
}

// =============================================================================
// OAUTH 2.0
// =============================================================================

/**
 * Generate OAuth authorization URL
 * @param {string} state - State parameter for CSRF protection
 * @returns {string}
 */
function getAuthorizationUrl(state) {
  const config = getConfig();
  const env = config.environment;
  const baseAuthUrl = AUTH_URL[env] || AUTH_URL.sandbox;

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: config.redirectUri,
    state,
  });

  return `${baseAuthUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code
 * @returns {Promise<object>} - Token response
 */
async function exchangeCodeForTokens(code) {
  const config = getConfig();

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<object>} - New token response
 */
async function refreshAccessToken(refreshToken) {
  const config = getConfig();

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks token refresh failed: ${error}`);
  }

  return response.json();
}

// =============================================================================
// API REQUESTS
// =============================================================================

/**
 * Make an authenticated API request to QuickBooks
 * @param {string} accessToken - Access token
 * @param {string} realmId - QuickBooks company ID
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>}
 */
async function apiRequest(accessToken, realmId, endpoint, options = {}) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/v3/company/${realmId}/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// =============================================================================
// CUSTOMERS
// =============================================================================

/**
 * Create or update a customer in QuickBooks
 */
async function syncCustomer(accessToken, realmId, customer) {
  const { email, firstName, lastName, phone, displayName, barkbaseId } = customer;

  console.log('[QUICKBOOKS] Syncing customer:', displayName || email);

  const customerData = {
    DisplayName: displayName || `${firstName} ${lastName}`.trim(),
    GivenName: firstName,
    FamilyName: lastName,
    PrimaryEmailAddr: email ? { Address: email } : undefined,
    PrimaryPhone: phone ? { FreeFormNumber: phone } : undefined,
    Notes: `BarkBase ID: ${barkbaseId}`,
  };

  // Check if customer exists by email
  const queryResult = await apiRequest(accessToken, realmId, 
    `query?query=${encodeURIComponent(`select * from Customer where PrimaryEmailAddr = '${email}'`)}`
  );

  if (queryResult.QueryResponse?.Customer?.length > 0) {
    // Update existing customer
    const existingCustomer = queryResult.QueryResponse.Customer[0];
    customerData.Id = existingCustomer.Id;
    customerData.SyncToken = existingCustomer.SyncToken;
    customerData.sparse = true;

    const result = await apiRequest(accessToken, realmId, 'customer', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });

    return {
      success: true,
      quickbooksId: result.Customer.Id,
      created: false,
      customer: result.Customer,
    };
  }

  // Create new customer
  const result = await apiRequest(accessToken, realmId, 'customer', {
    method: 'POST',
    body: JSON.stringify(customerData),
  });

  return {
    success: true,
    quickbooksId: result.Customer.Id,
    created: true,
    customer: result.Customer,
  };
}

/**
 * Get a customer from QuickBooks
 */
async function getCustomer(accessToken, realmId, customerId) {
  const result = await apiRequest(accessToken, realmId, `customer/${customerId}`);
  return result.Customer;
}

// =============================================================================
// INVOICES
// =============================================================================

/**
 * Create an invoice in QuickBooks
 */
async function createInvoice(accessToken, realmId, invoice) {
  const {
    customerId,
    lineItems,
    dueDate,
    invoiceNumber,
    barkbaseBookingId,
    memo,
  } = invoice;

  console.log('[QUICKBOOKS] Creating invoice:', invoiceNumber);

  const invoiceData = {
    CustomerRef: { value: customerId },
    Line: lineItems.map((item, index) => ({
      Id: String(index + 1),
      LineNum: index + 1,
      Amount: item.amount,
      DetailType: 'SalesItemLineDetail',
      Description: item.description,
      SalesItemLineDetail: {
        Qty: item.quantity || 1,
        UnitPrice: item.unitPrice || item.amount,
        // ItemRef if you have QuickBooks items mapped
      },
    })),
    DueDate: dueDate,
    DocNumber: invoiceNumber,
    PrivateNote: memo || `BarkBase Booking: ${barkbaseBookingId}`,
    CustomField: [
      {
        DefinitionId: '1',
        Name: 'BarkBase ID',
        Type: 'StringType',
        StringValue: barkbaseBookingId || '',
      },
    ],
  };

  const result = await apiRequest(accessToken, realmId, 'invoice', {
    method: 'POST',
    body: JSON.stringify(invoiceData),
  });

  return {
    success: true,
    quickbooksId: result.Invoice.Id,
    docNumber: result.Invoice.DocNumber,
    invoice: result.Invoice,
  };
}

/**
 * Get an invoice from QuickBooks
 */
async function getInvoice(accessToken, realmId, invoiceId) {
  const result = await apiRequest(accessToken, realmId, `invoice/${invoiceId}`);
  return result.Invoice;
}

/**
 * Mark invoice as paid
 */
async function recordPayment(accessToken, realmId, payment) {
  const {
    customerId,
    invoiceId,
    amount,
    paymentDate,
    paymentMethod,
    referenceNumber,
  } = payment;

  console.log('[QUICKBOOKS] Recording payment:', { invoiceId, amount });

  const paymentData = {
    CustomerRef: { value: customerId },
    TotalAmt: amount,
    TxnDate: paymentDate || new Date().toISOString().split('T')[0],
    PaymentMethodRef: paymentMethod ? { value: paymentMethod } : undefined,
    PaymentRefNum: referenceNumber,
    Line: [
      {
        Amount: amount,
        LinkedTxn: [
          {
            TxnId: invoiceId,
            TxnType: 'Invoice',
          },
        ],
      },
    ],
  };

  const result = await apiRequest(accessToken, realmId, 'payment', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });

  return {
    success: true,
    quickbooksId: result.Payment.Id,
    payment: result.Payment,
  };
}

// =============================================================================
// REPORTS
// =============================================================================

/**
 * Get profit and loss report
 */
async function getProfitAndLoss(accessToken, realmId, startDate, endDate) {
  const result = await apiRequest(accessToken, realmId, 
    `reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`
  );
  return result;
}

/**
 * Get accounts receivable aging report
 */
async function getARAgingSummary(accessToken, realmId) {
  const result = await apiRequest(accessToken, realmId, 'reports/AgedReceivables');
  return result;
}

// =============================================================================
// SYNC STATUS
// =============================================================================

/**
 * Get QuickBooks connection status
 */
async function getConnectionStatus(accessToken, realmId) {
  try {
    const result = await apiRequest(accessToken, realmId, 'companyinfo/' + realmId);
    return {
      connected: true,
      companyName: result.CompanyInfo.CompanyName,
      companyId: realmId,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

module.exports = {
  getConfig,
  isQuickBooksConfigured,
  getBaseUrl,
  // OAuth
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  // API
  apiRequest,
  // Customers
  syncCustomer,
  getCustomer,
  // Invoices
  createInvoice,
  getInvoice,
  recordPayment,
  // Reports
  getProfitAndLoss,
  getARAgingSummary,
  // Status
  getConnectionStatus,
};


// Test script to verify the fixed endpoints work correctly
const axios = require('axios');

const API_URL = 'https://smvidb1rd0.execute-api.us-east-2.amazonaws.com';
// You'll need to replace this with an actual JWT token
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';

async function testEndpoints() {
    const endpoints = [
        { method: 'GET', path: '/api/v1/runs/assignments', params: { date: '2025-11-20' } },
        { method: 'GET', path: '/api/v1/kennels/occupancy' }
    ];

    console.log('Testing fixed endpoints...\n');

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.method} ${endpoint.path}`);

            const response = await axios({
                method: endpoint.method,
                url: `${API_URL}${endpoint.path}`,
                params: endpoint.params || {},
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✓ SUCCESS: ${endpoint.path}`);
            console.log(`  Status: ${response.status}`);
            console.log(`  Data:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...\n');
        } catch (error) {
            console.log(`✗ FAILED: ${endpoint.path}`);
            console.log(`  Status: ${error.response?.status || 'No response'}`);
            console.log(`  Error: ${error.response?.data?.error || error.message}\n`);
        }
    }
}

// Instructions for getting a JWT token
console.log('To test these endpoints, you need to:');
console.log('1. Login to the application and copy a JWT token from localStorage or Network tab');
console.log('2. Replace YOUR_JWT_TOKEN_HERE in this script');
console.log('3. Run: node test-fixed-endpoints.js\n');

// Check if token is provided
if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('Please add your JWT token first!');
    console.log('\nAlternatively, you can test directly with curl:');
    console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" "${API_URL}/api/v1/runs/assignments?date=2025-11-20"`);
    console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" "${API_URL}/api/v1/kennels/occupancy"`);
} else {
    testEndpoints();
}
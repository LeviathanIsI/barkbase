// Test script for new Barkbase endpoints
// Run this in your browser console while logged into Barkbase

async function testEndpoints() {
    const apiUrl = 'https://smvidb1rd0.execute-api.us-east-2.amazonaws.com';

    // Get the auth token from localStorage or sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    if (!token) {
        console.error('No auth token found. Please log in first.');
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const endpoints = [
        // Pet Vaccination Endpoints
        { method: 'GET', path: '/api/v1/pets/vaccinations/expiring?daysAhead=90', name: 'Pet Vaccinations Expiring' },

        // Report Endpoints
        { method: 'GET', path: '/api/v1/reports/arrivals', name: 'Arrivals Report' },
        { method: 'GET', path: '/api/v1/reports/departures', name: 'Departures Report' },
        { method: 'GET', path: '/api/v1/reports/dashboard', name: 'Dashboard Report' },

        // Entity Endpoints (test existing ones to ensure they still work)
        { method: 'GET', path: '/api/v1/pets', name: 'List Pets' },
        { method: 'GET', path: '/api/v1/owners', name: 'List Owners' },
        { method: 'GET', path: '/api/v1/staff', name: 'List Staff' }
    ];

    console.log('🧪 Testing Barkbase Endpoints...\n');
    console.log('=====================================\n');

    const results = [];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${apiUrl}${endpoint.path}`, {
                method: endpoint.method,
                headers: headers
            });

            const statusEmoji = response.ok ? '✅' : '❌';
            const result = {
                name: endpoint.name,
                path: endpoint.path,
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            };

            if (response.ok) {
                const data = await response.json();
                result.dataReceived = true;
                result.recordCount = Array.isArray(data) ? data.length :
                                    (data.data && Array.isArray(data.data)) ? data.data.length :
                                    'N/A';
            } else {
                const errorText = await response.text();
                result.error = errorText;
            }

            results.push(result);

            console.log(`${statusEmoji} ${endpoint.name}`);
            console.log(`   Path: ${endpoint.path}`);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            if (result.recordCount !== undefined && result.recordCount !== 'N/A') {
                console.log(`   Records: ${result.recordCount}`);
            }
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            console.log('');

        } catch (error) {
            console.error(`❌ ${endpoint.name}`);
            console.error(`   Path: ${endpoint.path}`);
            console.error(`   Error: ${error.message}`);
            console.log('');

            results.push({
                name: endpoint.name,
                path: endpoint.path,
                error: error.message
            });
        }
    }

    console.log('=====================================');
    console.log('📊 Test Summary:');
    const passed = results.filter(r => r.ok).length;
    const failed = results.length - passed;
    console.log(`   Passed: ${passed}/${results.length}`);
    console.log(`   Failed: ${failed}/${results.length}`);

    if (failed > 0) {
        console.log('\n🔴 Failed Endpoints:');
        results.filter(r => !r.ok).forEach(r => {
            console.log(`   - ${r.name}: ${r.status || 'Network Error'} ${r.error || r.statusText || ''}`);
        });
    }

    return results;
}

// Run the test
console.log('To test all endpoints, run: testEndpoints()');
console.log('Make sure you are logged into Barkbase first!');
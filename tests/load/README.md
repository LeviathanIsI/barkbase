# BarkBase API Load Testing

Load tests for the BarkBase API using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# Windows (chocolatey)
choco install k6

# Windows (winget)
winget install k6

# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Getting an API Token

The load tests require a valid API token. To get one:

1. Log into BarkBase in your browser
2. Open DevTools (F12) -> Console
3. Run:
   ```javascript
   JSON.parse(localStorage.getItem('barkbase-auth')).state.accessToken
   ```
4. Copy the token value

**Note:** Tokens expire after ~1 hour. Get a fresh token before running tests.

## Running the Tests

### Basic Run

```bash
cd tests/load

# Set your token and run
k6 run -e API_TOKEN=your_token_here api-load-test.js
```

### With Custom Settings

```bash
# Custom tenant
k6 run -e API_TOKEN=your_token -e TENANT_ID=your-tenant-id api-load-test.js

# More users, longer duration
k6 run -e API_TOKEN=your_token --vus 50 --duration 2m api-load-test.js

# Ramp up load gradually
k6 run -e API_TOKEN=your_token --stage 10s:5,30s:20,10s:0 api-load-test.js
```

### Output to JSON

```bash
k6 run -e API_TOKEN=your_token --out json=results.json api-load-test.js
```

## Test Configuration

Default settings in `api-load-test.js`:

| Setting | Value |
|---------|-------|
| Virtual Users | 10 |
| Duration | 30 seconds |
| API Base URL | https://gvrsq1bmy6.execute-api.us-east-2.amazonaws.com/api/v1 |
| Tenant ID | 76815987-237f-4433-aad5-b904371d0918 |

## Endpoints Tested

- `GET /entity/owners` - List owners
- `GET /entity/pets` - List pets
- `GET /entity/bookings` - List bookings

## Metrics Tracked

- **http_req_duration**: Response time (threshold: p95 < 2s)
- **errors**: Error rate (threshold: < 10%)
- **owners_latency**: Response time for /owners endpoint
- **pets_latency**: Response time for /pets endpoint
- **bookings_latency**: Response time for /bookings endpoint

## Example Output

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: api-load-test.js
     output: -

  scenarios: (100.00%) 1 scenario, 10 max VUs, 1m0s max duration
           * default: 10 looping VUs for 30s

running (0m30.0s), 00/10 VUs, 200 complete and 0 interrupted iterations
default ✓ [======================================] 10 VUs  30s

     ✓ status is 200
     ✓ response has data

     bookings_latency.............: avg=234ms min=180ms max=450ms p(95)=380ms
     errors.......................: 0.00%  ✓ 0   ✗ 600
     http_req_duration............: avg=215ms min=150ms max=500ms p(95)=350ms
     owners_latency...............: avg=198ms min=140ms max=380ms p(95)=320ms
     pets_latency.................: avg=212ms min=155ms max=420ms p(95)=340ms
```

## Troubleshooting

### "API_TOKEN is required"
You need to provide a valid token. See "Getting an API Token" above.

### "401 Unauthorized"
Token is invalid or expired. Get a fresh token from the browser.

### "Connection refused"
API server may be down or URL is incorrect. Check the API_BASE_URL.

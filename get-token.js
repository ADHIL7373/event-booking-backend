/**
 * Get login token
 */
const http = require('http');

const loginData = JSON.stringify({
  email: 'admin@example.com',
  password: 'AdminPassword123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.data && response.data.token) {
        console.log(response.data.token);
      } else {
        console.error('No token in response:', response);
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.error('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(loginData);
req.end();

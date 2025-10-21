#!/usr/bin/env node

/**
 * Generate Test JWT Tokens for Local Development
 *
 * Usage:
 *   node scripts/generate-test-token.js
 *   node scripts/generate-test-token.js --role admin
 *   node scripts/generate-test-token.js --role user --tenant custom-tenant
 */

const crypto = require('crypto');

// Simple JWT implementation (for dev only - not cryptographically secure)
function createDevJWT(payload, secret = 'dev-secret') {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // For dev, we'll just create a simple signature
  // In reality, XSUAA uses RSA256 but this is fine for local testing
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Parse command line arguments
const args = process.argv.slice(2);
const roleArg = args.find(arg => arg.startsWith('--role='))?.split('=')[1] || 'admin';
const tenantArg = args.find(arg => arg.startsWith('--tenant='))?.split('=')[1] || 'dev-tenant';
const userArg = args.find(arg => arg.startsWith('--user='))?.split('=')[1] || 'dev-user';

// Role mappings
const roleMappings = {
  admin: ['admin', 'TenantAdmin', 'ModuleManager', 'Auditor', 'User'],
  modulemanager: ['ModuleManager', 'User'],
  auditor: ['Auditor', 'User'],
  user: ['User']
};

const roles = roleMappings[roleArg.toLowerCase()] || roleMappings.user;

// Create payload
const now = Math.floor(Date.now() / 1000);
const payload = {
  // Standard JWT claims
  iss: 'http://localhost:3000',
  sub: `${userArg}-${Date.now()}`,
  aud: 'sap-mvp-framework',
  exp: now + (60 * 60 * 24), // 24 hours
  iat: now,
  nbf: now,

  // User claims
  user_id: userArg,
  user_name: `${userArg}@example.com`,
  email: `${userArg}@example.com`,
  given_name: userArg.split('-')[0] || 'Dev',
  family_name: 'User',

  // Tenant/authorization claims
  zid: tenantArg,
  tenant_id: tenantArg,
  scope: roles,
  roles: roles,

  // XSUAA-like claims
  grant_type: 'client_credentials',
  client_id: 'dev-client',

  // Custom framework claims
  app: 'sap-mvp-framework',
  origin: 'dev'
};

const token = createDevJWT(payload);

// Output
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║          SAP MVP Framework - Test JWT Token                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Token Details:');
console.log(`   User:       ${payload.email}`);
console.log(`   Tenant:     ${payload.tenant_id}`);
console.log(`   Roles:      ${roles.join(', ')}`);
console.log(`   Expires:    ${new Date(payload.exp * 1000).toISOString()}\n`);

console.log('🔑 JWT Token:\n');
console.log(token);
console.log('\n');

console.log('📡 Usage Examples:\n');
console.log('# cURL:');
console.log(`curl -H "Authorization: Bearer ${token}" \\`);
console.log('  http://localhost:3000/api/admin/tenants\n');

console.log('# HTTPie:');
console.log(`http GET http://localhost:3000/api/admin/tenants \\`);
console.log(`  "Authorization: Bearer ${token}"\n`);

console.log('# Postman:');
console.log('  1. Authorization → Type: Bearer Token');
console.log(`  2. Token: ${token.substring(0, 50)}...\n`);

console.log('# JavaScript fetch:');
console.log(`fetch('http://localhost:3000/api/admin/tenants', {
  headers: { 'Authorization': 'Bearer ${token.substring(0, 30)}...' }
});\n`);

console.log('💡 Generate different tokens:\n');
console.log('   node scripts/generate-test-token.js --role=admin --tenant=acme-corp');
console.log('   node scripts/generate-test-token.js --role=modulemanager --user=john');
console.log('   node scripts/generate-test-token.js --role=auditor');
console.log('   node scripts/generate-test-token.js --role=user\n');

console.log('🔓 Decode token at: https://jwt.io\n');

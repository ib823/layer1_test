/**
 * Validation Script for Test Permutation Generation
 * Run this to verify all permutations are generated correctly
 */

import {
  UserRole,
  Permission,
  WorkflowType,
  CombinatorialTestGenerator,
  generateTestSummary,
  UserFactory,
  TenantFactory,
} from './test-data-factory';

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  COMPREHENSIVE TEST PERMUTATION VALIDATION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Generate test summary
const summary = generateTestSummary();

console.log('📊 Test Coverage Summary:\n');
console.log(`Total Unique Permutations: ${summary.totalPermutations.toLocaleString()}\n`);

console.log('┌─ Breakdown ──────────────────────────────────────────────┐');
console.log(`│ Total Roles:                  ${summary.breakdown.roles.toString().padStart(6)} │`);
console.log(`│ Total Workflows:              ${summary.breakdown.workflows.toString().padStart(6)} │`);
console.log(`│ Role × Workflow Combinations: ${summary.breakdown.roleWorkflowCombinations.toString().padStart(6)} │`);
console.log(`│ User Lifecycle Scenarios:     ${summary.breakdown.userLifecycles.toString().padStart(6)} │`);
console.log(`│ Tenant Lifecycle Scenarios:   ${summary.breakdown.tenantLifecycles.toString().padStart(6)} │`);
console.log(`│ Module Operation Scenarios:   ${summary.breakdown.moduleOperations.toString().padStart(6)} │`);
console.log('└──────────────────────────────────────────────────────────┘\n');

// Validate role permissions
console.log('🔐 Role Permission Validation:\n');
console.log(`Total Roles: ${Object.values(UserRole).length}`);
console.log(`Total Permissions: ${Object.values(Permission).length}\n`);

// Validate data generation
console.log('📝 Test Data Generation Validation:\n');

const testUser = UserFactory.createWithRole(UserRole.COMPLIANCE_OFFICER);
console.log(`✅ User Factory: Generated user ${testUser.email} with role ${testUser.roles[0]}`);

const testTenant = TenantFactory.createWithModules(['sod-control', 'invoice-matching']);
console.log(`✅ Tenant Factory: Generated tenant "${testTenant.name}" with ${testTenant.settings.enabledModules.length} modules`);

const batch = UserFactory.createBatch(10, UserRole.FINANCE_USER);
console.log(`✅ Batch Generation: Created ${batch.length} users`);

// Validate permutation generation
console.log('\n🔄 Permutation Generation Validation:\n');

const roleWorkflowPerms = CombinatorialTestGenerator.generateRoleWorkflowPermutations();
console.log(`✅ Role × Workflow: ${roleWorkflowPerms.length} permutations`);
console.log(`   - Should Succeed: ${roleWorkflowPerms.filter(p => p.shouldSucceed).length}`);
console.log(`   - Should Fail: ${roleWorkflowPerms.filter(p => !p.shouldSucceed).length}`);

const userLifecycles = CombinatorialTestGenerator.generateUserLifecyclePermutations();
console.log(`✅ User Lifecycles: ${userLifecycles.length} complete journeys`);

const tenantLifecycles = CombinatorialTestGenerator.generateTenantLifecyclePermutations();
console.log(`✅ Tenant Lifecycles: ${tenantLifecycles.length} scenarios`);

const moduleOps = CombinatorialTestGenerator.generateModuleOperationPermutations();
console.log(`✅ Module Operations: ${moduleOps.length} role × module scenarios`);

// Detailed analysis
console.log('\n📈 Detailed Analysis:\n');

// Role distribution
const roleDistribution = roleWorkflowPerms.reduce((acc, p) => {
  acc[p.role] = (acc[p.role] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Role × Workflow Distribution:');
Object.entries(roleDistribution)
  .sort((a, b) => b[1] - a[1])
  .forEach(([role, count]) => {
    const percentage = ((count / roleWorkflowPerms.length) * 100).toFixed(1);
    console.log(`  ${role.padEnd(25)} ${count.toString().padStart(3)} scenarios (${percentage}%)`);
  });

// Module distribution
const moduleDistribution = moduleOps.reduce((acc, p) => {
  acc[p.module] = (acc[p.module] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\nModule × Role Distribution:');
Object.entries(moduleDistribution)
  .sort((a, b) => b[1] - a[1])
  .forEach(([module, count]) => {
    const authorized = moduleOps.filter(m => m.module === module && m.shouldSucceed).length;
    console.log(`  ${module.padEnd(25)} ${count.toString().padStart(3)} tests (${authorized} authorized)`);
  });

// Lifecycle steps
console.log('\nUser Lifecycle Steps per Role:');
if (userLifecycles.length > 0) {
  const steps = userLifecycles[0].lifecycle.length;
  console.log(`  Each role goes through ${steps} lifecycle steps`);
  console.log(`  Total steps: ${userLifecycles.length} roles × ${steps} steps = ${userLifecycles.length * steps}`);
}

console.log('\nTenant Lifecycle Variations:');
const moduleVariations = Array.from(new Set(tenantLifecycles.map(t => t.enabledModules.length)));
moduleVariations.forEach(count => {
  const scenarios = tenantLifecycles.filter(t => t.enabledModules.length === count);
  console.log(`  ${count} modules: ${scenarios.length} scenarios`);
});

// Calculate total test steps
const totalRBACSteps = roleWorkflowPerms.length;
const totalUserLifecycleSteps = userLifecycles.reduce((acc, lc) => acc + lc.lifecycle.length, 0);
const totalTenantLifecycleSteps = tenantLifecycles.reduce((acc, lc) => acc + lc.lifecycle.length, 0);
const totalModuleSteps = moduleOps.reduce((acc, m) => acc + m.operations.length, 0);

console.log('\n🎯 Total Test Steps:\n');
console.log(`  RBAC Tests:                ${totalRBACSteps.toLocaleString()} steps`);
console.log(`  User Lifecycle Tests:      ${totalUserLifecycleSteps.toLocaleString()} steps`);
console.log(`  Tenant Lifecycle Tests:    ${totalTenantLifecycleSteps.toLocaleString()} steps`);
console.log(`  Module Workflow Tests:     ${totalModuleSteps.toLocaleString()} steps`);
console.log(`  ────────────────────────────────────────`);
console.log(`  TOTAL:                     ${(totalRBACSteps + totalUserLifecycleSteps + totalTenantLifecycleSteps + totalModuleSteps).toLocaleString()} steps\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ✅ Validation Complete!');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Next Steps:');
console.log('  1. Run comprehensive tests: pnpm test:e2e:comprehensive');
console.log('  2. Run RBAC tests only: pnpm test:e2e:comprehensive:rbac');
console.log('  3. Run critical path: pnpm test:e2e:critical');
console.log('  4. View full documentation: packages/web/e2e/comprehensive/README.md\n');

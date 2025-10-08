/**
 * Design System ESLint Rules
 * Custom rules to enforce design token usage
 */

module.exports = {
  rules: {
    'no-hardcoded-colors': require('./rules/no-hardcoded-colors'),
    'no-inline-styles': require('./rules/no-inline-styles'),
    'require-token-classes': require('./rules/require-token-classes'),
  },
};

/**
 * ESLint Rule: require-token-classes
 *
 * Warns when className uses arbitrary values instead of design token utilities.
 * Encourages use of predefined Tailwind classes that map to tokens.
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn on arbitrary Tailwind values; prefer token-based utilities',
      category: 'Design System',
      recommended: false,
    },
    messages: {
      arbitraryValue:
        'Arbitrary value "{{value}}" detected in className. Consider using design token utilities (e.g., bg-brand-primary, space-4) instead.',
    },
    schema: [],
  },

  create(context) {
    // Regex to detect arbitrary values in Tailwind: [#fff], [12px], etc.
    const arbitraryValuePattern = /\[([^\]]+)\]/g;

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;

        let classNameValue = '';

        // Extract className value
        if (node.value && node.value.type === 'Literal') {
          classNameValue = node.value.value;
        } else if (node.value && node.value.type === 'JSXExpressionContainer') {
          // Handle template literals or string expressions
          const expression = node.value.expression;
          if (expression.type === 'TemplateLiteral') {
            classNameValue = expression.quasis.map((q) => q.value.raw).join('');
          } else if (expression.type === 'Literal') {
            classNameValue = expression.value;
          }
        }

        if (!classNameValue) return;

        // Check for arbitrary values
        const matches = classNameValue.match(arbitraryValuePattern);
        if (matches) {
          matches.forEach((match) => {
            context.report({
              node,
              messageId: 'arbitraryValue',
              data: { value: match },
            });
          });
        }
      },
    };
  },
};

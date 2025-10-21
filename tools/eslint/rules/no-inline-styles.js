/**
 * ESLint Rule: no-inline-styles
 *
 * Prevents inline style objects in JSX.
 * Encourages use of className with design tokens.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow inline style prop in JSX',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      noInlineStyles:
        'Inline styles are not allowed. Use className with Tailwind utilities or CSS modules instead.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedComponents: {
            type: 'array',
            items: { type: 'string' },
            description: 'Component names where inline styles are allowed (e.g., Canvas, Chart)',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedComponents = options.allowedComponents || ['Canvas', 'svg', 'path', 'rect', 'circle'];

    return {
      JSXAttribute(node) {
        // Check if attribute is 'style'
        if (node.name.name !== 'style') return;

        // Get the parent JSX element name
        const parent = node.parent;
        if (parent.type !== 'JSXOpeningElement') return;

        const componentName = parent.name.name || parent.name.property?.name;

        // Skip if component is in allowed list
        if (allowedComponents.includes(componentName)) return;

        // Skip if it's a CSS variable only (e.g., style={{ '--var': value }})
        if (node.value && node.value.type === 'JSXExpressionContainer') {
          const expression = node.value.expression;
          if (expression.type === 'ObjectExpression') {
            const allPropsAreCssVars = expression.properties.every((prop) => {
              const key = prop.key.name || prop.key.value;
              return typeof key === 'string' && key.startsWith('--');
            });
            if (allPropsAreCssVars) return;
          }
        }

        // Report violation
        context.report({
          node,
          messageId: 'noInlineStyles',
        });
      },
    };
  },
};

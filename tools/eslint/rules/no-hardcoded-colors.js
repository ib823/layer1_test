/**
 * ESLint Rule: no-hardcoded-colors
 *
 * Prevents hardcoded color values in JSX/TSX files.
 * Enforces use of design tokens via CSS variables or Tailwind classes.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded color values (hex, rgb, rgba, hsl)',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      hardcodedColor:
        'Hardcoded color "{{value}}" detected. Use design tokens from @sap-framework/tokens or Tailwind classes instead.',
    },
    schema: [],
  },

  create(context) {
    // Regex patterns for color values
    const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
    const rgbPattern = /rgba?\([^)]+\)/g;
    const hslPattern = /hsla?\([^)]+\)/g;

    // Allowed exceptions (e.g., transparent, currentColor)
    const allowedValues = ['transparent', 'currentColor', 'inherit', 'initial', 'unset'];

    function checkForHardcodedColors(node, value) {
      if (typeof value !== 'string') return;

      // Skip if it's a CSS variable
      if (value.includes('var(--')) return;

      // Skip if in tokens.css file (where colors are defined)
      const filename = context.getFilename();
      if (filename.includes('tokens.css') || filename.includes('design-system.css')) return;

      // Check for hex colors
      const hexMatches = value.match(hexPattern);
      if (hexMatches) {
        hexMatches.forEach((match) => {
          if (!allowedValues.includes(match)) {
            context.report({
              node,
              messageId: 'hardcodedColor',
              data: { value: match },
            });
          }
        });
      }

      // Check for rgb/rgba colors
      const rgbMatches = value.match(rgbPattern);
      if (rgbMatches) {
        rgbMatches.forEach((match) => {
          context.report({
            node,
            messageId: 'hardcodedColor',
            data: { value: match },
          });
        });
      }

      // Check for hsl/hsla colors
      const hslMatches = value.match(hslPattern);
      if (hslMatches) {
        hslMatches.forEach((match) => {
          context.report({
            node,
            messageId: 'hardcodedColor',
            data: { value: match },
          });
        });
      }
    }

    return {
      // Check JSX style prop: <div style={{ color: '#FF0000' }} />
      JSXAttribute(node) {
        if (node.name.name === 'style' && node.value && node.value.type === 'JSXExpressionContainer') {
          const expression = node.value.expression;

          if (expression.type === 'ObjectExpression') {
            expression.properties.forEach((prop) => {
              if (prop.value && prop.value.type === 'Literal') {
                checkForHardcodedColors(node, prop.value.value);
              }
            });
          }
        }
      },

      // Check regular object properties: const style = { color: '#FF0000' }
      Property(node) {
        const key = node.key.name || node.key.value;
        const styleProps = ['color', 'backgroundColor', 'background', 'borderColor', 'fill', 'stroke'];

        if (styleProps.includes(key) && node.value.type === 'Literal') {
          checkForHardcodedColors(node, node.value.value);
        }
      },

      // Check template literals: `background: ${color}`
      TemplateLiteral(node) {
        node.quasis.forEach((quasi) => {
          checkForHardcodedColors(node, quasi.value.raw);
        });
      },
    };
  },
};

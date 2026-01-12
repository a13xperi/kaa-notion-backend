const path = require('path');

module.exports = function override(config) {
  // Remove ModuleScopePlugin so CRA allows imports outside src/
  config.resolve.plugins = (config.resolve.plugins || []).filter(
    (plugin) => plugin.constructor && plugin.constructor.name !== 'ModuleScopePlugin'
  );

  // Ensure module resolution prioritizes local node_modules
  config.resolve.modules = [
    path.resolve(__dirname, 'node_modules'),
    'node_modules',
  ];

  // Exclude node_modules from source-map-loader to avoid absolute-path sourcemap issues
  config.module.rules = config.module.rules.map((rule) => {
    if (rule && rule.enforce === 'pre' && Array.isArray(rule.use)) {
      return {
        ...rule,
        exclude: /node_modules/,
      };
    }
    return rule;
  });

  return config;
};

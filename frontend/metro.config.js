const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@': path.resolve(projectRoot, 'src'),
  '@/features': path.resolve(projectRoot, 'src/features'),
  '@/shared': path.resolve(projectRoot, 'src/shared'),
  '@/assets': path.resolve(projectRoot, 'assets'),
};

module.exports = config;

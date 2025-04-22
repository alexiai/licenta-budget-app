const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
    '@': './app',
    '@tabs': './app/tabs',
    '@components': './components',
    '@constants': './constants',
    '@hooks': './app/hooks',
    '@lib': './lib',
    '@home':'./app/home',
    '@styles': './styles',
    '@assets': './assets'
};

module.exports = config;

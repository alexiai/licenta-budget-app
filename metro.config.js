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

// Build exports are generated JavaScript, so keep them out of Metro's source graph.
const defaultBlockList = config.resolver.blockList;
const projectRoot = __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const separator = '[\\\\/]';
const buildDir = `(?:dist|web-build|\\.expo${separator}audit-[^\\\\/]+)`;
config.resolver.blockList = [
    ...(Array.isArray(defaultBlockList) ? defaultBlockList : [defaultBlockList].filter(Boolean)),
    new RegExp(`^${projectRoot}${separator}${buildDir}(?:${separator}|$)`),
];

module.exports = config;

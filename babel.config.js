module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['./'],
                    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
                    alias: {
                        '@': './app',
                        '@tabs': './app/tabs',
                        '@components': './components',
                        '@constants': './constants',
                        '@hooks': './app/hooks',
                        '@lib': './lib',
                        '@home':'./app/home',
                        '@styles':'./styles',
                        '@assets': './assets'
                    },
                },
            ],
        ],
    };
};

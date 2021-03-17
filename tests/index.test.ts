const LaravelMixManifestWebpackPlugin = require('../src/index');
const path = require('path');

describe('laravel-mix-manifest-webpack-plugin', () => {
    it('can be instantiated', () => {
        expect(new LaravelMixManifestWebpackPlugin({
            public: path.resolve(__dirname, './'),
            name: 'mix-manifest.json',
        })).toBeInstanceOf(LaravelMixManifestWebpackPlugin);
    });
});

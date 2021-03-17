const FontAwesomeAutoloadWebpackPlugin = require('../src/index');
const path = require('path');

describe('fontawesome-autoload-webpack-plugin', () => {
    it('can be instantiated', () => {
        expect(new FontAwesomeAutoloadWebpackPlugin({
            paths: [
                path.resolve(__dirname, './'),
            ],
        })).toBeInstanceOf(FontAwesomeAutoloadWebpackPlugin);
    });
});

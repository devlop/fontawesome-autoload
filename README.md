<p align="center">
    <a href="https://www.npmjs.org/package/@devlop-ab/fontawesome-autoload-webpack-plugin"><img src="https://img.shields.io/npm/v/@devlop-ab/fontawesome-autoload-webpack-plugin.svg" alt="Latest Stable Version"></a>
    <a href="https://github.com/devlop/fontawesome-autoload-webpack-plugin/blob/main/LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
</p>

# Font Awesome Autoload

This will search your views and find all Font Awesome Icons you are using and generate an autoload file that you can require in your project.
This will help with [treeshaking](https://fontawesome.com/how-to-use/javascript-api/other/tree-shaking) when you are using the 
[Font Awesome Javascript API](https://fontawesome.com/how-to-use/javascript-api/setup/getting-started) to manually configure Font Awesome and 
set up [dom.watch](https://fontawesome.com/how-to-use/javascript-api/methods/dom-watch), but you still include your icons in your views directly 
using `<i>` tags. 

Without an autoload file it is impossible for Font Awesome to properly do tree shaking.

# Supported Versions

This is made for **Font Awesome 6** and has no intentional support for earlier versions.

# Installing

using npm

```bash
npm install @devlop-ab/fontawesome-autoload-webpack-plugin
```

# Usage 

Configure the plugin in your [webpack.config.js](https://webpack.js.org/configuration/plugins/).

```js
const FontAwesomeAutoloadWebpackPlugin = require('@devlop-ab/fontawesome-autoload-webpack-plugin');

module.exports = {
    plugins: [
        new FontAwesomeAutoloadWebpackPlugin({
            // (REQUIRED) the paths to search 
            paths: [
                path.resolve(__dirname, 'resources/views/**/*.blade.php'),
            ],
            
            // (OPTIONAL) 
            // the path where the autoload file will be saved
            // default is node_modules/.cache/fontawesome.js
            outputPath: path.resolve(__dirname, 'node_modules/.cache/fontawesome.js'),
            
            // (OPTIONAL) specify icons to always include in the autoload, must be the fa6 "long prefix" followed by the icon name
            include: [
                // 'fa-brands fa-font-awesome',
                // 'fa-solid fa-elephant',
                // 'fa-regular fa-1','
                // 'fa-light fa-3','
                // 'fa-thin fa-3','
                // 'fa-duotone fa-7','
            ],
            
            // (OPTIONAL)
            // if you want to modify the search logic you can pass your own extractor callback
            // the callback will receive two arguments, file contents and the default extractor
            // and should return an array of found icons, each being an object with prefix and name.
            // optionally you can merge your extractor results with the default extractor results.
            extractor: function (contents, defaultExtractor) {
                // psuedo code example:
                
                let icons = [];
                
                // search the contents ...
                
                // add the icons you find
                icons.push({
                    prefix: 'fa-solid',
                    name: 'fa-rabbit'
                });
                
                // return the icons
                return icons;
                
                // optionally also apply the findings from the defaultExtractor
                return [...icons, ...defaultExtractor(contents)];
            },
            
            // (OPTIONAL) the packages you are using, expects only the package name excluding vendor prefix
            packages: [
                // this is the defaults if not configured
                // 'free-brands-svg-icons',
                // 'pro-duotone-svg-icons',
                // 'pro-light-svg-icons',
                // 'pro-regular-svg-icons',
                // 'pro-solid-svg-icons',
                // 'pro-thin-svg-icons',
            ],
        }),
    ],
}
```

Require the generated file in your javascript where you [configure Font Awesome](https://fontawesome.com/how-to-use/javascript-api/setup/getting-started).

```js
import { library, dom } from '@fortawesome/fontawesome-svg-core';
import icons from '.cache/fontawesome'; // must match the outputPath

library.add(...icons);
dom.watch();
```

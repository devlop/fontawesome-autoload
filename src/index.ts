'use strict';

const { Compiler, Stats } = require('webpack');
const { Collection } = require('collect.js');

const collect = require('collect.js');
const findCacheDir = require('find-cache-dir');
const fs = require('fs');
const glob = require('glob');
const os = require('os');
const path = require('path');
const validate = require('schema-utils').validate;

const schema = {
    "type": "object",
    "properties": {
        "paths": {
            "type": "array",
            "items": {
                "type": "string",
            },
            "minItems": 1,
        },
        "outputPath": {
            "type": "string",
        },
        "include": {
            "type": "array",
            "items": {
                "type": "string",
            },
            "minItems": 0,
        },
        "extractor": {
            "instanceof": "Function",
        },
        "mode": {
            "type": "string",
        },
        // "packages": {
        //     "type": "array",
        //     "items": {
        //         "type": "string",
        //     },
        //     "minItems": 1,
        // },
    },
    "additionalProperties": false,
    "required": [
        "paths",
        // "outputPath",
    ],
};

interface OptionsInterface
{
    paths : Array<string>;
    outputPath? : string;
    include? : Array<string>;
    extractor? : Function;
    mode? : string,
    packages? : Array<string>;
}

interface PrefixListInterface
{
    [key: string]: string;
}

interface IconInterface
{
    prefix: string;
    name: string;
}

interface IconListInterface
{
    prefix: string;
    icons: Array<IconInterface>;
}

interface AvailableIconsInterface
{
    [key: string] : any;
}

interface FontAwesomeSupportedPackage
{
    prefix: string;
    packages: Array<string>;
    export: string;
}

interface FontAwesomePackage
{
    prefix: string;
    name: string;
    export: string;
}

const supportedPackages : Array<FontAwesomeSupportedPackage> = [
    {
        prefix: 'fa-brands',
        packages: [
            '@fortawesome/free-brands-svg-icons',
        ],
        export: 'fab',
    },
    // {
    //     prefix: 'fa-duotone',
    //     packages: [
    //         '@fortawesome/pro-duotone-svg-icons',
    //     ],
    //     export: 'fad',
    // },
    // {
    //     prefix: 'fa-light',
    //     packages: [
    //         '@fortawesome/pro-light-svg-icons',
    //     ],
    //     export: 'fal',
    // },
    // {
    //     prefix: 'fa-regular',
    //     packages: [
    //         '@fortawesome/pro-regular-svg-icons',
    //         '@fortawesome/free-regular-svg-icons',
    //     ],
    //     export: 'far',
    // },
    // {
    //     prefix: 'fa-solid',
    //     packages: [
    //         '@fortawesome/pro-solid-svg-icons',
    //         '@fortawesome/free-solid-svg-icons',
    //     ],
    //     export: 'fas',
    // },
    // {
    //     prefix: 'fa-thin',
    //     packages: [
    //         '@fortawesome/pro-thin-svg-icons',
    //     ],
    //     export: 'fat',
    // },
];

const availablePackages = collect(supportedPackages)
    .map((faPackage : FontAwesomeSupportedPackage) : FontAwesomePackage | null => {
        for (const packageName of faPackage.packages) {
            // console.log(packageName, packageName.replace(/(?!^@)@.+$/, ''));

            try {
                require.resolve(packageName);

                return {
                    prefix: faPackage.prefix,
                    name: packageName,
                    export: faPackage.export,
                }
            } catch (e) {
                // ignore error
                console.log(e);
            }
        }

        return null;
    });

console.log(availablePackages);

const availableIcons : AvailableIconsInterface = {
    //
};

console.log({
    availableIcons: Object.keys(availableIcons),
});

// const availableIcons = {
//     'fa-brands': require('@fortawesome/free-brands-svg-icons').fab,
//     'fa-duotone': require('@fortawesome/pro-duotone-svg-icons').fad,
//     'fa-light': require('@fortawesome/pro-light-svg-icons').fal,
//     'fa-regular': require('@fortawesome/pro-regular-svg-icons').far,
//     'fa-solid': require('@fortawesome/pro-solid-svg-icons').fas,
//     'fa-thin': require('@fortawesome/pro-thin-svg-icons').fat,
// };

// https://laravel.com/docs/8.x/helpers#method-tap
const tap = function (value : any, callback : any) : any {
    callback(value);

    return value;
};

class FontAwesomeAutoloadPlugin
{
    // https://blog.fontawesome.com/first-v6-alpha/
    private prefixes : PrefixListInterface = {
        "fab": "fa-brands",
        "fad": "fa-duotone",
        "fal": "fa-light",
        "far": "fa-regular",
        "fas": "fa-solid",
        "fat": "fa-thin",
    };

    private eventNames : Array<string> = [
        'run',
        'watch-run',
    ];

    private paths : Array<string>;
    private outputPath : string;
    private include : Array<string>;
    private extractor : Function;
    private mode : string | null;

    constructor(options : OptionsInterface)
    {
        validate(schema, options, {
            name: this.constructor.name,
            baseDataPath: 'options',
        });

        this.extractor = options.extractor || function (contents : string, defaultExtractor : Function) : Array<object> {
            return defaultExtractor(contents);
        };
        this.paths = options.paths;
        this.outputPath = options.outputPath ?? (function (filename : string) : string {
            const directory = findCacheDir({
                name: 'fontawesome-autoload',
                create: true,
            });

            // 'node_modules/.cache/fontawesome-autoload/autoload.js'
            return path.resolve(directory, filename);
        })('autoload.js');
        // path.resolve(__dirname, 'node_modules/.cache/fontawesome.js');

        console.log(this.outputPath);

        this.include = options.include || [];

        this.mode = options.mode || null;

        this.validateInclude();
    }

    /**
     * @internal
     */
    validateInclude()
    {
        const prefixes = Object.values(this.prefixes);
        const regex = new RegExp(`^(${prefixes.join('|')}) fa-[0-9a-z]+(-[0-9a-z]+)*$`);

        for (const include of this.include) {
            if (! regex.test(include)) {
                throw `Invalid include "${include}", must be in lowercase and formatted as "fa-prefix fa-icon-name"`;
            }
        }
    }

    apply(compiler : typeof Compiler)
    {
        this.eventNames.forEach((eventName : string) : void => {
            compiler.hooks[this.toCamelCase(eventName)].tapAsync(this.constructor.name, (compiler : typeof Compiler, next : Function) : void => {
                const mode = this.mode ?? compiler.options.mode;

                const defaultExtractor = this.getDefaultExtractor();

                const icons = mode !== 'production'
                    ? [] // don't extract icons in production, autoload will instead contain all available icons
                    : (collect(this.paths) as typeof Collection)
                        .flatMap((path : string) : string => glob.sync(path)) // find all files in this.paths
                        .flatMap((file : string) => { // find all icons, callback invoked one time per file
                            const contents = fs.readFileSync(file, 'utf8');

                            return tap(this.extractor(contents, defaultExtractor), (result : Array<object>) : void => {
                                if (! Array.isArray(result)) {
                                    throw TypeError("The extractor must return an array");
                                }
                            });
                        }, [])
                        .merge(collect(this.include)
                            .map((include : string) : IconInterface => { // add any icons that have been manually specied via the "include" option
                                const regex = new RegExp(/^(?<prefix>fa-\S+) (?<name>fa-.+)$/);

                                // https://github.com/microsoft/TypeScript/issues/30921
                                type AdjustedRegex = RegExpExecArray & {
                                    groups: IconInterface;
                                };

                                const match = regex.exec(include) as AdjustedRegex;

                                return {
                                    prefix: (match.groups as IconInterface).prefix,
                                    name: (match.groups as IconInterface).name,
                                };
                            })
                            .all() as Array<IconInterface>
                        )
                        .filter((icon : IconInterface) : boolean => { // remove any false positives
                            const prefix = this.prefixes[icon.prefix] || icon.prefix;

                            if (! availableIcons[prefix]) {
                                return false; // invalid prefix
                            }

                            if (! availableIcons[prefix][this.toCamelCase(icon.name)]) {
                                return false; // invalid icon
                            }

                            return true;
                        })
                        .map((icon : IconInterface) : IconInterface => {
                            icon.prefix = this.prefixes[icon.prefix] || icon.prefix;

                            return icon;
                        })
                        .unique((icon : IconInterface) : string => `${icon.prefix} ${icon.name}`)
                        .groupBy('prefix')
                        .map((icons : typeof Collection, prefix : string) : IconListInterface => {
                            return {
                                prefix: prefix,
                                icons: icons.map((icon : IconInterface) : string => icon.name).all(),
                            };
                        })
                        .values()
                        .all() as Array<IconListInterface>;

                console.log(icons);

                const output = this.generateOutput(mode, icons);

                fs.mkdirSync(path.dirname(this.outputPath), {
                    recursive: true,
                })

                fs.writeFileSync(this.outputPath, output);

                // next();
            });
        });
    }

    generateOutput(mode : string, icons : Array<IconListInterface>) : string
    {
        const shouldImportAll = mode !== 'production' && icons.length === 0;

        const getImportAlias = (prefix : string, name : string) : string => {
            return this.toCamelCase(name) + '_' + prefix.substr(3);
        }

        const packages = {
            "fa-brands": "@fortawesome/free-brands-svg-icons",
            "fa-duotone": "@fortawesome/pro-duotone-svg-icons",
            "fa-light": "@fortawesome/pro-light-svg-icons",
            "fa-regular": "@fortawesome/pro-regular-svg-icons",
            "fa-solid": "@fortawesome/pro-solid-svg-icons",
            "fa-thin": "@fortawesome/pro-thin-svg-icons",
        };

        const importStatements = shouldImportAll
            ? Object.keys(this.prefixes).map((prefix) => {
                // @ts-ignore
                return `import { ${prefix} } from '${packages[this.prefixes[prefix]]}';`;
            })
            : icons.map((style) => {
                return style.icons.map((icon) => {
                    // @ts-ignore
                    const iconName = this.toCamelCase(icon);
                    // @ts-ignore
                    const importExpression = iconName + ' as ' + getImportAlias(style.prefix, icon);
                    // @ts-ignore
                    const packageName = packages[style.prefix];

                    return `import { ${importExpression} } from '${packageName}/${iconName}';`;
                });
                // @ts-ignore
            }).flat();

        const importedAliases = shouldImportAll
            ? Object.keys(this.prefixes).map((prefix) => {
                return `...Object.values(${prefix})`;
            })
            : icons.map((style) => {
                const aliases = style.icons.map((icon) => {
                    // @ts-ignore
                    return getImportAlias(style.prefix, icon);
                });

            return aliases;
            // @ts-ignore
        }).flat();

        return `'use strict'

//
// This file is autogenerated. Do not modify.
//

${importStatements.join(os.EOL)}

const prefixes = ${JSON.stringify(this.prefixes, null, 4)};

const icons = [
    ${importedAliases.join(', ')}
].map((icon) => {
    icon.prefix = prefixes[icon.prefix] || icon.prefix;

    return icon;
});

export default icons;
`;
    }

    getDefaultExtractor()
    {
        // Extracts all font awesome icons used, each icon must be a object containing prefix and icon name
        return function (contents : string) : Array<any> {
            const regex = new RegExp(/class="(?<classList>[^"]*fa-[^"\s]*[^"]*)"/g);

            const matches = [];
            let match;

            while ((match = regex.exec(contents)) !== null) {
                matches.push(match);
            }

            const icons = matches.reduce((accumulator : Array<IconInterface>, match : any) => {
                const classList = match.groups.classList;

                const prefixMatch = classList.match(/(?<=^|\s)(?<prefix>fa[bdlrst]|fa-(?:brands|duotone|light|regular|solid|thin))(?=\s|$)/);

                if (! prefixMatch) {
                    return accumulator;
                }

                const prefix = prefixMatch.groups.prefix;

                const classNames = classList.replace(new RegExp(`(^|\\s+)${prefix}\\s+`), '').split(/\s+/);

                return [
                    ...accumulator,
                    ...classNames.map((icon : string) : IconInterface => {
                        return {
                            prefix: prefix,
                            name: icon,
                        };
                    }),
                ];
            }, []);

            return icons;
        };
    }

    /**
     * @internal
     */
    toCamelCase(string : string) : string
    {
        return string.replace(/-([a-z])/g, (match, letter) => {
            return letter.toUpperCase();
        });
    }
}

module.exports = FontAwesomeAutoloadPlugin;
module.exports.default = FontAwesomeAutoloadPlugin;

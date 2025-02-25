"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_api_1 = require("../plugin-api");
const declare_1 = require("../declare");
const path_1 = __importStar(require("path"));
const fs_1 = __importStar(require("fs"));
const mini_css_extract_plugin_1 = __importDefault(require("mini-css-extract-plugin"));
const panel_1 = __importDefault(require("../panel"));
const npm_install_1 = __importDefault(require("../plugin/npm-install"));
const package_json_1 = __importDefault(require("../commands/package.json"));
const vue_loader_1 = require("vue-loader");
const require_v3_1 = __importDefault(require("../plugin/require-v3"));
const webpack_1 = __importDefault(require("webpack"));
const log_1 = require("../log");
const FsExtra = __importStar(require("fs-extra"));
class Base extends plugin_api_1.PluginApi {
    getExternal(dir, defaultModules = []) {
        let map = {};
        defaultModules.forEach(module => {
            map[module] = '';
        });
        // const nodeModules = Fs.readdirSync(Path.join(dir, 'node_modules'));
        // nodeModules.forEach((module) => {
        //     map[module] = '';
        // })
        const packageFile = path_1.default.join(dir, './package.json');
        if (fs_1.default.existsSync(packageFile)) {
            try {
                const { dependencies } = FsExtra.readJSONSync(packageFile);
                for (let key in dependencies) {
                    map[key] = '';
                }
            }
            catch (e) {
                console.log(e);
            }
        }
        for (let key in map) {
            map[key] = `commonjs ${key}`;
        }
        ['vue-loader'].forEach(item => {
            delete map[item];
        });
        return map;
    }
    webpackEntry(service, webpackChain, entryName, file, prepend) {
        const fileFsPath = path_1.default.resolve(service.context, file);
        if (!fs_1.default.existsSync(fileFsPath)) {
            log_1.log.red(`main file not exists: ${fileFsPath}`);
            process.exit(0);
        }
        let entryPoint = webpackChain.entry(entryName).add(fileFsPath);
        if (prepend) {
            entryPoint.prepend(prepend);
        }
    }
    apply(api, service) {
        const { options, manifest } = service.projectConfig;
        api.chainWebpack((webpackChain) => {
            const { version } = options;
            const pluginName = manifest.name;
            const isV3 = version === declare_1.PluginVersion.v3;
            const isV2 = version === declare_1.PluginVersion.v2;
            webpackChain.target('node');
            const vuePath = path_1.default.resolve(service.root, './node_modules/vue');
            // webpackChain.resolve.alias.set('vue', vuePath).end();
            webpackChain.resolve.extensions.add('.ts').add('.vue').add('.js').add('.json');
            // 排除模块
            let externals = this.getExternal(service.context, ['electron', 'fs-extra', 'express']);
            webpackChain.externals(externals);
            // i18n
            const { i18n_zh, i18n_en } = manifest;
            i18n_zh && this.webpackEntry(service, webpackChain, 'i18n/zh', i18n_zh);
            i18n_en && this.webpackEntry(service, webpackChain, 'i18n/en', i18n_en);
            // builder&hooks
            if (isV3) {
                const builderEntry = 'builder';
                const builderFile = path_1.default.resolve(service.root, 'src/ccp/builder/builder.ts');
                this.webpackEntry(service, webpackChain, builderEntry, builderFile);
                const hooksEntry = 'hooks';
                const hooksFile = path_1.default.resolve(service.root, 'src/ccp/builder/hooks.ts');
                this.webpackEntry(service, webpackChain, hooksEntry, hooksFile);
            }
            // 主进程代码
            let mainFile = '';
            if (isV2) {
                mainFile = '/src/ccp/main-v2.ts';
            }
            else if (isV3) {
                mainFile = '/src/ccp/main-v3.ts';
            }
            const mainAdaptation = path_1.default.join(service.root, mainFile);
            // 注意先后顺序
            webpackChain.entry('main')
                .add(manifest.main)
                .add(mainAdaptation);
            // out
            let output = options.output;
            let resolvePath = path_1.default.resolve(service.context, output);
            if (fs_1.existsSync(resolvePath)) {
                // 处理相对路径
                output = resolvePath;
            }
            // const publicPath = version === PluginVersion.v2 ? `packages://${pluginName}/` : '';
            webpackChain.output.path(output)
                .libraryTarget('commonjs')
                // .libraryExport('default') // 这里暂时不能使用这个
                .publicPath(`packages://${pluginName}/`);
            // rules
            webpackChain.module
                .rule('less')
                .test(/\.less$/)
                .use('extract').loader(mini_css_extract_plugin_1.default.loader).end()
                .use('css-loader').loader('css-loader').end()
                .use('less-loader').loader('less-loader').end();
            // .use('postcss-loader').loader('postcss-loader').end();
            webpackChain.module
                .rule('css')
                .test(/\.css$/)
                .use('extract').loader(mini_css_extract_plugin_1.default.loader).end()
                .use('css-loader').loader('css-loader').end();
            // .use('postcss-loader').loader('postcss-loader').end();
            webpackChain.module
                .rule('vue')
                .test(/\.vue$/)
                .use('vue-loader')
                .loader('vue-loader')
                .options({
                isServerBuild: false,
                compilerOptions: {
                    isCustomElement(tag) {
                        return /^ui-/i.test(String(tag));
                    },
                }
            }).end();
            const packageSource = path_1.resolve(service.root, 'src');
            webpackChain.module
                .rule('ts')
                .test(/\.ts(x?)$/)
                .include.add(packageSource).add(service.context).end()
                // .exclude.add(/node_modules/).end()
                .use('ts-loader')
                .loader('ts-loader')
                .options({
                onlyCompileBundledFiles: true,
                appendTsSuffixTo: ['\\.vue$'],
                transpileOnly: true,
                allowTsInNodeModules: true,
                // happyPackMode: true,
                compilerOptions: {
                    target: "es6",
                    module: "es6",
                    strict: false,
                    // jsx: "preserve",
                    // importHelpers: true,
                    moduleResolution: "node",
                    skipLibCheck: true,
                    esModuleInterop: true,
                    allowSyntheticDefaultImports: true,
                    // noImplicitAny: false,
                    // noImplicitThis: false,
                    lib: ['es6', 'dom'],
                }
            });
            // webpackChain.module
            //     .rule('image')
            //     .test(/\.(png|jpe?g|gif|svg)$/)
            //     .use('url-loader')
            //     .loader('url-loader')
            //     .options({
            //         name:'images/[name].[ext]'
            //     })
            webpackChain.module
                .rule('font')
                .test(/\.(ttf|woff2|woff|otf|eot)$/)
                // @ts-ignore
                .type('asset/inline');
            // .use('url-loader')
            // .loader('url-loader')
            // .options({
            //     esModule: false,
            //     fallback: {
            //         loader: 'file-loader',
            //         options: {
            //             name: 'fonts/[name].[ext]'
            //         }
            //     }
            // })
            // 处理面板
            const panel = new panel_1.default(service, webpackChain);
            panel.dealPanels();
            // plugins
            webpackChain.plugin('npm install')
                .use(npm_install_1.default, [options.output]);
            webpackChain.plugin('cc-plugin-package.json')
                .use(package_json_1.default, [service]);
            webpackChain
                .plugin('vue')
                .use(vue_loader_1.VueLoaderPlugin)
                .end();
            webpackChain.plugin('extract-css')
                .use(mini_css_extract_plugin_1.default, [{
                    filename: '[name].css',
                    chunkFilename: '[id].css'
                }]).end();
            if (isV3) {
                webpackChain.plugin('require-v3')
                    .use(require_v3_1.default)
                    .end();
            }
            webpackChain
                .plugin('vue_env')
                .use(webpack_1.default.DefinePlugin, [{
                    __VUE_OPTIONS_API__: true,
                    __VUE_PROD_DEVTOOLS__: false
                }]);
        });
    }
}
exports.default = Base;

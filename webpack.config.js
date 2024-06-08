const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { htmlWebpackPluginTemplateCustomizer } = require("template-ejs-loader");
const CopyPlugin = require("copy-webpack-plugin");
const WebpackAssetsManifest = require("webpack-assets-manifest");
const fs = require("fs");

const outputPath = "dist";

class BuildHashLogger {
    apply(compiler) {
        compiler.hooks.done.tap("Hash Logger", (stats) => {
            const data = stats.compilation.fullHash;
            console.log(data);
            fs.writeFileSync(outputPath + "/build-hash", data);
        })
    }
}
const materialIconLink = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />`;
class Page {
    constructor (dir, ejsData={}, name=undefined, outputPath=undefined) {
        ejsData.fontLink = materialIconLink;
        console.log("template path:", "./" + path.join(dir, "index.html"))
        console.log(name, ejsData)
        this.name = name ? name : path.basename(dir);
        this.scripts = {};
        this.scripts[this.name] = "./" + path.join(dir, "index.ts");
        this.outputPath = outputPath ? outputPath : path.basename(dir) + ".html";
        console.log("scripts:", this.scripts);
        const chunks = Object.keys(this.scripts);
        console.log("chunks:", chunks);
        this.htmlPlugin = new HtmlWebpackPlugin({
            template: htmlWebpackPluginTemplateCustomizer({
                templatePath: path.basename(path.join(dir, "..")) == "journals" ? "./src/templates/journal-template.html" : "./" + path.join(dir, "index.template.html"),
                templateEjsLoaderOption: {
                    data: ejsData
                }
            }),
            filename: this.outputPath,
            chunks: chunks,
            favicon: "./src/images/oceanic-quill.svg"
        });
    }
}
class Journal extends Page {
    constructor (dir) {
        const configFile = fs.readFileSync(path.join(dir, "config.json"));
        const config = JSON.parse(configFile.toString());
        const ejsData = {
            journalName: config.name,
        };
        const outputPath = path.join("journals", path.basename(dir) + ".html")
        super(dir, ejsData, config.name + "-journal", outputPath);
        this.iconName = config["material-icon"];
    }
}

let scripts = {};
let htmlPlugins = [];
let journalDirs = [];
let journals = [];
function mapPages() {
    const pageDirs = fs.readdirSync("src/pages").filter((folder) => folder !== "journals" && folder !== "callback");
    journalDirs = fs.readdirSync("./src/journals");
    
    // load pages
    journals = [];
    const pages = [];
    for (const journalDir of journalDirs) {
        const journal = new Journal(path.join("src", "journals", journalDir));
        journals.push(journal);
        pages.push(journal);
    }
    for (const pageDir of pageDirs) {
        let data = {};
        if (pageDir === "home") {
            data.journals = journals.map((journal) => ({ name: journal.name, iconName: journal.iconName }));
            console.log(data.journals);
        }
        const dir = path.join("src/pages", pageDir);
        const page = new Page(dir, data);
        pages.push(page);
    }

    [htmlPlugins, scripts] = pages.reduce((prev, page) => {
        prev[0].push(page.htmlPlugin); // HTML
        prev[1] = { ...prev[1], ...page.scripts }; // JS
        return prev
    }, [[],{}]);
    console.log(htmlPlugins.length, scripts);
}

mapPages();

module.exports = async () => { return {
    entry: scripts,
    output: {
        filename: "[name]-[contenthash].js",
        path: path.resolve(__dirname, outputPath)
    },
    optimization: {
        moduleIds: "deterministic"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                type: "asset/resource",
                generator: {
                    filename: "[name]-[contenthash][ext]"
                }
            },
            {
                test: /\.(svg|png)$/,
                type: "asset/resource",
                generator: {
                    filename: "[name]-[contenthash][ext]"
                }
            },
            {
                test: /\.webmanifest$/,
                use: "webpack-webmanifest-loader",
                type: "asset/resource",
                generator: {
                    filename: "[name]-[contenthash][ext]"
                }
            },
            {
                test: /\.html$/,
                use: [
                    { 
                        loader: "html-loader", 
                        options: {
                            sources: {
                                urlFilter: (attribute, value, resourcePath) => {
                                    if (/^~/.test(value)) {
                                        return true;
                                    }
                                    return false;
                                }
                            }
                        }
                    }
                ]
                
            }
        ]
    },
    resolve: {
        extensions: [".js", ".ts"],
        alias: {
            "css": path.resolve(__dirname, "src/css"),
            "images": path.resolve(__dirname, "src/images"),
            "@": path.resolve(__dirname, "src")
        }
    },
    plugins: htmlPlugins.concat([
        new webpack.DefinePlugin({
            JOURNALS: journals.map(journal => JSON.stringify(journal)),
            cloudConfig: await createCloudConfig()
        }),
        new CopyPlugin({
            patterns: [
                { from: "src/tinymce/js/tinymce", to: "tinymce" }
            ]
        })
    ]),
    mode: "development"
}};

async function createCloudConfig() {
    const cloudConfig = JSON.parse(fs.readFileSync("cloud_config.json").toString());
    const config = {
        ...cloudConfig
    }
    return JSON.stringify(config);
}
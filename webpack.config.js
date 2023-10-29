const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
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

const scripts = {};
const htmlPlugins = [];
function mapPages() {
    const pages = fs.readdirSync("src/pages").filter((folder) => folder !== "journals" && folder !== "callback");
    const journals = fs.readdirSync("./src/journals");

    // load scripts
    for (let page of pages) {
        scripts[page] = `./src/pages/${page}/index.ts`;
    }
    for (let journal of journals) {
        scripts[journal+"Journal"] = `./src/journals/${journal}/index.ts`;
    }

    // load HTML
    for (let page of pages) {
        const options = {
            template: `./src/pages/${page}/index.template.html`,
            filename: `${page}.html`,
            chunks: [page],
            favicon: "./src/images/oceanic-quill.svg"
        };
        htmlPlugins.push(new HtmlWebpackPlugin(options));
    }
    for (let journal of journals) {
        const plugin = new HtmlWebpackPlugin({
            template: `./src/journals/${journal}/index.template.html`,
            filename: `journals/${journal}.html`,
            chunks: [journal+"Journal"],
            favicon: "./src/images/oceanic-quill.svg"
        });
        htmlPlugins.push(plugin);
    }
}

mapPages();

module.exports = {
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
    plugins: htmlPlugins,
    mode: "development"
}
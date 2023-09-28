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

module.exports = {
    entry: {
        test: "./src/scripts/test.ts",
        home: "./src/scripts/home.ts",
        journal: "./src/scripts/journal.ts",
        pwa: "./src/scripts/pwa-loader.js",
        worker: "./src/scripts/service-worker.ts"
    },
    output: {
        filename: "[name]-[hash].js",
        path: path.resolve(__dirname, outputPath)
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
                use: ["sass-loader"],
                generator: {
                    filename: "[name]-[hash][ext]"
                }
            },
            {
                test: /\.(svg|png)$/,
                type: "asset/resource",
                generator: {
                    filename: "[name]-[hash][ext]"
                }
            },
            {
                test: /\.webmanifest$/,
                use: "webpack-webmanifest-loader",
                type: "asset/resource",
                generator: {
                    filename: "[name]-[hash][ext]"
                }
            },
            {
                test: /\.html$/,
                use: ["html-loader"]
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
    plugins: [
        new HtmlWebpackPlugin({
            title: "Journal List",
            template: "src/html/home.template.html",
            filename: "home.html",
            chunks: ["home", "pwa"],
            favicon: "src/images/oceanic-quill.svg"
        }),
        new HtmlWebpackPlugin({
            template: "src/html/journals/messages.template.html",
            filename: "journals/messages.html",
            chunks: ["journal", "pwa"],
            favicon: "src/images/oceanic-quill.svg"
        }),
        new HtmlWebpackPlugin({
            templateContent: "",
            filename: "test.html",
            chunks: ["test", "pwa"]
        }),
        new WebpackAssetsManifest({
            output: "manifest.json"
        }),
        new BuildHashLogger()
    ],
    mode: "development"
}
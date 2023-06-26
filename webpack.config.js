const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: {
        test: "./src/scripts/test.ts",
        home: "./src/scripts/home.ts",
        journal: "./src/scripts/journal.ts",
        pwa: "./src/scripts/pwa-loader.js",
        worker: "./src/scripts/service-worker.ts"
    },
    output: {
        filename: (chunkData) => {
            if (chunkData.chunk.name === "worker") {
                return "[name].js"
            }
            return "[name].[contenthash].js"
        },
        path: path.resolve(__dirname, 'dist')
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
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(svg|png)$/,
                type: "asset/resource"
            },
            {
                test: /\.webmanifest$/,
                use: "webpack-webmanifest-loader",
                type: "asset/resource"
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
            chunks: ["home"],
            favicon: "src/images/oceanic-quill.svg"
        }),
        new HtmlWebpackPlugin({
            template: "src/html/journal.template.html",
            filename: "journal.html",
            chunks: ["journal"],
            favicon: "src/images/oceanic-quill.svg"
        }),
        new HtmlWebpackPlugin({
            templateContent: "",
            filename: "test.html",
            chunks: ["test", "pwa"]
        })
    ],
    mode: "development"
}
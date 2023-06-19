var path = require('path');

module.exports = {
    entry: {
        test: "./src/test.ts",
        home: "./src/home.js",
        journal: "./src/journal.js"
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, 'js')
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".js", ".ts"]
    },
    mode: "development"
}
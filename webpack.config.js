var path = require('path');

module.exports = {
    entry: {
        test: "./src/test.js",
        home: "./src/home.js",
        journal: "./src/journal.js"
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, 'js')
    },
    mode: "development"
}
var path = require('path');

module.exports = {
    entry: {
        test: "./test.js",
        home: "./home.js",
        journal: "./journal.js"
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, 'js')
    },
    mode: "development"
}
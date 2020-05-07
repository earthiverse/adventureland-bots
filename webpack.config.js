/*global module */
const Dotenv = require('dotenv-webpack')
const Path = require("path")

module.exports = {
    plugins: [
        new Dotenv()
    ],
    entry: {
        mage: "./source/mage.ts",
        merchant: "./source/merchant.ts",
        priest: "./source/priest.ts",
        ranger: "./source/ranger.ts",
        rogue: "./source/rogue.ts",
        warrior: "./source/warrior.ts"
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
        }, ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "[name].js",
        path: Path.resolve(__dirname, "build"),
        library: "bots",
        libraryTarget: "window"
    }
}
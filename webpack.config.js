var path = require('path');

const config = {
    entry: './organization-chart-render.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'webpack-bundle.js'
    },
    module: {
        rules: [
            { test: /\.json$/, use: "json-loader" },
            {
                test: /\.css$/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader'/*, options: {modules: true}*/}
                ]
            }
        ]
    }
}

module.exports = config;

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { type } = require('os');

module.exports = {
    mode: 'development',
    // devtool: 'source-map', // 启用 Source Maps
    entry: './src/index.js', // 主入口文件路径
    output: {
        filename: 'bundle.js', // 输出文件名
        path: path.resolve(__dirname, 'dist'), // 输出目录
        clean: true, // 清理旧文件
    },
    module: {
        rules: [
            {
                test: /\.css$/, // 处理 CSS 文件
                use: ['style-loader', 'css-loader', 'postcss-loader'], // 依次处理样式
            },
            {
                test: /\.worker\.js$/, // 处理 Worker 文件
                use: { loader: 'worker-loader' },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html', // 模板 HTML 文件路径
        }),
    ],
    devServer: {
        static: './dist', // 指定静态资源目录
        port: 8080, // 开发服务器端口
        open: true, // 自动打开浏览器
        hot: true
    },
};
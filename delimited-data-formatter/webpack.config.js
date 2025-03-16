const path = require('path');
const fs = require('fs');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const CSS_FILE_NAME = process.env.npm_package_dsccViz_cssFile;
const cssFilePath = CSS_FILE_NAME ? path.join('src', CSS_FILE_NAME) : null;

const plugins = [];

let body = '<script src="main.js"></script>';
if (CSS_FILE_NAME && fs.existsSync(cssFilePath)) {
  body = body + '\n<link rel="stylesheet" href="index.css">';
  plugins.push(new CopyWebpackPlugin([{from: cssFilePath, to: '.'}]));
}
const iframeHTML = `
<!doctype html>
<html><body>
${body}
</body></html>
`;

if (!fs.existsSync(path.resolve(__dirname, 'dist'))) {
  fs.mkdirSync(path.resolve(__dirname, 'dist'), { recursive: true });
}

fs.writeFileSync(path.resolve(__dirname, 'dist', 'vizframe.html'), iframeHTML);

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, 'src', 'index.js'),
  devServer: {
    contentBase: './dist',
  },
  output: {
    filename: 'main.js',
    path: path.join(__dirname, 'dist'),
  },
  plugins: plugins,
};

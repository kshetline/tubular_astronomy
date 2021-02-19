const { resolve } = require('path');

module.exports = env => {
  const esVersion = env?.esver === '5' ? 'es5' : 'es6';
  const dir = env?.esver === '5' ? 'web5' : 'web';
  const chromeVersion = env?.esver === '5' ? '23' : '51';

  const config = {
    mode: env?.dev ? 'development' : 'production',
    target: [esVersion, 'web'],
    entry: './dist/index.js',
    output: {
      path: resolve(__dirname, 'dist/' + dir),
      filename: 'index.js',
      libraryTarget: 'umd',
      library: 'tbAstro'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: { presets: [['@babel/preset-env', { targets: { chrome: chromeVersion } }]] }
          },
          resolve: { fullySpecified: false }
        }
      ]
    },
    externals: ['@tubular/time'],
    devtool: 'source-map',
    resolve: {
      mainFields: ['es2015', 'browser', 'module', 'main', 'main-es5']
    }
  };

  // Allow UMD target to bundle @tubular/array-buffer-reader, @tubular/math, and @tubular/util.
  if (env?.target !== 'umd')
    config.externals.push(...['@tubular/array-buffer-reader', '@tubular/math', '@tubular/util']);

  return config;
};

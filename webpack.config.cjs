const { resolve } = require('path');

module.exports = env => {
  const config = {
    mode: env?.dev ? 'development' : 'production',
    target: ['web', 'es5'],
    entry: './dist/index.js',
    output: {
      path: resolve(__dirname, 'dist/web'),
      filename: 'index..js',
      libraryTarget: 'umd',
      library: 'tbAstro'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: { presets: ['@babel/preset-env'] }
          },
          resolve: { fullySpecified: false }
        }
      ]
    },
    externals: ['@tubular/time'],
    resolve: {
      mainFields: ['esm2015', 'es2015', 'module', 'main', 'browser']
    }
  };

  // Allow UMD target to bundle @tubular/array-buffer-reader, @tubular/math, and @tubular/util.
  if (env?.target !== 'umd')
    config.externals.push(...['@tubular/array-buffer-reader', '@tubular/math', '@tubular/util']);

  return config;
};

const { resolve } = require('path');

module.exports = env => {
  const target = env?.target === 'umd' ? 'es5' : 'es2015';
  const libraryTarget = env?.target === 'umd' ? 'umd' : 'commonjs';
  const library = env?.target === 'umd' ? 'tbAstro' : undefined;

  const config = {
    mode: env?.dev ? 'development' : 'production',
    target,
    entry: './dist/index.js',
    output: {
      path: resolve(__dirname, 'dist'),
      filename: `index.${env?.target || 'cjs'}.js`,
      libraryTarget,
      library
    },
    module: {
      rules: [
        { test: /\.js$/, use: 'babel-loader', resolve: { fullySpecified: false } }
      ]
    },
    externals: ['@tubular/time', 'lodash']
  };

  // Allow UMD target to bundle @tubular/array-buffer-reader, @tubular/math, and @tubular/util.
  if (env?.target !== 'umd')
    config.externals.push(...['@tubular/array-buffer-reader', '@tubular/math', '@tubular/util']);

  return config;
};

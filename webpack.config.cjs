const TerserPlugin = require('terser-webpack-plugin');
const { resolve } = require('path');

module.exports = env => {
  const umd = !!env?.umd && (/^[ty]/i.test(env?.umd) || Number(env?.umd) !== 0);
  const cjs = !umd && !!env?.cjs && (/^[ty]/i.test(env?.cjs) || Number(env?.cjs) !== 0);
  const esVersion = umd ? 'es6' : 'es2018';
  const dir = umd ? 'web' : (cjs ? 'cjs' : 'fesm2015');
  const libraryTarget = umd ? 'umd' : (cjs ? 'commonjs' : 'module');
  const asModule = !umd && !cjs;
  const outFile = `index.${asModule ? 'm' : ''}js`;

  const config = {
    mode: env?.dev ? 'development' : 'production',
    target: [esVersion, 'web'],
    entry: './dist/index.js',
    experiments: {
      outputModule: asModule
    },
    output: {
      path: resolve(__dirname, 'dist/' + dir),
      filename: outFile,
      libraryTarget,
      library: umd ? 'tbAstro' : undefined
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [['@babel/preset-env', {
                targets: { // min ES6 : min ES2018
                  chrome:  umd ? '58' : '64',
                  edge:    umd ? '14' : '79',
                  firefox: umd ? '54' : '78',
                  opera:   umd ? '55' : '51',
                  safari:  umd ? '10' : '12',
                }
              }]]
            }
          },
          resolve: { fullySpecified: false }
        }
      ]
    },
    externals: ['@tubular/time'],
    externalsType: "commonjs",
    optimization: {
      minimize: !env?.dev,
      minimizer: [new TerserPlugin({
        terserOptions: {
          output: { max_line_len: 511 }
        }
      })],
    },
    devtool: 'source-map',
    resolve: {
      mainFields: ['fesm2015', 'module', 'main']
    }
  };

  // Allow UMD target to bundle @tubular/array-buffer-reader, @tubular/math, and @tubular/util.
  if (!umd)
    config.externals.push(...['@tubular/array-buffer-reader', '@tubular/math', '@tubular/util']);

  return config;
};

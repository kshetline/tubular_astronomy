const nodeResolve = require('@rollup/plugin-node-resolve');
const sourcemaps = require('rollup-plugin-sourcemaps');
const terser = require('@rollup/plugin-terser');
const typescript = require('@rollup/plugin-typescript');
const pkg = require('./package.json');

const plugins = [
  nodeResolve(),
  typescript({ inlineSources: true }),
  sourcemaps(),
  terser({ format: { max_line_len: 511 }, sourceMap: { includeSources: true } })
];

// noinspection CommaExpressionJS
module.exports = [
  {
    input: 'src/index.ts',
    output: {
      file: pkg.browser,
      sourcemap: true,
      format: 'umd',
      name: 'tbAstro',
      globals: {
        '@tubular/array-buffer-reader': 'tbABR',
        '@tubular/math': 'tbMath',
        '@tubular/util': 'tbUtil',
        '@tubular/time': 'tbTime'
      }
    },
    plugins
  },
  {
    external: ['by-request', 'json-z', '@tubular/math', '@tubular/util'],
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        sourcemap: true,
        format: 'cjs'
      },
      {
        file: pkg.module,
        sourcemap: true,
        format: 'esm'
      }
    ],
    plugins: (plugins.slice(0).splice(0, 1), plugins)
  }
];

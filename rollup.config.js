import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/occupancy-card.js',
  output: {
    dir: 'dist',
    format: 'es',
  },
  plugins: [nodeResolve()],
};

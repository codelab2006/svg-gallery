import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "bundler.js",
  output: {
    file: "media/bundle.js",
    format: "iife",
  },
  plugins: [resolve(), commonjs()],
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Required by react-native-reanimated 4 (and moti, which uses it). Must be last.
    plugins: ["react-native-worklets/plugin"],
  };
};

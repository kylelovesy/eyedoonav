module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // 👈 required for Reanimated
      [
        'module-resolver',
        {
          alias: {
            '@': './src', // 👈 path alias support
          },
        },
      ],
    ],
  };
};

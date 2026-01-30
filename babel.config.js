module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@types': './src/types',
            '@services': './src/services',
            '@screens': './src/screens',
            '@config': './src/config',
            '@components': './src/components',
          },
        },
      ],
      // Required for react-native-vision-camera frame processors
      'react-native-worklets-core/plugin',
    ],
  };
};

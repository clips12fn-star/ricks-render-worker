import { Config } from "@remotion/cli/config";

Config.overrideWebpackConfig((currentConfiguration) => ({
  ...currentConfiguration,
  resolve: {
    ...currentConfiguration.resolve,
    fullySpecified: false,
  },
}));

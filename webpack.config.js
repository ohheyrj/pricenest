const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;

  return {
    // Entry point - main application file
    entry: './src/static/js/app.js',
    
    // Output configuration
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/bundle.[contenthash].js' : 'js/bundle.js',
      clean: true, // Clean the output directory before emit
    },
    
    // Module resolution
    resolve: {
      extensions: ['.js'],
      alias: {
        '@components': path.resolve(__dirname, 'src/static/js/components'),
        '@services': path.resolve(__dirname, 'src/static/js/services'),
        '@': path.resolve(__dirname, 'src/static/js'),
      }
    },
    
    // Development server configuration
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 8080,
      hot: true,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },
    
    // Source maps for debugging
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    
    // Module rules
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name][ext]'
          }
        },
      ],
    },
    
    // Plugins
    plugins: [
      // Generate HTML file with injected script tags
      new HtmlWebpackPlugin({
        template: './src/templates/index-webpack.html',
        filename: 'index.html',
        inject: 'body',
        scriptLoading: 'defer',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true,
        } : false,
      }),
      
      // Copy static assets
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: 'src/static/css/styles.css', 
            to: 'css/styles.css'
          },
          { 
            from: 'src/static/images', 
            to: 'images',
            noErrorOnMissing: true 
          },
        ],
      }),
    ],
    
    // Optimization
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
      // Disable chunk splitting for now to avoid conflicts
      splitChunks: isDevelopment ? false : {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
          },
          components: {
            test: /[\\/]components[\\/]/,
            name: 'components',
            priority: 5,
            filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
          },
          services: {
            test: /[\\/]services[\\/]/,
            name: 'services',
            priority: 5,
            filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
          },
        },
      },
    },
    
    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    
    // Statistics
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
    },
  };
};
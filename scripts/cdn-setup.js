#!/usr/bin/env node

/**
 * CDN Setup and Configuration Script
 * Helps configure CDN integration for the Zombie Car Game
 */

const fs = require('fs');
const path = require('path');

const CDN_PROVIDERS = {
  cloudflare: {
    name: 'Cloudflare',
    setup: setupCloudflare,
    domains: {
      assets: 'cdn.zombiecargame.com',
      api: 'api.zombiecargame.com'
    }
  },
  aws: {
    name: 'AWS CloudFront',
    setup: setupAWS,
    domains: {
      assets: 'd1234567890.cloudfront.net',
      api: 'api.zombiecargame.com'
    }
  },
  azure: {
    name: 'Azure CDN',
    setup: setupAzure,
    domains: {
      assets: 'zombiecargame.azureedge.net',
      api: 'api.zombiecargame.com'
    }
  }
};

function setupCloudflare(config) {
  console.log('Setting up Cloudflare CDN...');
  
  const nginxConfig = `
    # Cloudflare CDN Configuration
    location @cdn_fallback {
        proxy_pass https://${config.domains.assets}$uri;
        proxy_set_header Host ${config.domains.assets};
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_valid 200 1y;
        proxy_cache_valid 404 1m;
    }
  `;
  
  return {
    nginx: nginxConfig,
    env: {
      REACT_APP_CDN_URL: `https://${config.domains.assets}`,
      CDN_PROVIDER: 'cloudflare'
    }
  };
}

function setupAWS(config) {
  console.log('Setting up AWS CloudFront CDN...');
  
  const nginxConfig = `
    # AWS CloudFront CDN Configuration
    location @cdn_fallback {
        proxy_pass https://${config.domains.assets}$uri;
        proxy_set_header Host ${config.domains.assets};
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_valid 200 1y;
        proxy_cache_valid 404 1m;
        
        # AWS CloudFront specific headers
        proxy_set_header CloudFront-Viewer-Country $http_cloudfront_viewer_country;
    }
  `;
  
  return {
    nginx: nginxConfig,
    env: {
      REACT_APP_CDN_URL: `https://${config.domains.assets}`,
      CDN_PROVIDER: 'aws'
    }
  };
}

function setupAzure(config) {
  console.log('Setting up Azure CDN...');
  
  const nginxConfig = `
    # Azure CDN Configuration
    location @cdn_fallback {
        proxy_pass https://${config.domains.assets}$uri;
        proxy_set_header Host ${config.domains.assets};
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_valid 200 1y;
        proxy_cache_valid 404 1m;
    }
  `;
  
  return {
    nginx: nginxConfig,
    env: {
      REACT_APP_CDN_URL: `https://${config.domains.assets}`,
      CDN_PROVIDER: 'azure'
    }
  };
}

function generateWebpackCDNConfig(cdnUrl) {
  return `
// CDN Configuration for Webpack
const CDN_CONFIG = {
  publicPath: process.env.NODE_ENV === 'production' ? '${cdnUrl}/' : '/',
  
  // Asset optimization for CDN
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          enforce: true,
        },
      },
    },
  },
  
  // CDN-specific plugins
  plugins: [
    // Add CDN URL to asset paths
    new webpack.DefinePlugin({
      'process.env.CDN_URL': JSON.stringify('${cdnUrl}'),
    }),
  ],
};

module.exports = CDN_CONFIG;
`;
}

function createCDNUploadScript(provider) {
  return `#!/bin/bash

# CDN Upload Script for ${provider}
set -e

echo "Building production assets..."
npm run build

echo "Uploading assets to ${provider} CDN..."

case "${provider}" in
  "cloudflare")
    # Cloudflare R2 or Workers Sites upload
    echo "Uploading to Cloudflare..."
    # wrangler publish --env production
    ;;
  "aws")
    # AWS S3 + CloudFront upload
    echo "Uploading to AWS S3..."
    # aws s3 sync dist/ s3://zombie-car-game-assets --delete
    # aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
    ;;
  "azure")
    # Azure Blob Storage + CDN upload
    echo "Uploading to Azure..."
    # az storage blob upload-batch --destination assets --source dist/
    ;;
esac

echo "CDN upload complete!"
`;
}

function main() {
  const args = process.argv.slice(2);
  const provider = args[0] || 'cloudflare';
  
  if (!CDN_PROVIDERS[provider]) {
    console.error(`Unknown CDN provider: ${provider}`);
    console.error(`Available providers: ${Object.keys(CDN_PROVIDERS).join(', ')}`);
    process.exit(1);
  }
  
  const config = CDN_PROVIDERS[provider];
  const setup = config.setup(config);
  
  // Create CDN configuration files
  const configDir = path.join(__dirname, '..', 'cdn-config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Write nginx configuration
  fs.writeFileSync(
    path.join(configDir, `nginx-${provider}.conf`),
    setup.nginx
  );
  
  // Write environment variables
  fs.writeFileSync(
    path.join(configDir, `${provider}.env`),
    Object.entries(setup.env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
  );
  
  // Write webpack CDN configuration
  fs.writeFileSync(
    path.join(configDir, 'webpack.cdn.js'),
    generateWebpackCDNConfig(setup.env.REACT_APP_CDN_URL)
  );
  
  // Write upload script
  fs.writeFileSync(
    path.join(configDir, `upload-${provider}.sh`),
    createCDNUploadScript(provider)
  );
  
  // Make upload script executable
  fs.chmodSync(path.join(configDir, `upload-${provider}.sh`), 0o755);
  
  console.log(`CDN configuration for ${config.name} created in cdn-config/`);
  console.log('Files created:');
  console.log(`- nginx-${provider}.conf`);
  console.log(`- ${provider}.env`);
  console.log('- webpack.cdn.js');
  console.log(`- upload-${provider}.sh`);
  
  console.log('\nNext steps:');
  console.log('1. Configure your CDN provider account');
  console.log('2. Update domain names in the configuration files');
  console.log('3. Set up DNS records to point to your CDN');
  console.log('4. Run the upload script to deploy assets');
}

if (require.main === module) {
  main();
}

module.exports = { CDN_PROVIDERS, setupCloudflare, setupAWS, setupAzure };
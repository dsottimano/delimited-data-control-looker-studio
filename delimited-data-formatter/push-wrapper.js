#!/usr/bin/env node

const { spawn } = require('child_process');
const pkg = require('./package.json');
const fs = require('fs');
const path = require('path');

// Set environment variables based on package.json
process.env.npm_package_dsccViz_gcsDevBucket = pkg.dsccViz.gcsDevBucket;
process.env.npm_package_dsccViz_gcsProdBucket = pkg.dsccViz.gcsProdBucket;
process.env.npm_package_dsccViz_jsFile = pkg.dsccViz.jsFile;
process.env.npm_package_dsccViz_jsonFile = pkg.dsccViz.jsonFile;
process.env.npm_package_dsccViz_cssFile = pkg.dsccViz.cssFile;
process.env.npm_package_dsccViz_print = pkg.dsccViz.print;

// Set Node.js to use the legacy OpenSSL provider
process.env.NODE_OPTIONS = '--openssl-legacy-provider';

// Log the environment variables for debugging
console.log('Setting environment variables:');
console.log('npm_package_dsccViz_gcsDevBucket:', process.env.npm_package_dsccViz_gcsDevBucket);
console.log('npm_package_dsccViz_gcsProdBucket:', process.env.npm_package_dsccViz_gcsProdBucket);
console.log('npm_package_dsccViz_jsFile:', process.env.npm_package_dsccViz_jsFile);
console.log('npm_package_dsccViz_jsonFile:', process.env.npm_package_dsccViz_jsonFile);
console.log('npm_package_dsccViz_cssFile:', process.env.npm_package_dsccViz_cssFile);
console.log('npm_package_dsccViz_print:', process.env.npm_package_dsccViz_print);
console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS);

// Get command line arguments
const args = process.argv.slice(2);
const isDevPush = args.includes('-d') && args[args.indexOf('-d') + 1] === 'dev';
const isProdPush = args.includes('-d') && args[args.indexOf('-d') + 1] === 'prod';

console.log('Running push with args:', args);

// Check if dist directory exists and has files
const distDir = path.join(__dirname, 'dist');
console.log('Checking dist directory:', distDir);
if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);
  console.log('Files in dist directory:', files);
  
  // Check if main.js exists
  if (!files.includes('main.js')) {
    console.error('Error: main.js not found in dist directory. Please run the build command first.');
    process.exit(1);
  }
} else {
  console.error('Error: dist directory not found. Please run the build command first.');
  process.exit(1);
}

// Run the dscc-scripts command
const dsccProcess = spawn('node_modules/.bin/dscc-scripts', ['viz', 'push', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

dsccProcess.on('close', (code) => {
  console.log('Push process exited with code:', code);
  process.exit(code);
}); 
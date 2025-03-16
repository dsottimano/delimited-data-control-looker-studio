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

// Check if source files exist
const srcDir = path.join(__dirname, 'src');
console.log('Checking source files in:', srcDir);
if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  console.log('Source files:', files);
} else {
  console.error('Source directory does not exist:', srcDir);
}

// Get command line arguments
const args = process.argv.slice(2);
const isDevBuild = args.includes('-d') && args[args.indexOf('-d') + 1] === 'dev';
const isProdBuild = args.includes('-d') && args[args.indexOf('-d') + 1] === 'prod';

console.log('Running build with args:', args);

// Run the dscc-scripts command
const dsccProcess = spawn('node_modules/.bin/dscc-scripts', ['viz', 'build', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

dsccProcess.on('close', (code) => {
  console.log('Build process exited with code:', code);
  
  // Check build output
  const distDir = path.join(__dirname, 'dist');
  console.log('Checking build output in:', distDir);
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    console.log('Build output files:', files);
  } else {
    console.error('Dist directory does not exist:', distDir);
  }
  
  process.exit(code);
}); 
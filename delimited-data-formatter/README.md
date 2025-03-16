# Delimited Data Filter for Looker Studio

This is a custom visualization for Google Looker Studio that properly handles delimited values in filter controls.

## Problem Solved

In standard Looker Studio filter controls, when a field contains delimited values (e.g., "Chocolate,Strawberry"), the filter treats each unique string as a separate value. This results in filter options like:

- Chocolate,Strawberry - 1

This visualization solves this problem by splitting the delimited values and counting them individually, resulting in a more useful filter:

- Chocolate - 1
- Strawberry - 1

## Features

- Splits delimited values and counts them individually
- Configurable delimiter character (default is comma)
- Clean, user-friendly filter control interface

## Usage

1. Add this visualization to your Looker Studio report
2. Configure the data source:
   - Select a dimension field that contains delimited values

## Configuration Options

- **Delimiter Character**: The character used to separate values (default: comma)

## Development

### Prerequisites

- Node.js and npm/yarn
- Google Cloud Platform account with access to Looker Studio

### Local Development

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run custom:start
   ```

### Deployment

1. Build for production:
   ```
   npm run custom:build:prod
   ```
2. Push to production:
   ```
   npm run custom:push:prod
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## How It Works

The visualization processes the data as follows:

1. Receives data from Looker Studio with potentially delimited values
2. Splits each value using the configured delimiter
3. Counts occurrences of each individual value
4. Displays a filter control with the processed counts
5. When filter selections are made, applies filtering to the visualization

For example, with the data:
- "Chocolate,Strawberry" (count: 1)
- "Strawberry,Vanilla" (count: 1)

The filter control will show:
- Chocolate (1)
- Strawberry (2)
- Vanilla (1)

This provides a more accurate representation of the data for filtering purposes.

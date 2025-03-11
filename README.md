# IGRO Odisha Scraper

A utility package for scraping land valuation data from the Inspector General of Registration Odisha (IGRO) website.

## Overview

This scraper allows you to fetch and analyze land valuation data from the [IGRO Odisha website](https://igrodisha.gov.in/ViewFeeValue.aspx). It provides functionality to:

- Fetch registration offices for districts
- Fetch villages for registration offices
- Fetch plots for villages
- Get market rate values for plots

The scraper implements exponential backoff delays between requests to avoid overwhelming the server.

## Features

- **Hierarchical Data Scraping**: Navigate through districts, registration offices, villages, and plots
- **Random Sampling**: Fetch random samples of data from the hierarchy
- **Market Rate Values**: Get market rate values for plots with detailed breakdowns
- **Exponential Backoff**: Automatically increase delays between requests to avoid rate limiting
- **Structured Data**: All data is returned in well-structured TypeScript interfaces

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd scraper

# Install dependencies
npm install
```

## Usage

The package provides several example scripts to demonstrate its functionality:

### 1. IGRO Example

Demonstrates various scraping options:

```bash
npm run example:igro
```

This example allows you to:
- Fetch registration offices for a specific district
- Fetch registration offices for all districts
- Fetch villages for a registration office
- Fetch plots for a village
- Run the full scraper

### 2. Random Sample Example

Fetches a random sample of data from the hierarchy:

```bash
npm run example:random
```

This example:
- Randomly selects a district
- Fetches registration offices for the district
- Randomly selects a registration office
- Fetches villages for the registration office
- Randomly selects a village
- Fetches plots for the village

### 3. Market Rate Value Example

Fetches market rate values for random plots:

```bash
npm run example:mr-value
```

This example:
- Fetches a random sample of data
- Selects random plots from the sample
- Makes requests to the GetMRVal endpoint for each plot
- Displays the market rate values with detailed breakdowns

## API Reference

### Core Functions

#### `initializeSession()`

Initializes a session with the IGRO website and fetches available districts.

#### `fetchRegistrationOffices(sessionData, districtId)`

Fetches registration offices for a specific district.

#### `fetchVillages(sessionData, registrationOfficeId)`

Fetches villages for a specific registration office.

#### `fetchPlots(sessionData, villageId)`

Fetches plots for a specific village.

#### `fetchMRValue(payload)`

Fetches the market rate value for a plot with the specified parameters.

### Utility Functions

#### `fetchRandomSample(initialDelayMs)`

Fetches a random sample of data from the hierarchy.

#### `fetchMRValueOfRandomPlots(initialDelayMs, numPlots)`

Fetches market rate values for random plots.

## Data Structures

The scraper uses the following main data structures:

- `State`: Represents a state with districts
- `District`: Represents a district with registration offices
- `RegistrationOffice`: Represents a registration office with villages
- `Village`: Represents a village with plots
- `Plot`: Represents a land plot with details
- `MRValueResponse`: Represents a parsed market rate value response

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
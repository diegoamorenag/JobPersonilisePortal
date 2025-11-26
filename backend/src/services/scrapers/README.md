# Job Portal Scraper System

A complete, inheritance-based web scraping system for extracting job listings from various job portals.

## Overview

This scraper system uses **object-oriented inheritance** to provide a reusable base class (`JobPortalScraper`) that can be extended to create site-specific scrapers.

## Architecture

```
JobPortalScraper (Base Class)
├── OficinaDeTrabajoCeiScraper
├── LinkedInJobsScraper
└── [Your Custom Scraper]
```

## File Structure

```
backend/src/
├── services/
│   ├── scrapers/
│   │   ├── JobPortalScraper.js         # Base scraper class
│   │   ├── OficinaDeTrabajoCeiScraper.js
│   │   ├── LinkedInJobsScraper.js
│   │   ├── scraperRegistry.js          # Scraper management
│   │   └── index.js                    # Module exports
│   ├── scraperService.js               # High-level service
│   └── jobFetcher.js                   # Legacy fetcher
├── controllers/
│   └── scraperController.js            # API controllers
├── routes/
│   └── scraper.routes.js               # API routes
└── __tests__/
    └── scrapers/                       # Tests
```

## Base Class: JobPortalScraper

The base class provides common functionality for all scrapers:

### Core Methods

- **`scrape(options)`** - Abstract method (must be implemented by child classes)
- **`fetchPage(url)`** - Fetch HTML content with retry logic
- **`parseHTML(html)`** - Parse HTML using Cheerio
- **`fetchAndParse(url)`** - Fetch and parse in one step
- **`saveJobs(jobs)`** - Save jobs to database with deduplication
- **`cleanJobData(job)`** - Normalize and clean job data
- **`validateJobData(job)`** - Validate required fields

### Helper Methods

- **`extractText($, selector, context)`** - Safely extract text
- **`extractAttribute($, selector, attribute, context)`** - Extract HTML attributes
- **`cleanText(text)`** - Remove extra whitespace
- **`generateExternalId(job)`** - Create unique job IDs
- **`delay(ms)`** - Delay between requests
- **`getStats()`** - Get scraping statistics
- **`reset()`** - Reset scraper state

## Creating a Custom Scraper

### Step 1: Extend the Base Class

```javascript
const JobPortalScraper = require('./JobPortalScraper');

class YourCustomScraper extends JobPortalScraper {
  constructor(config = {}) {
    super({
      baseUrl: 'https://yoursite.com',
      source: 'Your Site Name',
      timeout: 15000,
      ...config
    });
  }

  // Implement the scrape method
  async scrape(options = {}) {
    // Your scraping logic here
  }
}

module.exports = YourCustomScraper;
```

### Step 2: Implement the `scrape()` Method

```javascript
async scrape(options = {}) {
  const { query = '', location = '', maxPages = 1 } = options;

  this.reset(); // Clear previous results

  try {
    for (let page = 1; page <= maxPages; page++) {
      const url = this.buildSearchUrl({ query, location, page });
      const $ = await this.fetchAndParse(url);
      const jobs = await this.extractJobsFromPage($);

      this.jobs.push(...jobs);

      if (page < maxPages) {
        await this.delay(this.delayBetweenRequests);
      }
    }

    const results = await this.saveJobs();

    return {
      success: true,
      jobs: this.jobs,
      stats: results,
      errors: this.errors
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Step 3: Implement Helper Methods

```javascript
buildSearchUrl(params) {
  const { query, location, page } = params;
  const url = new URL('/search', this.baseUrl);

  if (query) url.searchParams.append('q', query);
  if (location) url.searchParams.append('loc', location);
  if (page > 1) url.searchParams.append('page', page);

  return url.toString();
}

async extractJobsFromPage($) {
  const jobs = [];

  // Adjust selectors based on site structure
  $('.job-card').each((i, element) => {
    const job = this.extractJobData($, element);
    if (job.title && job.company) {
      jobs.push(job);
    }
  });

  return jobs;
}

extractJobData($, element) {
  return {
    title: this.extractText($, '.job-title', element),
    company: this.extractText($, '.company-name', element),
    location: this.extractText($, '.location', element),
    description: this.extractText($, '.description', element),
    applyLink: this.extractAttribute($, 'a', 'href', element),
    externalId: this.generateExternalId({ title, company }),
    tags: [],
    postedAt: new Date(),
    source: this.source
  };
}
```

### Step 4: Register Your Scraper

Add to `scraperRegistry.js`:

```javascript
const YourCustomScraper = require('./YourCustomScraper');

registerDefaultScrapers() {
  this.register('your-scraper', YourCustomScraper);
  // ... other scrapers
}
```

## Usage Examples

### Using the Service

```javascript
const scraperService = require('./services/scraperService');

// Run a single scraper
const result = await scraperService.runScraper('oficina-trabajo-cei', {
  query: 'software developer',
  location: 'Santiago',
  maxPages: 3
});

console.log(`Scraped ${result.stats.saved} jobs`);
```

### Using Scrapers Directly

```javascript
const { OficinaDeTrabajoCeiScraper } = require('./services/scrapers');

const scraper = new OficinaDeTrabajoCeiScraper();

const result = await scraper.scrape({
  query: 'node.js developer',
  location: 'Santiago',
  maxPages: 2
});

console.log(`Found ${result.jobs.length} jobs`);
```

### Run Multiple Scrapers

```javascript
// In parallel
await scraperService.runMultipleScrapers([
  { name: 'oficina-trabajo-cei', options: { query: 'developer' } },
  { name: 'linkedin', options: { query: 'engineer' } }
]);

// Sequential
await scraperService.runMultipleScrapersSequential([...]);
```

## API Endpoints

### GET /api/scraper
Get all available scrapers

### POST /api/scraper/:scraperName/run
Run a specific scraper

**Body:**
```json
{
  "query": "software developer",
  "location": "Santiago",
  "maxPages": 3
}
```

### POST /api/scraper/run-multiple
Run multiple scrapers

**Body:**
```json
{
  "parallel": true,
  "scrapers": [
    {
      "name": "oficina-trabajo-cei",
      "options": { "query": "developer" }
    }
  ]
}
```

### GET /api/scraper/stats
Get scraping statistics

### GET /api/scraper/history?limit=20
Get scrape history

### GET /api/scraper/active
Get currently running scrapes

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

## Best Practices

### 1. Respect Rate Limits

```javascript
constructor(config = {}) {
  super({
    delayBetweenRequests: 2000, // 2 seconds between requests
    maxRetries: 3,
    ...config
  });
}
```

### 2. Handle Errors Gracefully

```javascript
try {
  const job = this.extractJobData($, element);
  jobs.push(job);
} catch (error) {
  console.error(`Error extracting job: ${error.message}`);
  this.errors.push({ element: i, error: error.message });
}
```

### 3. Validate Data

```javascript
const job = this.extractJobData($, element);

if (this.validateJobData(job)) {
  jobs.push(job);
} else {
  console.warn('Invalid job data:', job);
}
```

### 4. Use Unique External IDs

```javascript
// Try to extract from URL first
const jobIdMatch = url?.match(/\/job\/(\d+)/);
if (jobIdMatch) {
  return `${this.source}-${jobIdMatch[1]}`;
}

// Fallback to generated ID
return this.generateExternalId({ title, company });
```

### 5. Clean Data

```javascript
cleanJobData(job) {
  const cleaned = super.cleanJobData(job);

  // Site-specific cleaning
  cleaned.description = cleaned.description
    .replace(/Apply now/gi, '')
    .trim();

  return cleaned;
}
```

## Troubleshooting

### No Jobs Found

1. Check CSS selectors match the site structure
2. Verify the site didn't change layout
3. Check if site requires authentication
4. Look for anti-scraping measures

### Getting Blocked

1. Increase delay between requests
2. Use different User-Agent
3. Consider using proxies
4. Respect robots.txt

### Duplicate Jobs

- Ensure `externalId` is truly unique
- Check job deduplication logic in `saveJobs()`

## Legal Considerations

- Always check the site's Terms of Service
- Respect robots.txt
- Don't overload servers
- Consider using official APIs when available
- For production, obtain proper permissions

## Advanced Features

### Custom Configurations

```javascript
const scraper = new OficinaDeTrabajoCeiScraper({
  timeout: 20000,
  maxRetries: 5,
  delayBetweenRequests: 3000,
  userAgent: 'Custom User Agent'
});
```

### Pagination Strategies

```javascript
// Offset-based
buildSearchUrl({ start = 0 }) {
  url.searchParams.append('start', start);
}

// Page-based
buildSearchUrl({ page = 1 }) {
  url.searchParams.append('page', page);
}

// Cursor-based
buildSearchUrl({ cursor = null }) {
  if (cursor) url.searchParams.append('cursor', cursor);
}
```

## Contributing

To add a new scraper:

1. Create a new class extending `JobPortalScraper`
2. Implement the `scrape()` method
3. Register in `scraperRegistry.js`
4. Add tests in `__tests__/scrapers/`
5. Update this README

## License

ISC

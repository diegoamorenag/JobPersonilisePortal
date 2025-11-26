# Web Scraper System - Quick Start Guide

This guide shows you how to use the complete web scraper system implemented in this project.

## System Overview

The scraper system uses **inheritance** in Node.js to create a reusable framework:

- **Base Class**: `JobPortalScraper` - Provides common functionality
- **Child Classes**: `OficinaDeTrabajoCeiScraper`, `LinkedInJobsScraper`, etc. - Site-specific implementations

## Quick Examples

### 1. Using the API Endpoints

Start your server:
```bash
cd backend
npm start
```

#### Get Available Scrapers
```bash
curl http://localhost:3000/api/scraper
```

Response:
```json
{
  "success": true,
  "count": 2,
  "scrapers": [
    {
      "id": "oficina-trabajo-cei",
      "name": "Oficina de Trabajo CEI",
      "baseUrl": "https://www.oficinaempleo.cl"
    },
    {
      "id": "linkedin",
      "name": "LinkedIn Jobs",
      "baseUrl": "https://www.linkedin.com"
    }
  ]
}
```

#### Run a Scraper
```bash
curl -X POST http://localhost:3000/api/scraper/oficina-trabajo-cei/run \
  -H "Content-Type: application/json" \
  -d '{
    "query": "software developer",
    "location": "Santiago",
    "maxPages": 2
  }'
```

Response:
```json
{
  "success": true,
  "scraper": "oficina-trabajo-cei",
  "result": {
    "success": true,
    "jobs": [...],
    "stats": {
      "saved": 15,
      "duplicates": 5,
      "failed": 0,
      "total": 20
    }
  }
}
```

#### Run Multiple Scrapers in Parallel
```bash
curl -X POST http://localhost:3000/api/scraper/run-multiple \
  -H "Content-Type: application/json" \
  -d '{
    "parallel": true,
    "scrapers": [
      {
        "name": "oficina-trabajo-cei",
        "options": {
          "query": "node.js developer",
          "maxPages": 1
        }
      },
      {
        "name": "linkedin",
        "options": {
          "query": "javascript engineer",
          "maxPages": 1
        }
      }
    ]
  }'
```

#### Get Scraping Statistics
```bash
curl http://localhost:3000/api/scraper/stats
```

#### Get Scraping History
```bash
curl http://localhost:3000/api/scraper/history?limit=10
```

### 2. Using Scrapers Programmatically

#### Example 1: Use the Service Layer
```javascript
const scraperService = require('./src/services/scraperService');

async function scrapeJobs() {
  try {
    const result = await scraperService.runScraper('oficina-trabajo-cei', {
      query: 'software developer',
      location: 'Santiago',
      maxPages: 3
    });

    console.log(`Success: ${result.success}`);
    console.log(`Jobs found: ${result.jobs.length}`);
    console.log(`Saved: ${result.stats.saved}`);
    console.log(`Duplicates: ${result.stats.duplicates}`);
  } catch (error) {
    console.error('Scraping failed:', error.message);
  }
}

scrapeJobs();
```

#### Example 2: Use Scraper Directly
```javascript
const { OficinaDeTrabajoCeiScraper } = require('./src/services/scrapers');

async function directScrape() {
  const scraper = new OficinaDeTrabajoCeiScraper({
    timeout: 15000,
    delayBetweenRequests: 2000
  });

  const result = await scraper.scrape({
    query: 'node.js developer',
    location: 'Santiago',
    maxPages: 2
  });

  console.log(`Found ${result.jobs.length} jobs`);

  // Jobs are automatically saved to database
  console.log('Save results:', result.stats);
}

directScrape();
```

#### Example 3: Run Multiple Scrapers
```javascript
const scraperService = require('./src/services/scraperService');

async function scrapeMultiple() {
  const results = await scraperService.runMultipleScrapers([
    {
      name: 'oficina-trabajo-cei',
      options: { query: 'developer', maxPages: 1 }
    },
    {
      name: 'linkedin',
      options: { query: 'engineer', maxPages: 1 }
    }
  ]);

  results.forEach(result => {
    console.log(`${result.scraperName}: ${result.stats?.saved || 0} jobs saved`);
  });
}

scrapeMultiple();
```

### 3. Creating Your Own Scraper

Create a new file: `src/services/scrapers/YourSiteScraper.js`

```javascript
const JobPortalScraper = require('./JobPortalScraper');

class YourSiteScraper extends JobPortalScraper {
  constructor(config = {}) {
    super({
      baseUrl: 'https://yoursite.com',
      source: 'Your Site Name',
      timeout: 15000,
      ...config
    });
  }

  async scrape(options = {}) {
    const { query = '', location = '', maxPages = 1 } = options;

    this.reset();

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

  buildSearchUrl(params) {
    const { query, location, page } = params;
    const url = new URL('/jobs', this.baseUrl);

    if (query) url.searchParams.append('q', query);
    if (location) url.searchParams.append('loc', location);
    if (page > 1) url.searchParams.append('page', page);

    return url.toString();
  }

  async extractJobsFromPage($) {
    const jobs = [];

    // Adjust selectors based on your site's HTML structure
    $('.job-card').each((i, element) => {
      const job = this.extractJobData($, element);
      if (job.title && job.company) {
        jobs.push(job);
      }
    });

    return jobs;
  }

  extractJobData($, element) {
    const title = this.extractText($, '.job-title', element);
    const company = this.extractText($, '.company', element);
    const location = this.extractText($, '.location', element);
    const description = this.extractText($, '.description', element);
    const applyLink = this.extractAttribute($, 'a', 'href', element);

    return {
      title,
      company,
      location,
      description,
      applyLink: applyLink?.startsWith('http')
        ? applyLink
        : new URL(applyLink, this.baseUrl).toString(),
      externalId: this.generateExternalId({ title, company }),
      tags: [],
      postedAt: new Date(),
      source: this.source
    };
  }
}

module.exports = YourSiteScraper;
```

Register your scraper in `src/services/scrapers/scraperRegistry.js`:

```javascript
const YourSiteScraper = require('./YourSiteScraper');

registerDefaultScrapers() {
  this.register('your-site', YourSiteScraper);
  // ... other scrapers
}
```

Now you can use it:
```javascript
const result = await scraperService.runScraper('your-site', {
  query: 'developer',
  maxPages: 2
});
```

## Understanding the Inheritance Model

```
┌─────────────────────────┐
│   JobPortalScraper      │  ← Base class with common methods
│   (Base Class)          │
│                         │
│ - fetchPage()           │
│ - parseHTML()           │
│ - cleanJobData()        │
│ - saveJobs()            │
│ - validateJobData()     │
│ + scrape() [abstract]   │  ← Must be implemented
└─────────────────────────┘
            ▲
            │ extends
            │
┌───────────┴──────────────┐
│                          │
│                          │
┌──────────────────────┐  ┌─────────────────────┐
│ OficinaDeTrabajo...  │  │  LinkedInJobs...    │
│ (Child Class)        │  │  (Child Class)      │
│                      │  │                     │
│ + scrape()           │  │  + scrape()         │
│ + extractJobsFrom... │  │  + extractJobsFrom..│
│ + buildSearchUrl()   │  │  + buildSearchUrl() │
└──────────────────────┘  └─────────────────────┘
```

### Key Inheritance Concepts

1. **`extends`** - Creates inheritance relationship
2. **`super()`** - Calls parent constructor
3. **`super.methodName()`** - Calls parent method
4. **Override** - Child redefines parent method
5. **Abstract** - Method that child must implement

## Environment Setup

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/jobportal
PORT=3000
NODE_ENV=development
```

## Testing

Run all scraper tests:
```bash
npm test -- scrapers
```

Run specific test:
```bash
npm test -- JobPortalScraper.test.js
```

## Important Notes

### Legal and Ethical Considerations
- Always check the site's Terms of Service
- Respect `robots.txt`
- Don't overload servers (use delays)
- Consider using official APIs when available

### Best Practices
1. **Rate Limiting**: Use delays between requests
2. **Error Handling**: Handle failures gracefully
3. **Validation**: Validate data before saving
4. **Unique IDs**: Ensure external IDs are truly unique
5. **Logging**: Log operations for debugging

### Troubleshooting

**No jobs found?**
- Check CSS selectors match the site structure
- Verify site hasn't changed layout
- Look in browser DevTools for correct selectors

**Getting blocked?**
- Increase `delayBetweenRequests`
- Change `userAgent`
- Check if site requires authentication

## API Reference

See the full documentation in:
- [backend/src/services/scrapers/README.md](./src/services/scrapers/README.md)

## Support

For issues or questions:
- Check the README files
- Review the test files for examples
- Look at existing scraper implementations

## What's Next?

1. Add more scrapers for different job sites
2. Implement scheduling (cron jobs)
3. Add proxy support for production
4. Create a dashboard to monitor scraping
5. Add notifications for new jobs

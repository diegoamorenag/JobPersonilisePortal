/**
 * Scraper Module Entry Point
 * Exports all scraper classes and utilities
 */

const JobPortalScraper = require('./JobPortalScraper');
const OficinaDeTrabajoCeiScraper = require('./OficinaDeTrabajoCeiScraper');
const LinkedInJobsScraper = require('./LinkedInJobsScraper');
const scraperRegistry = require('./scraperRegistry');

module.exports = {
  // Base class
  JobPortalScraper,

  // Concrete scrapers
  OficinaDeTrabajoCeiScraper,
  LinkedInJobsScraper,

  // Registry
  scraperRegistry,

  // Helper functions
  getScraper: (name, config) => scraperRegistry.getScraper(name, config),
  getAvailableScrapers: () => scraperRegistry.getAvailableScrapers(),
  getScrapersInfo: () => scraperRegistry.getScrapersInfo()
};

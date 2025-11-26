const express = require('express');
const morgan = require('morgan');
const router = express.Router();

const app = express();

app.use(morgan('combined'));
app.use(express.json());

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const sourceRoutes = require('./source.routes');
const jobRoutes = require('./job.routes');
const applicationRoutes = require('./application.routes');
const scraperRoutes = require('./scraper.routes');
const preferenceRoutes = require('./preference.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sources', sourceRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/scraper', scraperRoutes);
router.use('/preferences', preferenceRoutes);

module.exports = app;
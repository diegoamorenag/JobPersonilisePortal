/**
 * Wrapper function to catch async errors in Express route handlers
 * Eliminates need for try-catch blocks in controllers
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/jobs', asyncHandler(async (req, res) => {
 *   const jobs = await Job.find();
 *   res.json(jobs);
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;

/**
 * Standardized JSON response formatters
 * Ensures consistent response structure across all API endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} data - Response data
 * @param {string} message - Optional success message
 */
const sendSuccess = (res, statusCode = 200, data = null, message = null) => {
  const response = {
    success: true,
    status: statusCode,
  };

  if (message) response.message = message;
  if (data !== null) response.data = data;

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message
 * @param {Object} errors - Optional validation errors
 */
const sendError = (res, statusCode = 500, message = 'Internal server error', errors = null) => {
  const response = {
    success: false,
    status: statusCode,
    message,
  };

  if (errors) response.errors = errors;

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 */
const sendPaginated = (res, data, page, limit, total) => {
  return res.status(200).json({
    success: true,
    status: 200,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
};

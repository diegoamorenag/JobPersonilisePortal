const errorHandler = require('../../middleware/errorHandler');
const AppError = require('../../utils/AppError');

describe('errorHandler middleware', () => {
  let req, res, next, consoleErrorSpy;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete process.env.NODE_ENV;
  });

  describe('Basic error handling', () => {
    test('should handle generic error with default 500 status', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 500,
        message: 'Something went wrong',
      });
    });

    test('should handle AppError with custom status code', () => {
      const error = new AppError('Custom error', 400);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 400,
        message: 'Custom error',
      });
    });

    test('should log error to console', () => {
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Mongoose CastError handling', () => {
    test('should handle Mongoose CastError and return 404', () => {
      const error = {
        name: 'CastError',
        value: '123abc',
        message: 'Cast to ObjectId failed',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 404,
          message: expect.stringContaining('Resource not found with id: 123abc'),
        })
      );
    });
  });

  describe('Mongoose duplicate key error handling', () => {
    test('should handle duplicate key error and return 400', () => {
      const error = {
        code: 11000,
        keyValue: { email: 'test@example.com' },
        message: 'E11000 duplicate key error',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 400,
          message: expect.stringContaining('Duplicate field value: email'),
        })
      );
    });

    test('should handle duplicate key error with multiple fields', () => {
      const error = {
        code: 11000,
        keyValue: { username: 'john123', email: 'john@example.com' },
        message: 'E11000 duplicate key error',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = res.json.mock.calls[0][0];
      expect(response.message).toContain('username');
    });
  });

  describe('Mongoose validation error handling', () => {
    test('should handle ValidationError and return 400', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password must be at least 8 characters' },
        },
        message: 'Validation failed',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = res.json.mock.calls[0][0];
      expect(response.message).toContain('Email is required');
      expect(response.message).toContain('Password must be at least 8 characters');
    });

    test('should join multiple validation error messages', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          field1: { message: 'Error 1' },
          field2: { message: 'Error 2' },
          field3: { message: 'Error 3' },
        },
        message: 'Validation failed',
      };

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Error 1, Error 2, Error 3');
    });
  });

  describe('JWT error handling', () => {
    test('should handle JsonWebTokenError and return 401', () => {
      const error = {
        name: 'JsonWebTokenError',
        message: 'jwt malformed',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 401,
          message: 'Invalid token. Please log in again',
        })
      );
    });

    test('should handle TokenExpiredError and return 401', () => {
      const error = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 401,
          message: 'Your token has expired. Please log in again',
        })
      );
    });
  });

  describe('Development vs Production mode', () => {
    test('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev error');
      error.stack = 'Error: Dev error\n    at test.js:1:1';

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.stack).toBeDefined();
      expect(response.stack).toContain('Error: Dev error');
    });

    test('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Prod error');
      error.stack = 'Error: Prod error\n    at test.js:1:1';

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.stack).toBeUndefined();
    });

    test('should log stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Error with stack');
      error.stack = 'Stack trace here';

      errorHandler(error, req, res, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error:',
        expect.objectContaining({
          stack: 'Stack trace here',
        })
      );
    });

    test('should not log stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Error');

      errorHandler(error, req, res, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error:',
        expect.objectContaining({
          stack: undefined,
        })
      );
    });
  });

  describe('Response structure', () => {
    test('should always include success: false', () => {
      const error = new Error('Test');

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    test('should always include status code', () => {
      const error = new AppError('Test', 403);

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe(403);
    });

    test('should always include message', () => {
      const error = new Error('Error message');

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.message).toBeDefined();
    });
  });
});

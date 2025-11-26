const notFound = require('../../middleware/notFound');
const AppError = require('../../utils/AppError');

describe('notFound middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/unknown-route',
    };
    res = {};
    next = jest.fn();
  });

  describe('Basic functionality', () => {
    test('should call next with AppError', () => {
      notFound(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    });

    test('should pass 404 status code to AppError', () => {
      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
    });

    test('should include request method in error message', () => {
      req.method = 'POST';
      req.originalUrl = '/api/test';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('POST');
    });

    test('should include original URL in error message', () => {
      req.originalUrl = '/api/users/123';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('/api/users/123');
    });

    test('should format error message correctly', () => {
      req.method = 'GET';
      req.originalUrl = '/api/test';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Route not found: GET /api/test');
    });
  });

  describe('Different HTTP methods', () => {
    test('should handle GET requests', () => {
      req.method = 'GET';
      req.originalUrl = '/api/resource';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('GET');
    });

    test('should handle POST requests', () => {
      req.method = 'POST';
      req.originalUrl = '/api/resource';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('POST');
    });

    test('should handle PUT requests', () => {
      req.method = 'PUT';
      req.originalUrl = '/api/resource/1';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('PUT');
    });

    test('should handle DELETE requests', () => {
      req.method = 'DELETE';
      req.originalUrl = '/api/resource/1';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('DELETE');
    });

    test('should handle PATCH requests', () => {
      req.method = 'PATCH';
      req.originalUrl = '/api/resource/1';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('PATCH');
    });
  });

  describe('Different URL patterns', () => {
    test('should handle root path', () => {
      req.originalUrl = '/';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('/');
    });

    test('should handle nested routes', () => {
      req.originalUrl = '/api/v1/users/123/posts/456';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('/api/v1/users/123/posts/456');
    });

    test('should handle routes with query parameters', () => {
      req.originalUrl = '/api/search?q=test&limit=10';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('?q=test&limit=10');
    });

    test('should handle routes with special characters', () => {
      req.originalUrl = '/api/users/john@example.com';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('john@example.com');
    });

    test('should handle encoded URLs', () => {
      req.originalUrl = '/api/search?name=John%20Doe';

      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('John%20Doe');
    });
  });

  describe('Error properties', () => {
    test('should create operational error', () => {
      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.isOperational).toBe(true);
    });

    test('should set error status to "fail"', () => {
      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.status).toBe('fail');
    });

    test('should have stack trace', () => {
      notFound(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.stack).toBeDefined();
    });
  });

  describe('Middleware behavior', () => {
    test('should not send response directly', () => {
      const mockSend = jest.fn();
      res.send = mockSend;

      notFound(req, res, next);

      expect(mockSend).not.toHaveBeenCalled();
    });

    test('should not modify request object', () => {
      const originalReq = { ...req };

      notFound(req, res, next);

      expect(req).toEqual(originalReq);
    });

    test('should not modify response object', () => {
      const originalRes = { ...res };

      notFound(req, res, next);

      expect(res).toEqual(originalRes);
    });

    test('should only call next once', () => {
      notFound(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});

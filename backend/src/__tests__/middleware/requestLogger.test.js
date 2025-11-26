const requestLogger = require('../../middleware/requestLogger');

describe('requestLogger middleware', () => {
  let req, res, next, consoleLogSpy;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/test',
    };
    res = {
      on: jest.fn(),
      statusCode: 200,
    };
    next = jest.fn();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Basic functionality', () => {
    test('should call next immediately', () => {
      requestLogger(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should register finish event listener', () => {
      requestLogger(req, res, next);

      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    test('should not log before response finishes', () => {
      requestLogger(req, res, next);

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should log after response finishes', () => {
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Log format', () => {
    test('should log request method', () => {
      req.method = 'POST';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('POST');
    });

    test('should log request URL', () => {
      req.originalUrl = '/api/users/123';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('/api/users/123');
    });

    test('should log status code', () => {
      res.statusCode = 404;
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('404');
    });

    test('should log duration in milliseconds', () => {
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toMatch(/Duration: \d+ms/);
    });

    test('should include timestamp in ISO format', () => {
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    test('should format log message correctly', () => {
      req.method = 'GET';
      req.originalUrl = '/api/test';
      res.statusCode = 200;

      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toMatch(/\[.*\] GET \/api\/test - Status: 200 - Duration: \d+ms/);
    });
  });

  describe('Different HTTP methods', () => {
    test('should log GET requests', () => {
      req.method = 'GET';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('GET');
    });

    test('should log POST requests', () => {
      req.method = 'POST';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('POST');
    });

    test('should log PUT requests', () => {
      req.method = 'PUT';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('PUT');
    });

    test('should log DELETE requests', () => {
      req.method = 'DELETE';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('DELETE');
    });
  });

  describe('Different status codes', () => {
    test('should log 200 OK status', () => {
      res.statusCode = 200;
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('200');
    });

    test('should log 201 Created status', () => {
      res.statusCode = 201;
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('201');
    });

    test('should log 400 Bad Request status', () => {
      res.statusCode = 400;
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('400');
    });

    test('should log 404 Not Found status', () => {
      res.statusCode = 404;
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('404');
    });

    test('should log 500 Internal Server Error status', () => {
      res.statusCode = 500;
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('500');
    });
  });

  describe('Duration tracking', () => {
    test('should track request duration accurately', (done) => {
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];

      setTimeout(() => {
        finishCallback();

        const logMessage = consoleLogSpy.mock.calls[0][0];
        const durationMatch = logMessage.match(/Duration: (\d+)ms/);
        const duration = parseInt(durationMatch[1]);

        expect(duration).toBeGreaterThanOrEqual(10);
        expect(duration).toBeLessThan(100);
        done();
      }, 10);
    });

    test('should show 0ms for instant responses', () => {
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      const logMessage = consoleLogSpy.mock.calls[0][0];
      const durationMatch = logMessage.match(/Duration: (\d+)ms/);
      const duration = parseInt(durationMatch[1]);

      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('URL patterns', () => {
    test('should log simple routes', () => {
      req.originalUrl = '/api/test';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('/api/test');
    });

    test('should log routes with parameters', () => {
      req.originalUrl = '/api/users/123';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('/api/users/123');
    });

    test('should log routes with query strings', () => {
      req.originalUrl = '/api/search?q=test&limit=10';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain('?q=test&limit=10');
    });

    test('should log root path', () => {
      req.originalUrl = '/';
      requestLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(consoleLogSpy.mock.calls[0][0]).toContain(' / ');
    });
  });

  describe('Middleware behavior', () => {
    test('should not modify request object', () => {
      const originalMethod = req.method;
      const originalUrl = req.originalUrl;

      requestLogger(req, res, next);

      expect(req.method).toBe(originalMethod);
      expect(req.originalUrl).toBe(originalUrl);
    });

    test('should not modify response statusCode', () => {
      const originalStatusCode = res.statusCode;

      requestLogger(req, res, next);

      expect(res.statusCode).toBe(originalStatusCode);
    });

    test('should work with multiple requests', () => {
      requestLogger(req, res, next);
      const callback1 = res.on.mock.calls[0][1];

      const req2 = { method: 'POST', originalUrl: '/api/users' };
      const res2 = { on: jest.fn(), statusCode: 201 };
      const next2 = jest.fn();

      requestLogger(req2, res2, next2);
      const callback2 = res2.on.mock.calls[0][1];

      callback1();
      callback2();

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy.mock.calls[0][0]).toContain('GET');
      expect(consoleLogSpy.mock.calls[1][0]).toContain('POST');
    });
  });
});

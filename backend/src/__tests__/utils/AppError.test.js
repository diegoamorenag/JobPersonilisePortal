const AppError = require('../../utils/AppError');

describe('AppError', () => {
  describe('Constructor', () => {
    test('should create an error with default status code 500', () => {
      const error = new AppError('Something went wrong');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.status).toBe('error');
      expect(error.isOperational).toBe(true);
    });

    test('should create an error with custom status code', () => {
      const error = new AppError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });

    test('should set status to "fail" for 4xx errors', () => {
      const error400 = new AppError('Bad request', 400);
      const error404 = new AppError('Not found', 404);
      const error422 = new AppError('Validation error', 422);

      expect(error400.status).toBe('fail');
      expect(error404.status).toBe('fail');
      expect(error422.status).toBe('fail');
    });

    test('should set status to "error" for 5xx errors', () => {
      const error500 = new AppError('Internal error', 500);
      const error502 = new AppError('Bad gateway', 502);

      expect(error500.status).toBe('error');
      expect(error502.status).toBe('error');
    });

    test('should capture stack trace', () => {
      const error = new AppError('Test error', 400);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });

    test('should always set isOperational to true', () => {
      const error1 = new AppError('Error 1', 400);
      const error2 = new AppError('Error 2', 500);
      const error3 = new AppError('Error 3');

      expect(error1.isOperational).toBe(true);
      expect(error2.isOperational).toBe(true);
      expect(error3.isOperational).toBe(true);
    });
  });

  describe('Error inheritance', () => {
    test('should work with instanceof checks', () => {
      const error = new AppError('Test', 400);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    test('should be catchable in try-catch blocks', () => {
      expect(() => {
        throw new AppError('Test error', 400);
      }).toThrow(AppError);

      expect(() => {
        throw new AppError('Test error', 400);
      }).toThrow('Test error');
    });
  });
});

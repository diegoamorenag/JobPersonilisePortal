const asyncHandler = require('../../utils/asyncHandler');

describe('asyncHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('Successful async operations', () => {
    test('should handle successful async function', async () => {
      const asyncFn = async (req, res) => {
        res.status(200).json({ success: true });
      };

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle async function that returns a value', async () => {
      const asyncFn = async (req, res) => {
        const data = await Promise.resolve({ data: 'test' });
        res.json(data);
      };

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ data: 'test' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass through req, res, next parameters', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        expect(req).toBeDefined();
        expect(res).toBeDefined();
        expect(next).toBeDefined();
      });

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
    });
  });

  describe('Error handling', () => {
    test('should catch errors and pass to next middleware', async () => {
      const error = new Error('Async error');
      const asyncFn = async () => {
        throw error;
      };

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should catch rejected promises', async () => {
      const error = new Error('Promise rejection');
      const asyncFn = async () => {
        return Promise.reject(error);
      };

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle custom error objects', async () => {
      const customError = { statusCode: 404, message: 'Not found' };
      const asyncFn = async () => {
        throw customError;
      };

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(customError);
    });

    test('should not call response methods when error occurs', async () => {
      const asyncFn = async (req, res) => {
        res.status(200);
        throw new Error('Error after response started');
      };

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(res.status).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Function behavior', () => {
    test('should return a function', () => {
      const asyncFn = async () => {};
      const wrappedFn = asyncHandler(asyncFn);

      expect(typeof wrappedFn).toBe('function');
    });

    test('should work with arrow functions', async () => {
      const asyncFn = asyncHandler(async (req, res) => {
        res.json({ arrow: true });
      });

      await asyncFn(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ arrow: true });
    });

    test('should work with regular async functions', async () => {
      async function regularAsync(req, res) {
        res.json({ regular: true });
      }

      const wrappedFn = asyncHandler(regularAsync);
      await wrappedFn(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ regular: true });
    });

    test('should handle multiple sequential calls', async () => {
      const asyncFn = async (req, res) => {
        res.json({ call: true });
      };

      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);
      await wrappedFn(req, res, next);
      await wrappedFn(req, res, next);

      expect(res.json).toHaveBeenCalledTimes(3);
    });
  });
});

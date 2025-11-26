const { sendSuccess, sendError, sendPaginated } = require('../../utils/responseFormatter');

describe('responseFormatter', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('sendSuccess', () => {
    test('should send success response with default status code 200', () => {
      sendSuccess(res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 200,
      });
    });

    test('should send success response with custom status code', () => {
      sendSuccess(res, 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 201,
      });
    });

    test('should send success response with data', () => {
      const data = { user: 'John', id: 1 };
      sendSuccess(res, 200, data);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 200,
        data,
      });
    });

    test('should send success response with message', () => {
      sendSuccess(res, 200, null, 'Operation successful');

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 200,
        message: 'Operation successful',
      });
    });

    test('should send success response with data and message', () => {
      const data = { items: [1, 2, 3] };
      sendSuccess(res, 200, data, 'Items retrieved successfully');

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 200,
        data,
        message: 'Items retrieved successfully',
      });
    });

    test('should not include data field when data is null', () => {
      sendSuccess(res, 200, null);

      const response = res.json.mock.calls[0][0];
      expect(response).not.toHaveProperty('data');
    });

    test('should not include message field when message is null', () => {
      sendSuccess(res, 200, { id: 1 });

      const response = res.json.mock.calls[0][0];
      expect(response).not.toHaveProperty('message');
    });

    test('should handle empty data object', () => {
      sendSuccess(res, 200, {});

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 200,
        data: {},
      });
    });

    test('should return the response object', () => {
      const result = sendSuccess(res, 200);

      expect(result).toBe(res);
    });
  });

  describe('sendError', () => {
    test('should send error response with default status code 500', () => {
      sendError(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    });

    test('should send error response with custom status code and message', () => {
      sendError(res, 404, 'Resource not found');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 404,
        message: 'Resource not found',
      });
    });

    test('should send error response with validation errors', () => {
      const errors = {
        email: 'Email is required',
        password: 'Password must be at least 8 characters',
      };

      sendError(res, 400, 'Validation failed', errors);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 400,
        message: 'Validation failed',
        errors,
      });
    });

    test('should not include errors field when errors is null', () => {
      sendError(res, 500, 'Something went wrong', null);

      const response = res.json.mock.calls[0][0];
      expect(response).not.toHaveProperty('errors');
    });

    test('should handle empty errors object', () => {
      sendError(res, 400, 'Validation failed', {});

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 400,
        message: 'Validation failed',
        errors: {},
      });
    });

    test('should return the response object', () => {
      const result = sendError(res, 500);

      expect(result).toBe(res);
    });
  });

  describe('sendPaginated', () => {
    test('should send paginated response with correct structure', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      sendPaginated(res, data, 1, 10, 25);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 200,
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          pages: 3,
        },
      });
    });

    test('should calculate total pages correctly', () => {
      const data = [];
      sendPaginated(res, data, 1, 10, 100);

      const response = res.json.mock.calls[0][0];
      expect(response.pagination.pages).toBe(10);
    });

    test('should handle partial last page', () => {
      const data = [];
      sendPaginated(res, data, 1, 10, 25);

      const response = res.json.mock.calls[0][0];
      expect(response.pagination.pages).toBe(3);
    });

    test('should parse string page and limit to integers', () => {
      const data = [];
      sendPaginated(res, data, '2', '20', 100);

      const response = res.json.mock.calls[0][0];
      expect(response.pagination.page).toBe(2);
      expect(response.pagination.limit).toBe(20);
      expect(typeof response.pagination.page).toBe('number');
      expect(typeof response.pagination.limit).toBe('number');
    });

    test('should handle empty data array', () => {
      sendPaginated(res, [], 1, 10, 0);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 200,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      });
    });

    test('should handle single page of results', () => {
      const data = [{ id: 1 }];
      sendPaginated(res, data, 1, 10, 5);

      const response = res.json.mock.calls[0][0];
      expect(response.pagination.pages).toBe(1);
    });

    test('should return the response object', () => {
      const result = sendPaginated(res, [], 1, 10, 0);

      expect(result).toBe(res);
    });
  });

  describe('Response chaining', () => {
    test('sendSuccess should allow method chaining', () => {
      const result = sendSuccess(res, 200, { test: true });

      expect(result.status).toBeDefined();
      expect(result.json).toBeDefined();
    });

    test('sendError should allow method chaining', () => {
      const result = sendError(res, 400, 'Bad request');

      expect(result.status).toBeDefined();
      expect(result.json).toBeDefined();
    });

    test('sendPaginated should allow method chaining', () => {
      const result = sendPaginated(res, [], 1, 10, 0);

      expect(result.status).toBeDefined();
      expect(result.json).toBeDefined();
    });
  });
});

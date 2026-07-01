import { describe, it, expect } from 'vitest';
import { success, created, error } from '../../src/utils/response.js';

describe('response helpers', () => {
  describe('success', () => {
    it('returns 200 with JSON-serialized body', () => {
      const result = success({ friends: [] });
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({ friends: [] });
    });

    it('includes CORS and content-type headers', () => {
      const result = success({});
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('created', () => {
    it('returns 201 with JSON-serialized body', () => {
      const result = created({ requestId: '123', status: 'pending' });
      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({ requestId: '123', status: 'pending' });
    });
  });

  describe('error', () => {
    it('returns specified status code with ErrorResponse body', () => {
      const result = error(400, 'VALIDATION_ERROR', 'Invalid email format', 'email');
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid email format');
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.field).toBe('email');
    });

    it('omits field when not provided', () => {
      const result = error(404, 'NOT_FOUND', 'Resource not found');
      const body = JSON.parse(result.body);
      expect(body.field).toBeUndefined();
    });

    it('returns 409 conflict error correctly', () => {
      const result = error(409, 'ALREADY_FRIENDS', 'Users are already friends');
      expect(result.statusCode).toBe(409);
      expect(JSON.parse(result.body).code).toBe('ALREADY_FRIENDS');
    });
  });
});

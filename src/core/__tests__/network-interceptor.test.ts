import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractUTClassFromStack,
  extractRequestMetadata,
  recordNetworkRequest,
  getNetworkRequests,
  resetNetworkRequests,
  type NetworkRequestRecord,
} from '../network-interceptor';
import { setFeatureEnabled } from '../feature-toggles';

describe('Network Interceptor', () => {
  beforeEach(() => {
    resetNetworkRequests();
    setFeatureEnabled('network', true);
  });

  describe('extractUTClassFromStack', () => {
    it('returns first UT class and method from stack', () => {
      const stack = [
        'Error',
        '    at UTHttpClient.sendRequest (app.js:10:20)',
        '    at UTPlayerItemView.render (app.js:30:40)',
      ].join('\n');

      const result = extractUTClassFromStack(stack);
      expect(result.utClass).toBe('UTHttpClient');
      expect(result.utMethod).toBe('sendRequest');
    });

    it('returns null attribution when no UT classes present', () => {
      const stack = [
        'Error',
        '    at fetchData (app.js:10:20)',
        '    at render (app.js:30:40)',
      ].join('\n');

      const result = extractUTClassFromStack(stack);
      expect(result.utClass).toBeNull();
      expect(result.utMethod).toBeNull();
    });
  });

  describe('extractRequestMetadata', () => {
    it('extracts metadata with safe header subset and redacts authorization', () => {
      const startTs = 100;
      const endTs = 148;
      const metadata = extractRequestMetadata({
        id: 1,
        ts: Date.now(),
        url: 'https://example.com/api/items?x=1',
        method: 'post',
        requestHeaders: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer secret-token',
          'X-Internal': 'skip-me',
        },
        status: 201,
        startTs,
        endTs,
        size: 512,
        stack: 'Error\n    at UTNetworkClient.fetchItems (app.js:1:1)',
        correlationId: 'corr-1',
      });

      expect(metadata.url).toBe('https://example.com/api/items?x=1');
      expect(metadata.method).toBe('POST');
      expect(metadata.status).toBe(201);
      expect(metadata.durationMs).toBe(48);
      expect(metadata.size).toBe(512);
      expect(metadata.utClass).toBe('UTNetworkClient');
      expect(metadata.utMethod).toBe('fetchItems');
      expect(metadata.correlationId).toBe('corr-1');
      expect(metadata.headers).toEqual({
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: '[REDACTED]',
      });
    });
  });

  describe('recordNetworkRequest/getNetworkRequests', () => {
    it('stores and returns records newest-first', () => {
      const first: NetworkRequestRecord = {
        id: 1,
        ts: 1000,
        url: 'https://example.com/a',
        method: 'GET',
        status: 200,
        durationMs: 10,
        size: 10,
        utClass: 'UTA',
        utMethod: 'loadA',
        correlationId: 'a',
      };
      const second: NetworkRequestRecord = {
        id: 2,
        ts: 1010,
        url: 'https://example.com/b',
        method: 'GET',
        status: 200,
        durationMs: 20,
        size: 20,
        utClass: 'UTB',
        utMethod: 'loadB',
        correlationId: 'b',
      };

      recordNetworkRequest(first);
      recordNetworkRequest(second);

      const records = getNetworkRequests(50);
      expect(records).toHaveLength(2);
      expect(records[0].id).toBe(2);
      expect(records[1].id).toBe(1);
    });

    it('enforces bounded storage of 5000 entries', () => {
      for (let i = 1; i <= 5001; i += 1) {
        recordNetworkRequest({
          id: i,
          ts: i,
          url: `https://example.com/${i}`,
          method: 'GET',
          status: 200,
          durationMs: i,
          size: i,
          utClass: null,
          utMethod: null,
          correlationId: `corr-${i}`,
        });
      }

      const records = getNetworkRequests(6000);
      expect(records).toHaveLength(5000);
      expect(records[0].id).toBe(5001);
      expect(records[4999].id).toBe(2);
    });

    it('filters by URL substring', () => {
      recordNetworkRequest({
        id: 1,
        ts: 1,
        url: 'https://example.com/items/list',
        method: 'GET',
        status: 200,
        durationMs: 12,
        size: 100,
        utClass: null,
        utMethod: null,
        correlationId: 'corr-1',
      });
      recordNetworkRequest({
        id: 2,
        ts: 2,
        url: 'https://example.com/auctions/list',
        method: 'GET',
        status: 200,
        durationMs: 22,
        size: 200,
        utClass: null,
        utMethod: null,
        correlationId: 'corr-2',
      });

      const filtered = getNetworkRequests(50, 'items');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].url).toContain('/items/');
    });

    it('does not record when network feature is disabled', () => {
      setFeatureEnabled('network', false);

      recordNetworkRequest({
        id: 1,
        ts: 1,
        url: 'https://example.com/ignored',
        method: 'GET',
        status: 200,
        durationMs: 1,
        size: 1,
        utClass: null,
        utMethod: null,
        correlationId: 'corr-1',
      });

      expect(getNetworkRequests(50)).toHaveLength(0);
    });
  });
});

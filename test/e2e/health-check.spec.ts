import { test, expect } from '@playwright/test';

test.describe('PixelPress Health Check Test', () => {
  test('should verify health check endpoint returns expected response', async ({ page }) => {
    // Navigate to the health check endpoint
    await test.step('Navigate to health check endpoint', async () => {
      await page.goto('/api/health');
    });

    // Verify the response status is 200
    await test.step('Verify response status is 200', async () => {
      const response = page.url().includes('/api/health');
      expect(response, 'Should navigate to health check endpoint').toBe(true);
      
      // Get the page content to check the JSON response
      const pageContent = await page.textContent('body');
      expect(pageContent, 'Page should have content').toBeTruthy();
      
      // Parse the JSON response
      const jsonResponse = JSON.parse(pageContent || '{}');
      
      // Verify the response contains status: "healthy"
      await expect.soft(jsonResponse.status, 'Status should be healthy').toBe('healthy');
      
      // Verify the response contains timestamp field
      expect(jsonResponse.timestamp, 'Should contain timestamp field').toBeTruthy();
      expect(typeof jsonResponse.timestamp, 'Timestamp should be a string').toBe('string');
      
      // Verify timestamp is a valid ISO date
      const timestamp = new Date(jsonResponse.timestamp);
      expect(timestamp.getTime(), 'Timestamp should be a valid date').not.toBeNaN();
      
      // Verify the response structure
      expect(jsonResponse, 'Response should contain expected fields').toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        service: expect.any(String)
      });
    });

    // Additional verification by making a direct API call
    await test.step('Verify API response via direct request', async () => {
      const response = await page.request.get('/api/health');
      
      expect(response.status(), 'API response status should be 200').toBe(200);
      
      const responseBody = await response.json();
      
      expect(responseBody.status, 'API response status should be healthy').toBe('healthy');
      expect(responseBody.timestamp, 'API response should contain timestamp').toBeTruthy();
      expect(responseBody.service, 'API response should contain service name').toBeTruthy();
    });
  });
});
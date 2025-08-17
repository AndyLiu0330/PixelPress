// Comprehensive Watermark Removal Tests for PixelPress
// Testing both backend API and frontend interface

const fs = require('fs');
const path = require('path');

// Test configuration
const BACKEND_URL = 'http://localhost:3002';
const FRONTEND_URL = 'http://localhost:5176';
const TEST_IMAGE_PATH = 'C:\\Project\\PixelPress\\test_image_for_api.webp';

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  backendTests: [],
  frontendTests: [],
  performanceMetrics: [],
  errors: []
};

async function runBackendTests() {
  console.log('\n=== BACKEND API TESTS ===');
  
  // Test 1: Upload an image first
  console.log('\n1. Testing image upload...');
  try {
    const formData = new FormData();
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const blob = new Blob([imageBuffer], { type: 'image/webp' });
    formData.append('image', blob, 'test_image.webp');
    
    const uploadResponse = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', uploadResult);
    
    if (uploadResult.success) {
      testResults.backendTests.push({
        test: 'Image Upload',
        status: 'PASS',
        response: uploadResult
      });
      
      const imageId = uploadResult.data.id;
      console.log('Image ID:', imageId);
      
      // Test 2: Basic watermark removal
      console.log('\n2. Testing basic watermark removal...');
      const basicStartTime = Date.now();
      
      const basicRemovalResponse = await fetch(`${BACKEND_URL}/api/remove-watermark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageId: imageId,
          watermarkArea: {
            x: 100,
            y: 100,
            width: 150,
            height: 100
          }
        })
      });
      
      const basicRemovalResult = await basicRemovalResponse.json();
      const basicEndTime = Date.now();
      const basicProcessingTime = basicEndTime - basicStartTime;
      
      console.log('Basic removal result:', basicRemovalResult);
      testResults.backendTests.push({
        test: 'Basic Watermark Removal',
        status: basicRemovalResult.success ? 'PASS' : 'FAIL',
        response: basicRemovalResult,
        processingTime: basicProcessingTime
      });
      
      // Test 3: Advanced watermark removal
      console.log('\n3. Testing advanced watermark removal...');
      const advancedStartTime = Date.now();
      
      const advancedRemovalResponse = await fetch(`${BACKEND_URL}/api/remove-watermark-advanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageId: imageId,
          watermarkArea: {
            x: 100,
            y: 100,
            width: 150,
            height: 100
          },
          options: {
            samplingRadius: 50,
            featherRadius: 20,
            textureAnalysisDepth: 3,
            edgePreservation: true,
            noiseMatching: true
          }
        })
      });
      
      const advancedRemovalResult = await advancedRemovalResponse.json();
      const advancedEndTime = Date.now();
      const advancedProcessingTime = advancedEndTime - advancedStartTime;
      
      console.log('Advanced removal result:', advancedRemovalResult);
      testResults.backendTests.push({
        test: 'Advanced Watermark Removal',
        status: advancedRemovalResult.success ? 'PASS' : 'FAIL',
        response: advancedRemovalResult,
        processingTime: advancedProcessingTime
      });
      
      // Store performance comparison
      testResults.performanceMetrics.push({
        basicProcessingTime,
        advancedProcessingTime,
        improvement: advancedProcessingTime > basicProcessingTime ? 
          `Advanced is ${advancedProcessingTime - basicProcessingTime}ms slower` :
          `Advanced is ${basicProcessingTime - advancedProcessingTime}ms faster`
      });
      
      if (advancedRemovalResult.success && advancedRemovalResult.data.qualityMetrics) {
        console.log('\n=== QUALITY METRICS ===');
        console.log('PSNR:', advancedRemovalResult.data.qualityMetrics.psnr);
        console.log('SSIM:', advancedRemovalResult.data.qualityMetrics.ssim);
        console.log('Visual Quality:', advancedRemovalResult.data.qualityMetrics.visualQuality);
        console.log('Artifact Level:', advancedRemovalResult.data.qualityMetrics.artifactLevel);
        console.log('Method Used:', advancedRemovalResult.data.method);
        console.log('Texture Complexity:', advancedRemovalResult.data.textureComplexity);
        console.log('Edge Strength:', advancedRemovalResult.data.edgeStrength);
      }
      
    } else {
      testResults.backendTests.push({
        test: 'Image Upload',
        status: 'FAIL',
        response: uploadResult
      });
    }
    
  } catch (error) {
    console.error('Backend test error:', error);
    testResults.errors.push({
      test: 'Backend Tests',
      error: error.message
    });
  }
}

async function runErrorHandlingTests() {
  console.log('\n=== ERROR HANDLING TESTS ===');
  
  // Test missing image ID
  console.log('\n1. Testing missing image ID...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/remove-watermark-advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        watermarkArea: {
          x: 100,
          y: 100,
          width: 150,
          height: 100
        }
      })
    });
    
    const result = await response.json();
    console.log('Missing image ID result:', result);
    testResults.backendTests.push({
      test: 'Missing Image ID Error Handling',
      status: result.error && result.code === 'MISSING_IMAGE_ID' ? 'PASS' : 'FAIL',
      response: result
    });
  } catch (error) {
    console.error('Error handling test error:', error);
  }
  
  // Test invalid image ID
  console.log('\n2. Testing invalid image ID...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/remove-watermark-advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageId: 'invalid-id-12345',
        watermarkArea: {
          x: 100,
          y: 100,
          width: 150,
          height: 100
        }
      })
    });
    
    const result = await response.json();
    console.log('Invalid image ID result:', result);
    testResults.backendTests.push({
      test: 'Invalid Image ID Error Handling',
      status: result.error && result.code === 'IMAGE_NOT_FOUND' ? 'PASS' : 'FAIL',
      response: result
    });
  } catch (error) {
    console.error('Error handling test error:', error);
  }
  
  // Test missing watermark area
  console.log('\n3. Testing missing watermark area...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/remove-watermark-advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageId: 'test-id'
      })
    });
    
    const result = await response.json();
    console.log('Missing watermark area result:', result);
    testResults.backendTests.push({
      test: 'Missing Watermark Area Error Handling',
      status: result.error && result.code === 'MISSING_WATERMARK_AREA' ? 'PASS' : 'FAIL',
      response: result
    });
  } catch (error) {
    console.error('Error handling test error:', error);
  }
}

// Log final results
function logTestResults() {
  console.log('\n\n=== COMPREHENSIVE TEST RESULTS ===');
  console.log('Timestamp:', testResults.timestamp);
  
  console.log('\n--- Backend Tests ---');
  testResults.backendTests.forEach(test => {
    console.log(`${test.test}: ${test.status}`);
    if (test.processingTime) {
      console.log(`  Processing Time: ${test.processingTime}ms`);
    }
    if (test.status === 'FAIL') {
      console.log(`  Error: ${JSON.stringify(test.response, null, 2)}`);
    }
  });
  
  console.log('\n--- Performance Metrics ---');
  testResults.performanceMetrics.forEach(metric => {
    console.log(`Basic Processing Time: ${metric.basicProcessingTime}ms`);
    console.log(`Advanced Processing Time: ${metric.advancedProcessingTime}ms`);
    console.log(`Performance: ${metric.improvement}`);
  });
  
  if (testResults.errors.length > 0) {
    console.log('\n--- Errors ---');
    testResults.errors.forEach(error => {
      console.log(`${error.test}: ${error.error}`);
    });
  }
  
  // Save results to file
  fs.writeFileSync(
    'C:\\Project\\PixelPress\\test_results.json',
    JSON.stringify(testResults, null, 2)
  );
  console.log('\nTest results saved to test_results.json');
}

// Run all tests
async function runAllTests() {
  console.log('Starting comprehensive watermark removal tests...');
  console.log('Backend URL:', BACKEND_URL);
  console.log('Frontend URL:', FRONTEND_URL);
  console.log('Test Image:', TEST_IMAGE_PATH);
  
  await runBackendTests();
  await runErrorHandlingTests();
  logTestResults();
}

// Export for Playwright usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    runBackendTests,
    runErrorHandlingTests,
    testResults
  };
}

// Run tests if called directly
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}
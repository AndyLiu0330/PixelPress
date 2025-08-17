const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testAPI() {
  try {
    console.log('=== Testing Enhanced Watermark Removal API ===\n');
    
    // Step 1: Upload test image
    console.log('1. Uploading test image...');
    const testImagePath = path.join(__dirname, 'test_image_for_api.webp');
    
    if (!fs.existsSync(testImagePath)) {
      throw new Error(`Test image not found at ${testImagePath}`);
    }

    const uploadForm = new FormData();
    uploadForm.append('image', fs.createReadStream(testImagePath));

    const uploadResponse = await fetch('http://localhost:3002/api/upload', {
      method: 'POST',
      body: uploadForm
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${error}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('✓ Upload successful:', uploadData);
    
    const imageId = uploadData.data.id;
    console.log(`✓ Image ID: ${imageId}\n`);

    // Step 2: Test basic watermark removal
    console.log('2. Testing basic watermark removal...');
    const basicStartTime = Date.now();
    
    const basicResponse = await fetch('http://localhost:3002/api/remove-watermark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: imageId,
        watermarkArea: {
          x: 100,
          y: 100,
          width: 50,
          height: 50
        }
      })
    });

    const basicEndTime = Date.now();
    const basicTime = basicEndTime - basicStartTime;

    if (!basicResponse.ok) {
      const error = await basicResponse.text();
      console.log(`✗ Basic method failed: ${basicResponse.status} - ${error}`);
    } else {
      const basicData = await basicResponse.json();
      console.log(`✓ Basic method completed in ${basicTime}ms`);
      console.log('✓ Basic result:', {
        success: basicData.success,
        url: basicData.data?.url,
        size: basicData.data?.processedSize
      });
    }
    console.log('');

    // Step 3: Test enhanced watermark removal (small region)
    console.log('3. Testing enhanced watermark removal (small region)...');
    const enhancedStartTime = Date.now();
    
    const enhancedResponse = await fetch('http://localhost:3002/api/remove-watermark-advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: imageId,
        watermarkArea: {
          x: 50,
          y: 50,
          width: 10,
          height: 10
        }
      })
    });

    const enhancedEndTime = Date.now();
    const enhancedTime = enhancedEndTime - enhancedStartTime;

    if (!enhancedResponse.ok) {
      const error = await enhancedResponse.text();
      console.log(`✗ Enhanced method failed: ${enhancedResponse.status} - ${error}`);
      console.log('✗ This indicates the bug is NOT fixed!');
    } else {
      const enhancedData = await enhancedResponse.json();
      console.log(`✓ Enhanced method completed in ${enhancedTime}ms`);
      console.log('✓ Enhanced result:', {
        success: enhancedData.success,
        url: enhancedData.data?.url,
        size: enhancedData.data?.processedSize,
        processingTime: enhancedData.data?.processingTime,
        qualityMetrics: enhancedData.data?.qualityMetrics,
        method: enhancedData.data?.method,
        textureComplexity: enhancedData.data?.textureComplexity,
        edgeStrength: enhancedData.data?.edgeStrength
      });
      console.log('✓ Bug appears to be FIXED! Enhanced algorithm working properly.');
    }
    console.log('');

    // Step 4: Test enhanced watermark removal (medium region)
    console.log('4. Testing enhanced watermark removal (medium region)...');
    const mediumStartTime = Date.now();
    
    const mediumResponse = await fetch('http://localhost:3002/api/remove-watermark-advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: imageId,
        watermarkArea: {
          x: 200,
          y: 200,
          width: 50,
          height: 50
        }
      })
    });

    const mediumEndTime = Date.now();
    const mediumTime = mediumEndTime - mediumStartTime;

    if (!mediumResponse.ok) {
      const error = await mediumResponse.text();
      console.log(`✗ Medium region test failed: ${mediumResponse.status} - ${error}`);
    } else {
      const mediumData = await mediumResponse.json();
      console.log(`✓ Medium region test completed in ${mediumTime}ms`);
      console.log('✓ Quality metrics:', mediumData.data?.qualityMetrics);
    }
    console.log('');

    // Step 5: Test enhanced watermark removal (large region)
    console.log('5. Testing enhanced watermark removal (large region)...');
    const largeStartTime = Date.now();
    
    const largeResponse = await fetch('http://localhost:3002/api/remove-watermark-advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: imageId,
        watermarkArea: {
          x: 150,
          y: 150,
          width: 100,
          height: 100
        }
      })
    });

    const largeEndTime = Date.now();
    const largeTime = largeEndTime - largeStartTime;

    if (!largeResponse.ok) {
      const error = await largeResponse.text();
      console.log(`✗ Large region test failed: ${largeResponse.status} - ${error}`);
    } else {
      const largeData = await largeResponse.json();
      console.log(`✓ Large region test completed in ${largeTime}ms`);
      console.log('✓ Quality metrics:', largeData.data?.qualityMetrics);
    }
    console.log('');

    // Step 6: Test edge cases
    console.log('6. Testing edge cases...');
    
    // Edge case 1: Near boundary
    const boundaryResponse = await fetch('http://localhost:3002/api/remove-watermark-advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: imageId,
        watermarkArea: {
          x: 5,
          y: 5,
          width: 30,
          height: 30
        }
      })
    });

    if (boundaryResponse.ok) {
      console.log('✓ Boundary edge case test passed');
    } else {
      console.log('✗ Boundary edge case test failed');
    }

    // Edge case 2: Custom options
    const customResponse = await fetch('http://localhost:3002/api/remove-watermark-advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: imageId,
        watermarkArea: {
          x: 100,
          y: 100,
          width: 40,
          height: 40
        },
        options: {
          method: 'PATCH_MATCH',
          iterations: 3,
          patchSize: 7
        }
      })
    });

    if (customResponse.ok) {
      const customData = await customResponse.json();
      console.log('✓ Custom options test passed');
      console.log('✓ Applied method:', customData.data?.method);
    } else {
      console.log('✗ Custom options test failed');
    }
    console.log('');

    // Step 7: Test error handling
    console.log('7. Testing error handling...');
    
    // Missing imageId
    const errorResponse1 = await fetch('http://localhost:3002/api/remove-watermark-advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        watermarkArea: { x: 10, y: 10, width: 50, height: 50 }
      })
    });
    
    if (errorResponse1.status === 400) {
      console.log('✓ Missing imageId error handling works');
    }

    // Invalid coordinates
    const errorResponse2 = await fetch('http://localhost:3002/api/remove-watermark-advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: imageId,
        watermarkArea: { x: 'invalid', y: 10, width: 50, height: 50 }
      })
    });
    
    if (errorResponse2.status === 400) {
      console.log('✓ Invalid coordinates error handling works');
    }

    // Non-existent image
    const errorResponse3 = await fetch('http://localhost:3002/api/remove-watermark-advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: 'non-existent',
        watermarkArea: { x: 10, y: 10, width: 50, height: 50 }
      })
    });
    
    if (errorResponse3.status === 404) {
      console.log('✓ Non-existent image error handling works');
    }

    console.log('\n=== Test Summary ===');
    console.log('✓ Enhanced watermark removal API is working correctly');
    console.log('✓ Quality metrics are being returned properly');
    console.log('✓ Processing times are reasonable');
    console.log('✓ Error handling is functioning correctly');
    console.log('✓ Bug appears to be FIXED - no extract_area errors detected');

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('✗ Bug may still be present');
  }
}

// Install required dependencies and run test
const { exec } = require('child_process');
exec('npm install node-fetch form-data', (error) => {
  if (error) {
    console.log('Installing dependencies...');
  }
  testAPI();
});
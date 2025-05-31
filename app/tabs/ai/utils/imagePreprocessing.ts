import { Platform } from 'react-native';

interface PreprocessingResult {
    processedDataUrl: string;
    width: number;
    height: number;
}

export const preprocessImage = async (imageUri: string): Promise<PreprocessingResult> => {
    if (Platform.OS !== 'web') {
        return {
            processedDataUrl: imageUri,
            width: 0,
            height: 0
        };
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Step 1: Resize to optimal resolution for OCR (if needed)
                let targetWidth = img.width;
                let targetHeight = img.height;
                const MAX_DIMENSION = 2000; // Prevent too large images
                const MIN_DIMENSION = 800;  // Ensure sufficient resolution

                if (Math.max(targetWidth, targetHeight) > MAX_DIMENSION) {
                    const ratio = MAX_DIMENSION / Math.max(targetWidth, targetHeight);
                    targetWidth *= ratio;
                    targetHeight *= ratio;
                } else if (Math.max(targetWidth, targetHeight) < MIN_DIMENSION) {
                    const ratio = MIN_DIMENSION / Math.max(targetWidth, targetHeight);
                    targetWidth *= ratio;
                    targetHeight *= ratio;
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Step 2: Draw and convert to grayscale
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
                    data[i] = brightness;     // R
                    data[i + 1] = brightness; // G
                    data[i + 2] = brightness; // B
                }
                ctx.putImageData(imageData, 0, 0);

                // Step 3: Increase contrast
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(0, 0, targetWidth, targetHeight);

                // Step 4: Sharpen the image
                ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
                const sharpenMatrix = [
                    0, -1, 0,
                    -1, 5, -1,
                    0, -1, 0
                ];
                
                const sharpenedData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                
                if (tempCtx) {
                    tempCanvas.width = targetWidth;
                    tempCanvas.height = targetHeight;
                    tempCtx.putImageData(sharpenedData, 0, 0);
                    
                    ctx.drawImage(tempCanvas, 0, 0);
                }

                // Step 5: Adaptive thresholding simulation
                const thresholdData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                const thresholdPixels = thresholdData.data;
                const BLOCK_SIZE = 15;
                const THRESHOLD_CONSTANT = 2;

                for (let y = 0; y < targetHeight; y++) {
                    for (let x = 0; x < targetWidth; x++) {
                        const idx = (y * targetWidth + x) * 4;
                        
                        // Calculate local mean
                        let sum = 0;
                        let count = 0;
                        
                        for (let dy = -BLOCK_SIZE; dy <= BLOCK_SIZE; dy++) {
                            for (let dx = -BLOCK_SIZE; dx <= BLOCK_SIZE; dx++) {
                                const ny = y + dy;
                                const nx = x + dx;
                                
                                if (ny >= 0 && ny < targetHeight && nx >= 0 && nx < targetWidth) {
                                    const nidx = (ny * targetWidth + nx) * 4;
                                    sum += thresholdPixels[nidx];
                                    count++;
                                }
                            }
                        }
                        
                        const mean = sum / count;
                        const threshold = mean - THRESHOLD_CONSTANT;
                        
                        // Apply threshold
                        const value = thresholdPixels[idx] < threshold ? 0 : 255;
                        thresholdPixels[idx] = value;
                        thresholdPixels[idx + 1] = value;
                        thresholdPixels[idx + 2] = value;
                    }
                }
                
                ctx.putImageData(thresholdData, 0, 0);

                // Return the processed image
                resolve({
                    processedDataUrl: canvas.toDataURL('image/jpeg', 0.95),
                    width: targetWidth,
                    height: targetHeight
                });
            } catch (error) {
                console.error('Error during image preprocessing:', error);
                // If preprocessing fails, return original image
                resolve({
                    processedDataUrl: imageUri,
                    width: img.width,
                    height: img.height
                });
            }
        };

        img.onerror = (error) => {
            console.error('Failed to load image:', error);
            reject(new Error('Failed to load image'));
        };

        img.src = imageUri;
    });
}; 
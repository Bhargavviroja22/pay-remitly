"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Camera, X, CheckCircle, Scan, Upload } from "lucide-react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScannerComponent({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string>("");
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let mounted = true;
    let videoElement: HTMLVideoElement | null = null;

    const initScanner = async () => {
      try {
        console.log("Starting QR scanner initialization...");
        
        if (!videoRef.current) {
          console.log("Video ref not available");
          return;
        }

        videoElement = videoRef.current;
        QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';
        
        console.log("Checking for camera...");
        const cameraAvailable = await QrScanner.hasCamera();
        console.log("Camera available:", cameraAvailable);

        if (!cameraAvailable) {
          if (mounted) {
            setError("No camera found on this device.");
            setIsLoading(false);
          }
          return;
        }

        if (!mounted || !videoElement) {
          console.log("Component unmounted or video ref lost");
          return;
        }

        console.log("Starting camera stream...");
        // Just start the camera, don't scan automatically
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoElement && mounted) {
          videoElement.srcObject = stream;
          await videoElement.play();
          setIsLoading(false);
          console.log("Camera started successfully");
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Failed to start camera:", err);
        
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          setError(`Camera error: ${errorMessage}. Please allow camera access.`);
          setIsLoading(false);
        }
      }
    };

    initScanner();

    return () => {
      console.log("Cleaning up camera...");
      mounted = false;
      
      // Stop camera stream
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.destroy();
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
        scannerRef.current = null;
      }
    };
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    
    try {
      // Capture current video frame to canvas
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError("Failed to get canvas context");
        setIsScanning(false);
        return;
      }
      
      // Draw the video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Try scanning with different approaches
      console.log("Scanning captured image for QR code...");
      
      try {
        // First attempt: scan the canvas directly
        const result = await QrScanner.scanImage(canvas, {
          returnDetailedScanResult: true,
        });
        
        console.log("QR Code detected from photo:", result.data);
        setScanned(true);
        onScan(result.data);
        
        setTimeout(() => {
          onClose();
        }, 1000);
        return;
      } catch (firstErr) {
        console.log("First scan attempt failed, trying with inverted colors...");
        
        // Second attempt: try with inverted colors (helps with some QR codes)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Invert colors
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];     // red
          data[i + 1] = 255 - data[i + 1]; // green
          data[i + 2] = 255 - data[i + 2]; // blue
        }
        ctx.putImageData(imageData, 0, 0);
        
        try {
          const result = await QrScanner.scanImage(canvas, {
            returnDetailedScanResult: true,
          });
          
          console.log("QR Code detected from inverted photo:", result.data);
          setScanned(true);
          onScan(result.data);
          
          setTimeout(() => {
            onClose();
          }, 1000);
          return;
        } catch (secondErr) {
          console.error("Both scan attempts failed:", firstErr, secondErr);
          throw new Error("No QR code found in the image");
        }
      }
      
    } catch (err) {
      console.error("Failed to scan QR code:", err);
      setError("No QR code found. Please ensure the QR code is clearly visible and well-lit, then try again.");
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setIsScanning(true);

    try {
      console.log("Scanning uploaded file:", file.name);
      
      // Create an image element to load the file
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      
      console.log("Image loaded, dimensions:", img.width, "x", img.height);
      
      // Try scanning the image directly
      try {
        const result = await QrScanner.scanImage(img, {
          returnDetailedScanResult: true,
        });
        
        console.log("QR Code detected from file:", result.data);
        setScanned(true);
        onScan(result.data);
        URL.revokeObjectURL(imageUrl);
        
        setTimeout(() => {
          onClose();
        }, 1000);
        return;
      } catch (err) {
        console.log("Direct scan failed:", err, "trying with canvas processing...");
        
        // Create a canvas and try different image processing techniques
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Failed to get canvas context");
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Try with different contrast/brightness adjustments
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Increase contrast
        const contrast = 50;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
          data[i] = factor * (data[i] - 128) + 128;     // R
          data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
          data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const result = await QrScanner.scanImage(canvas, {
          returnDetailedScanResult: true,
        });
        
        console.log("QR Code detected after processing:", result.data);
        setScanned(true);
        onScan(result.data);
        URL.revokeObjectURL(imageUrl);
        
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to scan uploaded file:", err);
      setError("No QR code found in the uploaded image. Please try: 1) Better lighting 2) Clear image 3) QR code fills most of frame");
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Scan QR Code
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
            <p className="font-semibold mb-2">Error</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={handleClose}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: "400px", minHeight: "300px" }}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {scanned && (
              <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center rounded-lg">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="text-center mt-2 font-semibold">Scanned!</p>
                </div>
              </div>
            )}
            {!scanned && !isLoading && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
                <button
                  onClick={captureAndScan}
                  disabled={isScanning}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Scan className="w-5 h-5" />
                  {isScanning ? "Scanning..." : "Capture & Scan"}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Upload className="w-5 h-5" />
                  Upload
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {!error && !scanned && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
            {isLoading 
              ? "Initializing camera..." 
              : "Capture from camera or upload a QR code image"}
          </p>
        )}
      </div>
    </div>
  );
}

export { };

declare global {
    interface BarcodeDetectorOptions {
        formats?: string[];
    }

    interface DetectedBarcode {
        rawValue: string;
        format: string;
        boundingBox?: DOMRectReadOnly;
        cornerPoints?: { x: number; y: number }[];
    }

    class BarcodeDetector {
        constructor(options?: BarcodeDetectorOptions);

        static getSupportedFormats(): Promise<string[]>;

        detect(image: CanvasImageSource): Promise<DetectedBarcode[]>;
    }

    interface Window {
        BarcodeDetector: typeof BarcodeDetector;
    }
}

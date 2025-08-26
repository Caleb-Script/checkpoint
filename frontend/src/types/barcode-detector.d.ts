// /Users/gentlebookpro/Projekte/checkpoint/web/src/types/barcode-detector.d.ts
// Eine zentrale, globale Deklaration für den experimentellen BarcodeDetector.
// Keine Duplikate in Komponenten anlegen!

export {};

declare global {
  interface DetectedBarcode {
    rawValue: string;
    // optionale Felder (werden von manchen Browsern geliefert)
    // format?: string;
    // boundingBox?: DOMRectReadOnly;
    // cornerPoints?: Array<{ x: number; y: number }>;
  }

  interface BarcodeDetectorOptions {
    formats?: string[];
  }

  interface BarcodeDetector {
    detect(
      source:
        | HTMLVideoElement
        | HTMLImageElement
        | HTMLCanvasElement
        | ImageBitmap
        | ImageData
        | OffscreenCanvas,
    ): Promise<DetectedBarcode[]>;
  }

  interface BarcodeDetectorConstructor {
    new (options?: BarcodeDetectorOptions): BarcodeDetector;
    getSupportedFormats(): Promise<string[]>;
  }

  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

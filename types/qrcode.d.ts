declare module 'qrcode' {
  export type QRCodeErrorCorrectionLevel = 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';

  export type QRCodeToDataURLOptions = {
    margin?: number;
    width?: number;
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  };

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
}


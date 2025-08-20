import QRCode from 'qrcode';

export async function qrDataURL(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 6
    });
}

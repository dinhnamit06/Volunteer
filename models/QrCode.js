const QRCode = require('qrcode');

class QrCode {
    constructor(data) {
        this.qrCodeId = data.QRCodeId || data.id || null;
        this.qrCodeImage = data.QRCodeImage || data.qr_image_url || null;
        this.validationData = data.ValidationData || data.secret_key;
        this.expiryDate = data.ExpiryDate || data.qr_expiry_date;
    }

    async generateQrCode() {
        try {
            this.qrCodeImage = await QRCode.toDataURL(this.validationData);
            return this.qrCodeImage;
        } catch (e) {
            console.error("QR Generation Error:", e);
            return null;
        }
    }

    validateQrcode(scannedCode) {
        if (this.expiryDate && new Date() > new Date(this.expiryDate)) {
            return false;
        }
        return this.validationData === scannedCode;
    }
}

module.exports = QrCode;

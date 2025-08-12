import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const GeneratePassQR = ({ businessId, customerEmail }) => {
  const backendBaseUrl = " https://b6f14b660ca9.ngrok-free.app"; // <-- Your backend ngrok URL

  const qrValue = `${backendBaseUrl}/api/pass/${businessId}/${customerEmail}`;

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h4>Scan to Add Loyalty Card</h4>
      <QRCodeSVG value={qrValue} size={200} />
      <p style={{ marginTop: '1rem', wordBreak: 'break-word' }}>{qrValue}</p>
    </div>
  );
};

export default GeneratePassQR;

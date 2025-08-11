import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const GeneratePassQR = ({ businessId, customerEmail }) => {
  const passLink = '  https://60640c05611c.ngrok-free.app/api/pass/${businessId}/${customerEmail}';

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h4>Scan to Add Loyalty Card</h4>
      <QRCodeSVG value={passLink} size={200} />
      <p style={{ marginTop: '1rem', wordBreak: 'break-word' }}>{passLink}</p>
    </div>
  );
};

export default GeneratePassQR;

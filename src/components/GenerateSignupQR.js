import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';

const GenerateSignupQR = () => {
  const [businessId, setBusinessId] = useState('');
  const [signupUrl, setSignupUrl] = useState('');

  useEffect(() => {
    const fetchBusinessId = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const data = userDoc.data();

      if (data && data.businessId) {
        setBusinessId(data.businessId);

        // Replace with your actual local IP address (not localhost!)
        const ip = ' https://b6f14b660ca9.ngrok-free.app'; 
        setSignupUrl(`${ip}/join/${data.businessId}`);
      }
    };

    fetchBusinessId();
  }, []);

  if (!signupUrl) return null;

  return (
    <div style={{ marginTop: '3rem', textAlign: 'center' }}>
      <h4>Customer Signup QR</h4>
      <p>Display this QR at reception for customers to join your loyalty program:</p>
      <QRCodeSVG value={signupUrl} size={200} />
      <p style={{ fontSize: '0.8rem', wordBreak: 'break-word', marginTop: '1rem' }}>{signupUrl}</p>
    </div>
  );
};

export default GenerateSignupQR;

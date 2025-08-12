import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';

const CustomerSignup = () => {
  const { businessId } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
        await addDoc(collection(db, 'customers'), {
        ...formData,
        businessId,
        createdAt: serverTimestamp()
        });

        const localServer = ' https://b6f14b660ca9.ngrok-free.app'; // Replace with your actual IP
        window.location.href = `${localServer}/api/pass/${businessId}/${formData.email}`;
    } catch (err) {
        console.error('❌ Failed to save customer:', err.message);
    }
};


  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      {!submitted ? (
        <>
          <h3>Join Our Loyalty Program</h3>
          <form onSubmit={handleSubmit}>
            <label>Name:</label>
            <input name="name" onChange={handleChange} required />

            <label>Email:</label>
            <input name="email" type="email" onChange={handleChange} required />

            <label>Phone:</label>
            <input name="phone" type="tel" onChange={handleChange} required />

            <label>Birthday:</label>
            <input name="birthday" type="date" onChange={handleChange} required />

            <button type="submit" style={{ marginTop: '1rem' }}>Add My Loyalty Card</button>
          </form>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <h4>You're all set!</h4>
          <p>Scan this QR to add your loyalty card:</p>
          <QRCodeSVG value={qrUrl} size={200} />
          <p style={{ wordBreak: 'break-word', fontSize: '0.8rem' }}>{qrUrl}</p>
        </div>
      )}
    </div>
  );
};

export default CustomerSignup;

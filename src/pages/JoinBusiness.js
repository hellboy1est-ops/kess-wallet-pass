import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const JoinBusiness = () => {
  const { businessId } = useParams();
  const [form, setForm] = useState({ name: '', email: '', contact: '', birthday: '' });
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await addDoc(collection(db, 'customers'), {
      ...form,
      businessId,
      stamps: 0,
      createdAt: serverTimestamp()
    });

    setSuccess('Thank you! You can now add your loyalty card.');
    // Optionally redirect to `/api/pass/:businessId/:email`
    window.location.href = '  https://60640c05611c.ngrok-free.app/api/pass/${businessId}/${form.email}';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Join Our Loyalty Program</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Your Name" required onChange={handleChange} /><br /><br />
        <input name="email" type="email" placeholder="Email" required onChange={handleChange} /><br /><br />
        <input name="contact" placeholder="Phone Number" required onChange={handleChange} /><br /><br />
        <input name="birthday" type="date" required onChange={handleChange} /><br /><br />
        <button type="submit">Join & Add Card</button>
      </form>
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
};

export default JoinBusiness;

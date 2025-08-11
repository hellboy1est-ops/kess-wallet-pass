import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import AddBusinessForm from '../components/AddBusinessForm';
import GeneratePassQR from '../components/GeneratePassQR';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/admin');
    } catch (err) {
      console.error("Logout failed:", err.message);
    }
  };

  // TEMP: Static test businessId and email (replace later with real values)
  const testBusinessId = 'memHPZaG9XfaYNSTcJzP';     // 🔁 Replace with real business doc ID
  const testCustomerEmail = 'test@example.com';        // Can be dynamic later

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Welcome to the Admin Dashboard</h2>
      <button onClick={handleLogout} style={{ float: 'right' }}>
        Logout
      </button>

      <AddBusinessForm />

      {/* Display QR code to test wallet pass */}
      <div style={{ marginTop: '4rem' }}>
        <h3>Preview Wallet Pass</h3>
        <GeneratePassQR businessId={testBusinessId} customerEmail={testCustomerEmail} />
        <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
          Scan this QR code on your iPhone to test adding a digital loyalty card.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;

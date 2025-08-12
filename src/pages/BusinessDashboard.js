import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import GenerateSignupQR from '../components/GenerateSignupQR';
import { query, where, getDocs } from 'firebase/firestore';

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState('');


  // 🔐 Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/business');
    } catch (err) {
      console.error('Logout failed:', err.message);
    }
  };

  // 🔍 Fetch business info on load
  useEffect(() => {
  const fetchBusinessData = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/business');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const data = userDoc.data();

      if (data?.role === 'business') {
        const bizId = data.businessId;
        setBusinessId(bizId);

        const businessDoc = await getDoc(doc(db, 'businesses', bizId));
        if (businessDoc.exists()) {
          setBusinessName(businessDoc.data().name);
        }

        // 🧑‍💼 Fetch customers for this business
        const q = query(collection(db, 'customers'), where('businessId', '==', bizId));
        const snapshot = await getDocs(q);
        const customerList = snapshot.docs.map(doc => doc.data());
        setCustomers(customerList);
      } else {
        setError('Access denied.');
        navigate('/business');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load business info.');
    }
  };

  fetchBusinessData();
}, [navigate]);


  // 🧾 Issue stamp
  const handleStamp = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setQrUrl('');

    if (!customerEmail || !businessId) return;

    try {
      await addDoc(collection(db, 'stamps'), {
        customerEmail,
        businessId,
        issuedAt: serverTimestamp(),
        issuedBy: auth.currentUser.uid,
      });

      setSuccess(`Stamp issued to ${customerEmail}`);

      // Generate the QR URL after issuing stamp
      const serverBase = ''; // ← Replace with actual IP for real QR
      setQrUrl(`${serverBase}/api/pass/${businessId}/${customerEmail}`);
    } catch (err) {
      console.error(err);
      setError('Error issuing stamp: ' + err.message);
    }
  };
const handleStampForRegistered = async (email) => {
  setSuccess('');
  setError('');

  try {
    const response = await fetch(` https://b6f14b660ca9.ngrok-free.app/api/stamp/${businessId}/${email}`, {
      method: 'POST',
    });

    const result = await response.json();
    if (result.success) {
      setSuccess(`Stamp issued to ${email}`);
    } else {
      setError('Stamp issue failed.');
    }

    setSelectedCustomerEmail('');
  } catch (err) {
    console.error(err);
    setError('Error issuing stamp: ' + err.message);
  }
};


//   // 📲 Push notification to customer device
// const pushToken = customerData.pushToken;
// if (pushToken) {
//   const options = {
//     hostname: 'api.push.apple.com',
//     port: 443,
//     path: `/3/device/${pushToken}`,
//     method: 'POST',
//     headers: {
//       'apns-topic': business.passTypeIdentifier
//     }
//   };

//   const pushReq = https.request(options, pushRes => {
//     console.log(`📲 APNs response: ${pushRes.statusCode}`);
//   });

//   pushReq.on('error', err => {
//     console.error('❌ APNs push failed:', err);
//   });

//   pushReq.end();
// }


  return (
    <div style={{ padding: '2rem' }}>
      <h2>{businessName} Dashboard</h2>
      <GenerateSignupQR />
      <p>Logged in as: {auth.currentUser?.email}</p>
      <button
        onClick={handleLogout}
        style={{ float: 'right', marginBottom: '1rem' }}
      >
        Logout
      </button>
      <hr />

      {/* <h3>Issue a Stamp + Generate Pass</h3>
      <form onSubmit={handleStamp}>
        <label>Customer Email:</label>
        <br />
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          required
        />
        <br />
        <br />
        <button type="submit">Issue Stamp & Show QR</button>
      </form> */}

      {/* <hr style={{ margin: '2rem 0' }} /> */}
    <h3>Issue Stamp to a Registered Customer</h3>

    <label>Select a customer:</label>
    <br />
    <select
      value={selectedCustomerEmail}
      onChange={(e) => setSelectedCustomerEmail(e.target.value)}
    >
      <option value="">-- Select --</option>
      {customers.map((c) => (
        <option key={c.email} value={c.email}>
          {c.name} ({c.email})
        </option>
      ))}
    </select>

    <br /><br />
    <button
      disabled={!selectedCustomerEmail}
      onClick={() => handleStampForRegistered(selectedCustomerEmail)}
    >
      Issue Stamp
    </button>


      {success && <p style={{ color: 'green' }}>{success}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* 🎟️ Show QR after successful stamp */}
      {qrUrl && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <QRCodeSVG value={qrUrl} size={200} />
          <p style={{ wordBreak: 'break-word' }}>{qrUrl}</p>
          <p>Scan to add loyalty card to Apple Wallet</p>
        </div>
      )}
    </div>
  );
};

export default BusinessDashboard;

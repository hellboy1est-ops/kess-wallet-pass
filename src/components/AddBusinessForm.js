import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AddBusinessForm = () => {
  const [businessName, setBusinessName] = useState('');
  const [themeColor, setThemeColor] = useState('#2196f3');
  const [rewardRule, setRewardRule] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleAddBusiness = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      // 1. Create Firebase Auth user for business login
      const userCredential = await createUserWithEmailAndPassword(auth, businessEmail, "123456");
      const businessUserId = userCredential.user.uid;

      // 2. Add business to `businesses` collection
      const businessRef = await addDoc(collection(db, 'businesses'), {
        name: businessName,
        color: themeColor,
        rewardRule: rewardRule,
        logoUrl: logoUrl || null,
        createdAt: serverTimestamp(),

        // 🔽 Add pass-related config fields
        passTypeIdentifier: 'pass.com.kess.loyalty.v2',
        teamIdentifier: '2WX6VQAPH3',
        logoText: businessName + ' Loyalty',
        promoMessage: rewardRule,
        logoPath: `businessAssets/${businessName.toLowerCase().replace(/\s+/g, '-')}/logo.png`,
        iconPath: `businessAssets/${businessName.toLowerCase().replace(/\s+/g, '-')}/icon.png`
    });


      // 3. Save user in `users` collection with role and link to businessId
      await setDoc(doc(db, 'users', businessUserId), {
        uid: businessUserId,
        email: businessEmail,
        role: 'business',
        businessId: businessRef.id
      });

      setSuccessMessage('Business and login created successfully!');
      setBusinessName('');
      setThemeColor('#2196f3');
      setRewardRule('');
      setLogoUrl('');
      setBusinessEmail('');
    } catch (err) {
      console.error(err);
      setError('Failed to add business: ' + err.message);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3>Add a New Business</h3>
      <form onSubmit={handleAddBusiness}>
        <label>Business Name:</label><br />
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
        /><br /><br />

        <label>Brand Color:</label><br />
        <input
          type="color"
          value={themeColor}
          onChange={(e) => setThemeColor(e.target.value)}
        /><br /><br />

        <label>Reward Rule:</label><br />
        <input
          type="text"
          value={rewardRule}
          placeholder="e.g. Collect 5 stamps, get 1 free"
          onChange={(e) => setRewardRule(e.target.value)}
          required
        /><br /><br />

        <label>Logo URL (optional):</label><br />
        <input
          type="text"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        /><br /><br />

        <label>Business Login Email:</label><br />
        <input
          type="email"
          value={businessEmail}
          onChange={(e) => setBusinessEmail(e.target.value)}
          required
        /><br /><br />

        <p><i>Temporary password will be set to: <strong>123456</strong></i></p>

        <button type="submit">Add Business</button>
      </form>

      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default AddBusinessForm;

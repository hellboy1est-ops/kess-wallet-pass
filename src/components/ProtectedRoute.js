// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute({ children, requireRole }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      // No role required → allow
      if (!requireRole) {
        setAllowed(true);
        setLoading(false);
        return;
      }

      // Load role from Firestore: users/{uid}.role
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.exists() ? snap.data().role : null;
        setAllowed(role === requireRole);
      } catch (e) {
        console.warn('Role check failed:', e?.message || e);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => { cancelled = true; unsub(); };
  }, [requireRole]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '3px solid #e3ebf5', borderTopColor: '#1f7aec',
          animation: 'spin .9s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!allowed) {
    // Send to appropriate login if role is enforced, else admin by default
    const fallback = requireRole === 'business' ? '/business' : '/admin';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
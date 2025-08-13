import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import './BusinessDashboard.css';

const API_BASE =
  process.env.REACT_APP_API_BASE || 'https://b6f14b660ca9.ngrok-free.app'; // your kess-wallet-pass server

export default function BusinessDashboard() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState('');
  const [business, setBusiness] = useState(null);
  const [loadingBiz, setLoadingBiz] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [search, setSearch] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [issuing, setIssuing] = useState(null); // email being stamped
  const [toast, setToast] = useState(null); // {type:'success'|'error', msg:string}

  // ---------- Auth gate + business load ----------
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/business');
      return;
    }

    (async () => {
      try {
        // find the user's role + businessId
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'business') {
          navigate('/business');
          return;
        }
        const bizId = userDoc.data().businessId;
        setBusinessId(bizId);

        const bizSnap = await getDoc(doc(db, 'businesses', bizId));
        if (bizSnap.exists()) setBusiness(bizSnap.data());
      } catch (e) {
        console.error(e);
        setToast({ type: 'error', msg: 'Failed to load business' });
      } finally {
        setLoadingBiz(false);
      }
    })();
  }, [navigate]);

  // ---------- Live customers for this business ----------
  useEffect(() => {
    if (!businessId) return;
    const q = query(
      collection(db, 'customers'),
      where('businessId', '==', businessId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = [];
        snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        // normalize for display
        rows.sort((a, b) =>
          (a.name || a.email || '').localeCompare(b.name || b.email || '')
        );
        setCustomers(rows);
        setLoadingCustomers(false);
      },
      (err) => {
        console.error(err);
        setToast({ type: 'error', msg: 'Failed to load customers' });
        setLoadingCustomers(false);
      }
    );
    return () => unsub();
  }, [businessId]);

  // ---------- Derived stats ----------
  const stats = useMemo(() => {
    const active = customers.length;
    const totalStamps = customers.reduce((sum, c) => sum + (c.stamps || 0), 0);
    return { active, totalStamps };
  }, [customers]);

  // ---------- Actions ----------
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/business');
    } catch (err) {
      console.error('Logout failed:', err);
      setToast({ type: 'error', msg: 'Logout failed' });
    }
  };

  const joinUrl = businessId
    ? `${API_BASE}/join/${businessId}`
    : '';

  const copyJoin = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setToast({ type: 'success', msg: 'Join link copied!' });
    } catch {
      setToast({ type: 'error', msg: 'Copy failed' });
    }
  };

  const issueStamp = async (email) => {
    setIssuing(email);
    try {
      // Optimistic UI
      setCustomers((prev) =>
        prev.map((c) =>
          (c.email || '').toLowerCase() === email.toLowerCase()
            ? { ...c, stamps: (c.stamps || 0) + 1 }
            : c
        )
      );

      const res = await fetch(
        `${API_BASE}/api/stamp/${businessId}/${encodeURIComponent(email)}`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(await res.text());

      setToast({ type: 'success', msg: `Stamp issued to ${email}` });
    } catch (e) {
      console.error(e);
      // rollback
      setCustomers((prev) =>
        prev.map((c) =>
          (c.email || '').toLowerCase() === email.toLowerCase()
            ? { ...c, stamps: Math.max((c.stamps || 1) - 1, 0) }
            : c
        )
      );
      setToast({ type: 'error', msg: 'Failed to issue stamp' });
    } finally {
      setIssuing(null);
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s);
    });
  }, [search, customers]);

  // ---------- UI ----------
  if (loadingBiz) {
    return <div className="bd-shell"><div className="bd-loader" /></div>;
  }

  if (!business) {
    return (
      <div className="bd-shell">
        <div className="bd-card">
          <h2>Business not found</h2>
          <button className="btn" onClick={() => navigate('/business')}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bd-shell">
      <header className="bd-header">
        <div className="bd-title">
          <div className="bd-logo" style={{ backgroundColor: business.color || '#111' }}>
            {(business.name || 'Business').slice(0, 1)}
          </div>
          <div>
            <h1>{business.name}</h1>
            <div className="bd-sub">Business Dashboard</div>
          </div>
        </div>

        <div className="bd-actions">
          <button className="btn ghost" onClick={() => setQrOpen(true)}>Show Join QR</button>
          <button className="btn" onClick={copyJoin}>Copy Join Link</button>
          <button className="btn danger" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <section className="bd-stats">
        <StatCard label="Active Customers" value={stats.active} />
        <StatCard label="Total Stamps" value={stats.totalStamps} />
        <StatCard label="Goal per Reward" value={business.goalStamps || 10} />
      </section>

      <section className="bd-panel">
        <div className="bd-panel-head">
          <h2>Customers</h2>
          <input
            className="bd-search"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bd-table-wrap">
          <table className="bd-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th className="hide-sm">Phone</th>
                <th className="center">Stamps</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingCustomers ? (
                <tr><td colSpan="5"><div className="row-loader" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="muted center">No customers yet. Share your join QR or link.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td className="hide-sm">{c.phone || '—'}</td>
                    <td className="center">
                      <Badge>{c.stamps ?? 0}</Badge>
                    </td>
                    <td className="right">
                      <button
                        className="btn small"
                        disabled={issuing === (c.email || '').toLowerCase()}
                        onClick={() => issueStamp((c.email || '').toLowerCase())}
                        title="Issue one stamp"
                      >
                        {issuing === (c.email || '').toLowerCase() ? 'Issuing…' : 'Issue Stamp'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* QR Modal */}
      {qrOpen && (
        <div className="bd-modal" onClick={() => setQrOpen(false)}>
          <div className="bd-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Join & Add to Wallet</h3>
            <p className="muted">Ask customers to scan this QR on their iPhone.</p>
            <div className="qr-wrap">
              {joinUrl && <QRCodeCanvas value={joinUrl} size={240} includeMargin />}
            </div>
            <div className="qr-link">{joinUrl}</div>
            <div className="modal-actions">
              <button className="btn" onClick={copyJoin}>Copy Link</button>
              <button className="btn ghost" onClick={() => setQrOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`bd-toast ${toast.type}`} onAnimationEnd={() => setToast(null)}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ---------- Small UI bits ---------- */

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Badge({ children }) {
  return <span className="bd-badge">{children}</span>;
}
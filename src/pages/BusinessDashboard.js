import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import './BusinessDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://b6f14b660ca9.ngrok-free.app';

export default function BusinessDashboard() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState('');
  const [business, setBusiness] = useState(null);
  const [loadingBiz, setLoadingBiz] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [search, setSearch] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [issuing, setIssuing] = useState(null);
  const [toast, setToast] = useState(null);

  // details drawer
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // -------- Auth + business --------
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/business'); return; }

    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'business') {
          navigate('/business'); return;
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

  // -------- Customers (live) --------
  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(db, 'customers'), where('businessId', '==', businessId));
    const unsub = onSnapshot(q, snap => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a,b) => (a.name||a.email||'').localeCompare(b.name||b.email||''));
      setCustomers(arr);
      setLoadingCustomers(false);
    }, err => {
      console.error(err);
      setToast({ type: 'error', msg: 'Failed to load customers' });
      setLoadingCustomers(false);
    });
    return () => unsub();
  }, [businessId]);

  // -------- Stats --------
  const stats = useMemo(() => {
    const active = customers.length;
    const totalStamps = customers.reduce((s,c)=> s + (c.stamps||0), 0);
    return { active, totalStamps };
  }, [customers]);

  // -------- Actions --------
  const handleLogout = async () => {
    try { await signOut(auth); navigate('/business'); }
    catch (e) { console.error(e); setToast({ type:'error', msg:'Logout failed' }); }
  };

  const joinUrl = businessId ? `${API_BASE.replace(/\/$/,'')}/join/${businessId}` : '';
  const copyJoin = async () => {
    try { await navigator.clipboard.writeText(joinUrl); setToast({ type:'success', msg:'Join link copied!' }); }
    catch { setToast({ type:'error', msg:'Copy failed' }); }
  };

  const issueStamp = async (email) => {
    setIssuing(email);
    try {
      // optimistic
      setCustomers(prev => prev.map(c => (c.email||'').toLowerCase()===email.toLowerCase()
        ? { ...c, stamps:(c.stamps||0)+1 } : c));

      const res = await fetch(`${API_BASE.replace(/\/$/,'')}/api/stamp/${businessId}/${encodeURIComponent(email)}`, { method:'POST' });
      if (!res.ok) throw new Error(await res.text());
      setToast({ type:'success', msg:`Stamp issued to ${email}` });
    } catch (e) {
      console.error(e);
      // rollback
      setCustomers(prev => prev.map(c => (c.email||'').toLowerCase()===email.toLowerCase()
        ? { ...c, stamps: Math.max((c.stamps||1)-1, 0) } : c));
      setToast({ type:'error', msg:'Failed to issue stamp' });
    } finally {
      setIssuing(null);
    }
  };

  // -------- Details drawer open --------
  const openDetails = (customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  // Load events for selected customer (live)
  useEffect(() => {
    if (!detailsOpen || !selectedCustomer || !businessId) return;
    setLoadingEvents(true);
    // events keyed by businessId + email (simple & scalable)
    const q = query(
      collection(db, 'events'),
      where('businessId', '==', businessId),
      where('email', '==', (selectedCustomer.email||'').toLowerCase()),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(q, snap => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setEvents(arr);
      setLoadingEvents(false);
    }, err => {
      console.error(err);
      setLoadingEvents(false);
    });
    return () => unsub();
  }, [detailsOpen, selectedCustomer, businessId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(c => {
      const name = (c.name||'').toLowerCase();
      const email = (c.email||'').toLowerCase();
      const phone = (c.phone||'').toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s);
    });
  }, [search, customers]);

  if (loadingBiz) return <div className="bd-shell"><div className="bd-loader"/></div>;

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

  const goal = business.goalStamps || 10;

  return (
    <div className="bd-shell">
      <header className="bd-header">
        <div className="bd-title">
          <div className="bd-logo" style={{ backgroundColor: business.color || '#111' }}>
            {(business.name||'B').slice(0,1)}
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
        <StatCard label="Active Customers" value={stats.active}/>
        <StatCard label="Total Stamps" value={stats.totalStamps}/>
        <StatCard label="Goal per Reward" value={goal}/>
      </section>

      <section className="bd-panel">
        <div className="bd-panel-head">
          <h2>Customers</h2>
          <input
            className="bd-search"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
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
                <tr><td colSpan="5"><div className="row-loader"/></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="muted center">No customers yet. Share your join QR or link.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td>{c.name || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td className="hide-sm">{c.phone || '—'}</td>
                  <td className="center"><Badge>{c.stamps ?? 0}</Badge></td>
                  <td className="right">
                    <div className="btn-row">
                      <button
                        className="btn small ghost"
                        onClick={() => openDetails(c)}
                        title="View details"
                      >View</button>
                      <button
                        className="btn small"
                        disabled={issuing === (c.email||'').toLowerCase()}
                        onClick={() => issueStamp((c.email||'').toLowerCase())}
                        title="Issue one stamp"
                      >{issuing === (c.email||'').toLowerCase() ? 'Issuing…' : 'Issue Stamp'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Join QR modal */}
      {qrOpen && (
        <div className="bd-modal" onClick={()=>setQrOpen(false)}>
          <div className="bd-modal-card" onClick={(e)=>e.stopPropagation()}>
            <h3>Join & Add to Wallet</h3>
            <p className="muted">Ask customers to scan this QR on their iPhone.</p>
            <div className="qr-wrap">
              {joinUrl && <QRCodeCanvas value={joinUrl} size={240} includeMargin />}
            </div>
            <div className="qr-link">{joinUrl}</div>
            <div className="modal-actions">
              <button className="btn" onClick={copyJoin}>Copy Link</button>
              <button className="btn ghost" onClick={()=>setQrOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Drawer */}
      {detailsOpen && selectedCustomer && (
        <DetailsDrawer
          customer={selectedCustomer}
          business={business}
          goal={goal}
          events={events}
          loadingEvents={loadingEvents}
          onClose={()=>setDetailsOpen(false)}
        />
      )}

      {toast && (
        <div className={`bd-toast ${toast.type}`} onAnimationEnd={()=>setToast(null)}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

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

/* ---------------- Details Drawer Component ---------------- */

function DetailsDrawer({ customer, business, goal, events, loadingEvents, onClose }) {
  const fmt = (ts) => {
    if (!ts) return '—';
    // firestore Timestamp or Date or number
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts instanceof Date) return ts.toLocaleString();
    if (typeof ts === 'number') return new Date(ts).toLocaleString();
    return String(ts);
  };

  // derive reward counts if you don't store them yet
  const stamps = customer.stamps || 0;
  const rewardsEarned = customer.rewardsEarned ?? Math.floor(stamps / goal);
  const rewardsRedeemed = customer.rewardsRedeemed ?? 0;

  const cardStatus = customer.pushToken ? 'Installed' : 'Not installed';

  return (
    <div className="bd-drawer" onClick={onClose}>
      <div className="bd-drawer-card" onClick={(e)=>e.stopPropagation()}>
        <div className="drawer-head">
          <h3>Customer Details</h3>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>

        {/* Overview */}
        <div className="drawer-grid">
          <InfoBlock label="Name" value={customer.name || '—'} />
          <InfoBlock label="Email" value={customer.email || '—'} />
          <InfoBlock label="Phone" value={customer.phone || '—'} />
          <InfoBlock label="Card Status" value={cardStatus} />
          <InfoBlock label="Signed Up" value={fmt(customer.createdAt)} />
          <InfoBlock label="Stamps Earned" value={stamps} />
          <InfoBlock label="Rewards Earned" value={rewardsEarned} />
          <InfoBlock label="Rewards Redeemed" value={rewardsRedeemed} />
          <InfoBlock label="Last Stamp" value={fmt(customer.lastStampAt)} />
          <InfoBlock label="Last Reward Earned" value={fmt(customer.lastRewardEarnedAt)} />
          <InfoBlock label="Last Reward Redeemed" value={fmt(customer.lastRewardRedeemedAt)} />
        </div>

        {/* Personal */}
        <h4 className="section-title">Personal Info</h4>
        <div className="drawer-grid">
          <InfoBlock label="Name" value={customer.name || '—'} />
          <InfoBlock label="Email" value={customer.email || '—'} />
          <InfoBlock label="Phone" value={customer.phone || '—'} />
          <InfoBlock label="Birthday" value={customer.birthday || '—'} />
          {customer.deviceLibraryIdentifier && (
            <InfoBlock label="Device ID" value={customer.deviceLibraryIdentifier} mono />
          )}
        </div>

        {/* Activity */}
        <h4 className="section-title">Activity</h4>
        <div className="timeline">
          {loadingEvents ? (
            <div className="row-loader" />
          ) : events.length === 0 ? (
            <div className="muted">No recent activity.</div>
          ) : (
            <ul>
              {events.map(ev => (
                <li key={ev.id}>
                  <span className={`pill ${pillColor(ev.type)}`}>{labelFor(ev.type)}</span>
                  <div className="tl-main">
                    <div className="tl-title">{ev.note || prettyTitle(ev)}</div>
                    <div className="tl-meta">{new Date(ev.createdAt?.toDate?.() ?? ev.createdAt).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, mono }) {
  return (
    <div className="info-block">
      <div className="info-label">{label}</div>
      <div className={`info-value ${mono ? 'mono' : ''}`}>{value}</div>
    </div>
  );
}

function labelFor(type) {
  switch (type) {
    case 'wallet_added': return 'Wallet Added';
    case 'stamp_issued': return 'Stamp';
    case 'reward_earned': return 'Reward Earned';
    case 'reward_redeemed': return 'Reward Redeemed';
    default: return type || 'Event';
  }
}
function pillColor(type) {
  switch (type) {
    case 'wallet_added': return 'blue';
    case 'stamp_issued': return 'brand';
    case 'reward_earned': return 'green';
    case 'reward_redeemed': return 'purple';
    default: return 'muted';
  }
}
function prettyTitle(ev) {
  if (ev.type === 'stamp_issued') return `Stamp issued (${ev.delta || '+1'})`;
  if (ev.type === 'reward_earned') return `🎉 Reward unlocked at ${ev.stampsAt || ''} stamps`;
  if (ev.type === 'reward_redeemed') return `✅ Reward redeemed`;
  if (ev.type === 'wallet_added') return `Pass added to Wallet`;
  return ev.type;
}
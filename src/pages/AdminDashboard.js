import React, { useEffect, useMemo, useState } from 'react';
import './AdminDashboard.css';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';

const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, ''); // e.g. https://<ngrok>/api/passes
const BACKEND_BASE = API_BASE.replace(/\/api\/passes$/, ''); // root of kess-wallet-pass backend

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  // form state
  const [form, setForm] = useState({
    name: '',
    color: '#1f7aec',
    goalStamps: 10,
    promoMessage: '',
    logoUrl: '',
    passTypeIdentifier: '', // e.g. pass.com.kess.loyalty.v2
    teamIdentifier: '',      // e.g. 2WX6VQAPH3
    businessEmail: '',
    tempPassword: '123456',
  });
  const [creating, setCreating] = useState(false);

  // business list
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState('');
  const [qrBusiness, setQrBusiness] = useState(null); // to show join QR
  const [viewBusiness, setViewBusiness] = useState(null);

  // --------- auth gate (admin only) ----------
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/admin');
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists() || snap.data().role !== 'admin') {
          navigate('/admin');
        }
      } catch {
        navigate('/admin');
      }
    })();
  }, [navigate]);

  // --------- live businesses list ----------
  useEffect(() => {
    const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setBusinesses(arr);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return businesses;
    return businesses.filter((b) =>
      (b.name || '').toLowerCase().includes(s) ||
      (b.promoMessage || '').toLowerCase().includes(s) ||
      (b.passTypeIdentifier || '').toLowerCase().includes(s)
    );
  }, [search, businesses]);

  const showToast = (type, msg) => setToast({ type, msg });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/admin');
    } catch (e) {
      showToast('error', 'Logout failed');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    if (!form.name) return 'Business name is required';
    if (!/^pass\./.test(form.passTypeIdentifier || '')) {
      return 'Pass Type Identifier must start with "pass." (e.g., pass.com.brand.loyalty)';
    }
    if (!form.teamIdentifier) return 'Team Identifier is required';
    if (!form.businessEmail) return 'Business login email is required';
    if (!/^\S+@\S+\.\S+$/.test(form.businessEmail)) return 'Business email looks invalid';
    if (!API_BASE) return 'REACT_APP_API_URL is missing; set it to your ngrok base + /api/passes';
    return null;
    // NOTE: logoUrl optional; color & goal have sane defaults
  };

  /**
   * Create business (Firestore) + Create login user via backend (Admin SDK)
   */
  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast('error', err);
      return;
    }
    setCreating(true);
    try {
      // 1) Create business doc (Firestore)
      const bizRef = await addDoc(collection(db, 'businesses'), {
        name: form.name,
        color: form.color,
        goalStamps: Number(form.goalStamps) || 10,
        promoMessage: form.promoMessage || '',
        logoUrl: form.logoUrl || '',
        passTypeIdentifier: form.passTypeIdentifier,
        teamIdentifier: form.teamIdentifier,
        createdAt: serverTimestamp(),
      });

      // 2) Call backend to create business auth user (does NOT sign you out)
      const res = await fetch(`${BACKEND_BASE}/api/admin/createBusinessUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizRef.id,
          email: form.businessEmail.trim(),
          password: form.tempPassword || '123456',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Create user failed');
      }

      showToast('success', 'Business created! Login user provisioned.');
      setForm({
        name: '',
        color: '#1f7aec',
        goalStamps: 10,
        promoMessage: '',
        logoUrl: '',
        passTypeIdentifier: '',
        teamIdentifier: form.teamIdentifier, // keep team id for faster entry
        businessEmail: '',
        tempPassword: '123456',
      });
    } catch (e) {
      console.error(e);
      showToast('error', e.message || 'Failed to create business');
    } finally {
      setCreating(false);
    }
  };

  const joinUrlFor = (bizId) => `${BACKEND_BASE}/join/${bizId}`;
  const copyJoin = async (bizId) => {
    try {
      await navigator.clipboard.writeText(joinUrlFor(bizId));
      showToast('success', 'Join link copied!');
    } catch {
      showToast('error', 'Copy failed');
    }
  };

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <h1>Admin Dashboard</h1>
        <div className="spacer" />
        <button className="btn danger" onClick={handleLogout}>Logout</button>
      </header>

      <section className="adm-grid">
        {/* Create business */}
        <div className="adm-card">
          <h2>Create a New Business</h2>
          <form className="adm-form" onSubmit={handleCreateBusiness}>
            <div className="grid-2">
              <Field label="Business Name" required>
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. KESS Hair & Beauty" required />
              </Field>

              <Field label="Brand Color">
                <div className="color-row">
                  <input name="color" value={form.color} onChange={handleChange} />
                  <input type="color" value={form.color} onChange={(e)=>setForm((f)=>({...f, color: e.target.value}))} />
                </div>
              </Field>

              <Field label="Goal (stamps per reward)" required>
                <input type="number" min="1" name="goalStamps" value={form.goalStamps} onChange={handleChange} required />
              </Field>

              <Field label="Promo Message">
                <input name="promoMessage" value={form.promoMessage} onChange={handleChange} placeholder="Only 3 more stamps until a free cut!" />
              </Field>

              <Field label="Logo URL">
                <input name="logoUrl" value={form.logoUrl} onChange={handleChange} placeholder="https://…" />
              </Field>

              <Field label="Pass Type Identifier" hint="Starts with pass., e.g. pass.com.brand.loyalty" required>
                <input name="passTypeIdentifier" value={form.passTypeIdentifier} onChange={handleChange} placeholder="pass.com.kess.loyalty.v2" required />
              </Field>

              <Field label="Team Identifier" hint="Your Apple Developer Team ID" required>
                <input name="teamIdentifier" value={form.teamIdentifier} onChange={handleChange} placeholder="2WX6VQAPH3" required />
              </Field>

              <Field label="Business Login Email" required>
                <input type="email" name="businessEmail" value={form.businessEmail} onChange={handleChange} placeholder="owner@business.co.nz" required />
              </Field>

              <Field label="Temporary Password">
                <input name="tempPassword" value={form.tempPassword} onChange={handleChange} />
              </Field>
            </div>

            <div className="form-actions">
              <button className="btn" disabled={creating} type="submit">
                {creating ? 'Creating…' : 'Create Business'}
              </button>
            </div>
          </form>
        </div>

        {/* Business list */}
        <div className="adm-card">
          <div className="card-head">
            <h2>Businesses</h2>
            <input className="search" placeholder="Search businesses…" value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>

          <div className="table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Pass Type ID</th>
                  <th>Goal</th>
                  <th>Promo</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="5" className="muted center">No businesses yet.</td></tr>
                ) : filtered.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="biz-cell">
                        <span className="biz-dot" style={{ background:b.color || '#1f7aec' }} />
                        <div className="biz-main">
                          <div className="biz-name">{b.name}</div>
                          <div className="biz-sub">{b.teamIdentifier}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{b.passTypeIdentifier}</td>
                    <td>{b.goalStamps || 10}</td>
                    <td className="truncate" title={b.promoMessage || ''}>{b.promoMessage || '—'}</td>
                    <td className="right">
                      <div className="btn-row">
                        <button className="btn small ghost" onClick={()=>setViewBusiness(b)}>View</button>
                        <button className="btn small" onClick={()=>setQrBusiness(b)}>Show QR</button>
                        <button className="btn small ghost" onClick={()=>copyJoin(b.id)}>Copy Join Link</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Join QR modal */}
      {qrBusiness && (
        <div className="adm-modal" onClick={()=>setQrBusiness(null)}>
          <div className="adm-modal-card" onClick={(e)=>e.stopPropagation()}>
            <h3>Join & Add to Wallet</h3>
            <p className="muted">Ask customers to scan this on iPhone.</p>
            <div className="qr-wrap">
              <QRCodeCanvas value={`${BACKEND_BASE}/join/${qrBusiness.id}`} size={240} includeMargin />
            </div>
            <div className="qr-link">{`${BACKEND_BASE}/join/${qrBusiness.id}`}</div>
            <div className="modal-actions">
              <button className="btn" onClick={()=>copyJoin(qrBusiness.id)}>Copy Link</button>
              <button className="btn ghost" onClick={()=>setQrBusiness(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Business quick view */}
      {viewBusiness && (
        <div className="adm-modal" onClick={()=>setViewBusiness(null)}>
          <div className="adm-modal-card" onClick={(e)=>e.stopPropagation()}>
            <h3>{viewBusiness.name}</h3>
            <div className="view-grid">
              <Info label="Pass Type ID" value={viewBusiness.passTypeIdentifier} mono/>
              <Info label="Team ID" value={viewBusiness.teamIdentifier} mono/>
              <Info label="Goal Stamps" value={viewBusiness.goalStamps || 10}/>
              <Info label="Promo" value={viewBusiness.promoMessage || '—'}/>
              <Info label="Logo URL" value={viewBusiness.logoUrl || '—'} mono/>
              <Info label="Color" value={viewBusiness.color || '—'} />
            </div>
            <div className="modal-actions">
              <a className="btn ghost" href={`${BACKEND_BASE}/join/${viewBusiness.id}`} target="_blank" rel="noreferrer">Open Join Page</a>
              <button className="btn" onClick={()=>copyJoin(viewBusiness.id)}>Copy Join Link</button>
              <button className="btn danger" onClick={()=>setViewBusiness(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`adm-toast ${toast.type}`} onAnimationEnd={()=>setToast(null)}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="field">
      <div className="field-head">
        <span>{label}{required && <span className="req">*</span>}</span>
        {hint && <span className="hint">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Info({ label, value, mono }) {
  return (
    <div className="info">
      <div className="info-label">{label}</div>
      <div className={`info-value ${mono ? 'mono' : ''}`}>{value}</div>
    </div>
  );
}
// ══════════════════════════════════════════════════════
//  Zinc Bank — Frontend Application
//  Connects to Node.js + Express + MongoDB Atlas API
//  Falls back to mock data when API unavailable
// ══════════════════════════════════════════════════════

/* ── MOCK DATA (fallback) ── */
const MOCK = {
  user: { _id:'USR001', name:'Arjun Sharma', email:'arjun@example.com', phone:'9876543210', role:'user', status:'active', dob:'1992-03-15', address:'A-12, Sector 5, New Delhi', kycStatus:'verified', lastLogin: new Date().toISOString() },
  account: { accountNumber:'4521 8763 1290 5544', accountType:'Savings', balance:125400.50, ifsc:'NEXA0001234', branch:'Connaught Place', status:'active', dailyLimit:100000, createdAt:'2021-04-10T00:00:00Z' },
  summary: { balance:125400.50, monthlyCredit:100450.50, monthlyDebit:23650, totalTransactions:8 },
  transactions: [
    { txnId:'TXN00001', createdAt:'2024-01-15T10:30:00Z', description:'Salary Credit', type:'credit', amount:85000, balanceAfter:125400.50, mode:'NEFT', status:'success' },
    { txnId:'TXN00002', createdAt:'2024-01-13T14:20:00Z', description:'Amazon Shopping', type:'debit', amount:2350, balanceAfter:40400.50, mode:'UPI', status:'success' },
    { txnId:'TXN00003', createdAt:'2024-01-11T09:15:00Z', description:'Fund Transfer to Priya', type:'debit', amount:5000, balanceAfter:42750.50, mode:'IMPS', status:'success' },
    { txnId:'TXN00004', createdAt:'2024-01-09T16:45:00Z', description:'Interest Credit', type:'credit', amount:450.50, balanceAfter:47750.50, mode:'AUTO', status:'success' },
    { txnId:'TXN00005', createdAt:'2024-01-07T11:00:00Z', description:'ATM Withdrawal', type:'debit', amount:10000, balanceAfter:47300.00, mode:'ATM', status:'success' },
    { txnId:'TXN00006', createdAt:'2024-01-05T19:30:00Z', description:'UPI to Swiggy', type:'debit', amount:650, balanceAfter:57300.00, mode:'UPI', status:'success' },
    { txnId:'TXN00007', createdAt:'2024-01-03T12:00:00Z', description:'Refund from Flipkart', type:'credit', amount:1299, balanceAfter:57950.00, mode:'AUTO', status:'success' },
    { txnId:'TXN00008', createdAt:'2024-01-01T09:00:00Z', description:'FD Maturity Credit', type:'credit', amount:15000, balanceAfter:56651.00, mode:'AUTO', status:'success' },
  ],
  admin: { _id:'ADM001', name:'Admin Manager', email:'admin@zincbank.com', role:'admin' },
  admDash: { totalUsers:3, activeUsers:2, blockedUsers:1, totalFunds:383900.50, totalTxns:11,
    recentTxns:[
      { txnId:'TXN00001', user:{name:'Arjun Sharma'}, createdAt:'2024-01-15T10:30:00Z', description:'Salary Credit', amount:85000, type:'credit' },
      { txnId:'TXN00009', user:{name:'Priya Patel'}, createdAt:'2024-01-14T12:00:00Z', description:'Business Receipt', amount:50000, type:'credit' },
      { txnId:'TXN00002', user:{name:'Arjun Sharma'}, createdAt:'2024-01-13T14:20:00Z', description:'Amazon Shopping', amount:2350, type:'debit' },
    ]
  },
  admUsers: [
    { _id:'USR001', name:'Arjun Sharma', email:'arjun@example.com', status:'active', account:{ balance:125400.50, accountNumber:'4521 8763 1290 5544', accountType:'Savings' } },
    { _id:'USR002', name:'Priya Patel', email:'priya@example.com', status:'active', account:{ balance:250000.00, accountNumber:'7834 2210 5643 8821', accountType:'Current' } },
    { _id:'USR003', name:'Rahul Verma', email:'rahul@example.com', status:'blocked', account:{ balance:8500.00, accountNumber:'2291 5543 8812 6670', accountType:'Savings' } },
  ],
  notifications: [
    { _id:'N1', type:'transaction', icon:'💰', title:'₹85,000 Salary Credited', message:'NEFT from Employer — Bal: ₹1,25,400', read:false, createdAt: new Date(Date.now()-3600000).toISOString() },
    { _id:'N2', type:'login', icon:'🔐', title:'New Login Detected', message:'Chrome on Windows — Just now', read:false, createdAt: new Date().toISOString() },
    { _id:'N3', type:'system', icon:'🎉', title:'Welcome to Zinc Bank!', message:'Your account is ready to use.', read:true, createdAt: new Date(Date.now()-86400000).toISOString() },
  ],
};

/* ── APP STATE ── */
const App = (() => {
  let S = { user:null, account:null, isAdmin:false };
  let txnState = { page:1, total:0, filter:'all', search:'' };
  let fpEmail = '', fpOtp = '';

  /* ── HELPERS ── */
  const $ = id => document.getElementById(id);
  const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2});
  const fmtD = d => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  const fmtDT = d => new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const setTxt = (id,v) => { const e=$(id); if(e) e.textContent = (v===null||v===undefined)?'—':v; };
  const setVal = (id,v) => { const e=$(id); if(e) e.value = v||''; };
  const genId = () => 'TXN' + Date.now().toString(36).toUpperCase().slice(-8);

  function showToast(msg, type='success') {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const wrap = $('toast-wrap');
    const t = document.createElement('div');
    t.className = `toast t${type[0]}`;
    t.innerHTML = `<span class="t-ico">${icons[type]||'ℹ️'}</span><span class="t-msg">${msg}</span>`;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(),400); }, 3500);
  }

  function go(pg) {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const el=$('pg-'+pg); if(el) el.classList.add('active');
    window.scrollTo(0,0);
  }

  function showSec(sec) {
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.sb-item[data-sec]').forEach(b=>b.classList.remove('active'));
    const el=$('sec-'+sec); if(el) el.classList.add('active');
    const btn=document.querySelector(`.sb-item[data-sec="${sec}"]`); if(btn) btn.classList.add('active');
    if(sec==='account') loadAccount();
    if(sec==='transactions') loadTxns();
    if(sec==='profile') loadProfile();
    if(sec==='loans') loadLoans();
  }

  function openModal(id) { const e=$(id); if(e) e.classList.add('open'); }
  function closeModal(id) { const e=$(id); if(e) e.classList.remove('open'); }

  function setBtnLd(id, on) {
    const b=$(id); if(!b) return;
    b.disabled=on; on ? b.classList.add('btn-ld') : b.classList.remove('btn-ld');
  }

  /* ── API CALL WRAPPER (with mock fallback) ── */
  async function apiCall(fn, fallback) {
    try { return await fn(); }
    catch(e) { if(typeof fallback === 'function') return fallback(); return fallback; }
  }

  /* ── AUTH ── */
  async function login(email, pwd) {
    setBtnLd('lg-btn', true);
    try {
      let user;
      try {
        const res = await Api.auth.login({ email, password: pwd });
        user = res.user;
        TokenStore.set(res.token);
        if(res.refreshToken) TokenStore.setRefresh(res.refreshToken);
      } catch(err) {
        // Mock fallback
        if(email==='admin@zincbank.com' && pwd==='Admin@123') user = MOCK.admin;
        else if(email==='arjun@example.com' && pwd==='User@123') user = MOCK.user;
        else if(email==='priya@example.com' && pwd==='User@123') user = {...MOCK.user, name:'Priya Patel', email:'priya@example.com', _id:'USR002'};
        else { showToast('Invalid email or password','error'); return; }
      }
      S.user = user; S.isAdmin = user.role==='admin';
      if(S.isAdmin) { go('admin'); await renderAdmin(); }
      else { go('dashboard'); await renderDashboard(); }
    } finally { setBtnLd('lg-btn', false); }
  }

  function demoLogin(role) {
    $('lg-email').value = role==='admin' ? 'admin@zincbank.com' : 'arjun@example.com';
    $('lg-pwd').value = role==='admin' ? 'Admin@123' : 'User@123';
    login($('lg-email').value, $('lg-pwd').value);
  }

  async function logout() {
    try { await Api.auth.logout(); } catch(e){}
    TokenStore.clear();
    S = { user:null, account:null, isAdmin:false };
    go('login'); showToast('Signed out successfully','info');
  }

  async function register(data) {
    setBtnLd('rg-btn', true);
    try {
      await apiCall(() => Api.auth.register(data), null);
      showToast('Account created! Please login.','success'); go('login');
    } finally { setBtnLd('rg-btn', false); }
  }

  /* ── FORGOT PASSWORD ── */
  async function sendOtp(email) {
    setBtnLd('fp1-btn', true);
    fpEmail = email;
    await apiCall(() => Api.auth.forgotPassword(email), null);
    showToast('OTP sent! Demo: 1 2 3 4 5 6','info');
    $('fp-s1').classList.add('hidden');
    $('fp-s2').classList.remove('hidden');
    document.querySelectorAll('.otp-in')[0]?.focus();
    setBtnLd('fp1-btn', false);
  }

  function sendOtpAgain() { showToast('OTP resent! Demo: 1 2 3 4 5 6','info'); }

  async function verifyOtp() {
    setBtnLd('fp2-btn', true);
    const otp = Array.from(document.querySelectorAll('.otp-in')).map(i=>i.value).join('');
    fpOtp = otp;
    const ok = await apiCall(async () => { const r = await Api.auth.verifyOtp(fpEmail,otp); return r.success; }, () => otp==='123456');
    if(ok) { $('fp-s2').classList.add('hidden'); $('fp-s3').classList.remove('hidden'); }
    else showToast('Incorrect OTP. Demo: 1 2 3 4 5 6','error');
    setBtnLd('fp2-btn', false);
  }

  async function resetPwd(newPwd) {
    setBtnLd('fp3-btn', true);
    await apiCall(() => Api.auth.resetPassword(fpEmail, fpOtp, newPwd), null);
    showToast('Password reset successfully!','success'); go('login');
    ['fp-s1','fp-s2','fp-s3'].forEach((id,i)=>$(id)?.classList.toggle('hidden',i!==0));
    setBtnLd('fp3-btn', false);
  }

  /* ── DASHBOARD RENDER ── */
  async function renderDashboard() {
    const u = S.user;
    setTxt('nav-nm', u.name.split(' ')[0]);
    setTxt('nav-av', u.name[0]);
    await refreshBalance();
    loadRecentTxns();
    loadNotifs();
  }

  /* ── LIVE BALANCE REFRESH (KEY FEATURE) ── */
  async function refreshBalance() {
    // Show spinning indicators
    $('sync-btn')?.classList.add('spin');
    $('ref-btn')?.classList.add('spin');
    const balEl = $('bal-amt');
    if(balEl) { balEl.classList.add('loading'); balEl.textContent = ''; }

    try {
      // ── REAL API CALLS ──
      // GET /api/v1/accounts/balance   → live balance
      // GET /api/v1/transactions/summary → monthly stats
      let bal, acctNum, acctType, cr, dr, txnCt;

      const [acctData, summaryData] = await Promise.all([
        apiCall(() => Api.account.balance(), () => ({ data: { balance: MOCK.account.balance, accountNumber: MOCK.account.accountNumber, accountType: MOCK.account.accountType, status: MOCK.account.status } })),
        apiCall(() => Api.transactions.summary(), () => ({ data: MOCK.summary })),
      ]);

      const a = acctData?.data || MOCK.account;
      const sm = summaryData?.data || MOCK.summary;

      bal = a.balance; acctNum = a.accountNumber; acctType = a.accountType;
      cr = sm.monthlyCredit; dr = sm.monthlyDebit; txnCt = sm.totalTransactions;

      S.account = a;

      // ── UPDATE BALANCE HERO ──
      if(balEl) { balEl.classList.remove('loading'); balEl.textContent = fmt(bal); }
      setTxt('bal-acct-num', acctNum);
      const typeEl = $('bal-acct-type');
      if(typeEl) { typeEl.textContent = acctType; }
      setTxt('bal-cr', fmt(cr));
      setTxt('bal-dr', fmt(dr));
      setTxt('bal-txns', txnCt);

      // ── UPDATE STAT CARDS ──
      ['st-bal','st-cr','st-dr','st-txns'].forEach(id=>$(id)?.classList.remove('ld'));
      setTxt('st-bal', fmt(bal));
      setTxt('st-cr', fmt(cr));
      setTxt('st-dr', fmt(dr));
      setTxt('st-txns', txnCt);

      // ── UPDATE DEBIT CARD ──
      setTxt('dc-num', acctNum);
      setTxt('dc-name', (S.user?.name||'').toUpperCase());
      setTxt('dc-type', acctType);

      // ── SPENDING PROGRESS ──
      const pct = Math.min(100, Math.round((dr/100000)*100));
      const pb = $('spend-prog'); if(pb) pb.style.width = pct+'%';
      setTxt('spend-pct', `${pct}% of ₹1,00,000 monthly limit used`);

      showToast(`Balance: ${fmt(bal)} — Updated live`, 'success');

    } catch(e) {
      if(balEl) { balEl.classList.remove('loading'); balEl.textContent = '—'; }
      showToast('Balance refresh failed','error');
    } finally {
      $('sync-btn')?.classList.remove('spin');
      $('ref-btn')?.classList.remove('spin');
    }
  }

  /* ── RECENT TRANSACTIONS ── */
  async function loadRecentTxns() {
    const tbody = $('home-tbody'); if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="tbl-empty">Loading...</td></tr>';
    const data = await apiCall(() => Api.transactions.list({limit:5}), () => ({data: MOCK.transactions.slice(0,5)}));
    renderTxnRows(tbody, data?.data || MOCK.transactions.slice(0,5), true);
  }

  function renderTxnRows(tbody, txns, mini=false) {
    const cols = mini ? 5 : 7;
    if(!txns?.length) { tbody.innerHTML = `<tr><td colspan="${cols}" class="tbl-empty">No transactions found</td></tr>`; return; }
    tbody.innerHTML = txns.map(t=>`
      <tr>
        <td class="td-b small">${t.txnId}</td>
        <td>${fmtD(t.createdAt||t.date||new Date())}</td>
        <td>${t.description||t.desc||'—'}</td>
        ${mini ? '' : `<td><span class="badge bg-gray">${t.mode||'—'}</span></td>`}
        <td class="${t.type==='credit'?'cr':'dr'}">${t.type==='credit'?'+':'-'}${fmt(t.amount)}</td>
        ${mini ? '' : `<td class="muted">${t.balanceAfter?fmt(t.balanceAfter):'—'}</td>`}
        <td><span class="badge ${t.type==='credit'?'bg-green':'bg-red'}">${t.type}</span></td>
      </tr>`).join('');
  }

  /* ── ACCOUNT SECTION ── */
  async function loadAccount() {
    const [acctRes, userRes] = await Promise.all([
      apiCall(()=>Api.account.get(), ()=>({data:MOCK.account})),
      apiCall(()=>Api.user.profile(), ()=>({data:MOCK.user})),
    ]);
    const a = acctRes?.data || MOCK.account;
    const u = userRes?.data || MOCK.user;
    S.account = a;
    // Card
    setTxt('ac-num', a.accountNumber); setTxt('ac-name2', (S.user?.name||'').toUpperCase());
    // Info rows
    setTxt('ac-acct', a.accountNumber); setTxt('ac-type', a.accountType);
    setTxt('ac-bal', fmt(a.balance));
    setTxt('ac-ifsc', a.ifsc); setTxt('ac-branch', a.branch);
    setTxt('ac-status', a.status?.toUpperCase());
    setTxt('ac-opened', fmtD(a.createdAt));
    setTxt('ac-limit', fmt(a.dailyLimit||100000));
    // Holder info
    setTxt('ac-hname', u.name); setTxt('ac-email', u.email);
    setTxt('ac-phone', u.phone);
    const kycEl = $('ac-kyc');
    if(kycEl) { kycEl.innerHTML = `<span class="badge ${u.kycStatus==='verified'?'bg-green':'bg-gold'}">${u.kycStatus||'pending'}</span>`; }
    setTxt('ac-login', u.lastLogin ? fmtDT(u.lastLogin) : 'Never');
  }

  /* ── TRANSACTIONS ── */
  async function loadTxns() {
    const tbody = $('txn-tbody'); if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="tbl-empty">Loading from API...</td></tr>';
    const params = { page: txnState.page, limit: 15 };
    if(txnState.filter !== 'all') params.type = txnState.filter;
    if(txnState.search) params.search = txnState.search;

    const data = await apiCall(
      () => Api.transactions.list(params),
      () => {
        let t = [...MOCK.transactions];
        if(txnState.filter!=='all') t=t.filter(x=>x.type===txnState.filter);
        if(txnState.search) t=t.filter(x=>(x.description||'').toLowerCase().includes(txnState.search)||(x.txnId||'').toLowerCase().includes(txnState.search));
        return { data:t, pagination:{ total:t.length, page:1, pages:1 } };
      }
    );

    const txns = data?.data || [];
    const pg = data?.pagination || { total:txns.length, pages:1 };
    txnState.total = pg.total;

    renderTxnRows(tbody, txns, false);
    setTxt('txn-info', `Showing ${txns.length} of ${pg.total} transactions`);
    setTxt('txn-pg-num', `Page ${txnState.page}`);
    const prev=$('txn-prev'), next=$('txn-next');
    if(prev) prev.disabled = txnState.page <= 1;
    if(next) next.disabled = txnState.page >= pg.pages;
  }

  function txnPageNav(dir) { txnState.page = Math.max(1, txnState.page+dir); loadTxns(); }
  function searchTxns(q) { txnState.search=q.toLowerCase(); txnState.page=1; loadTxns(); }
  function filterTxns(v) { txnState.filter=v; txnState.page=1; loadTxns(); }

  function exportCSV() {
    const rows = [['Txn ID','Date','Description','Amount','Type','Balance After','Mode']];
    MOCK.transactions.forEach(t=>rows.push([t.txnId,t.createdAt?.split('T')[0],`"${t.description}"`,t.amount,t.type,t.balanceAfter||'',t.mode||'']));
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download=`zincbank_transactions_${Date.now()}.csv`; a.click();
    showToast('CSV exported!','success');
  }

  /* ── PROFILE ── */
  async function loadProfile() {
    const data = await apiCall(()=>Api.user.profile(), ()=>({data:MOCK.user}));
    const u = data?.data || MOCK.user;
    Object.assign(S.user||{}, u);
    setTxt('pf-av', u.name?.[0]||'U');
    setTxt('pf-dname', u.name); setTxt('pf-demail', u.email);
    setVal('pf-name', u.name); setVal('pf-email', u.email);
    setVal('pf-phone', u.phone); setVal('pf-dob', u.dob?.split('T')[0]);
    setVal('pf-address', u.address);
  }

  async function updateProfile() {
    setBtnLd('pf-btn', true);
    const d = { name:$('pf-name').value, phone:$('pf-phone').value, dob:$('pf-dob').value, address:$('pf-address').value };
    await apiCall(()=>Api.user.updateProfile(d), ()=>{ Object.assign(S.user||{},d); });
    Object.assign(S.user||{},d);
    setTxt('nav-nm', d.name.split(' ')[0]);
    setTxt('nav-av', d.name[0]);
    setTxt('pf-av', d.name[0]);
    setTxt('pf-dname', d.name);
    showToast('Profile updated!','success');
    setBtnLd('pf-btn', false);
  }

  async function changePwd(cur, nw, conf) {
    if(nw!==conf) { showToast('Passwords do not match','error'); return; }
    if(nw.length<6) { showToast('Min 6 characters','error'); return; }
    setBtnLd('cp-btn', true);
    await apiCall(()=>Api.user.changePassword({currentPassword:cur, newPassword:nw}), ()=>{});
    showToast('Password changed!','success');
    $('cp-cur').value=$('cp-new').value=$('cp-conf').value='';
    setBtnLd('cp-btn', false);
  }

  async function changePin(cur, nw, conf) {
    if(nw!==conf) { showToast('PINs do not match','error'); return; }
    if(!/^\d{4}$/.test(nw)) { showToast('PIN must be 4 digits','error'); return; }
    setBtnLd('pin-btn', true);
    await apiCall(()=>Api.account.setPin({pin:nw, currentPin:cur}), ()=>{});
    showToast('Transaction PIN updated!','success');
    setBtnLd('pin-btn', false);
  }

  /* ── BANKING OPERATIONS ── */
  async function deposit(amount, mode, desc) {
    if(!amount||amount<1) { showToast('Invalid amount','error'); return; }
    setBtnLd('dp-btn', true);
    try {
      let newBal;
      try {
        const r = await Api.transactions.deposit({amount, mode, description:desc||'Cash Deposit'});
        newBal = r.data.balance;
      } catch(e) {
        MOCK.account.balance += amount;
        MOCK.summary.balance = MOCK.account.balance;
        MOCK.summary.monthlyCredit += amount;
        MOCK.transactions.unshift({ txnId:genId(), createdAt:new Date().toISOString(), description:desc||'Cash Deposit', type:'credit', amount, balanceAfter:MOCK.account.balance, mode, status:'success' });
        newBal = MOCK.account.balance;
      }
      closeModal('mod-deposit');
      showToast(`${fmt(amount)} deposited! Balance: ${fmt(newBal)}`,'success');
      await refreshBalance();
      loadRecentTxns();
    } finally { setBtnLd('dp-btn', false); }
  }

  async function withdraw(amount, pin, mode, desc) {
    if(!amount||amount<1) { showToast('Invalid amount','error'); return; }
    setBtnLd('wd-btn', true);
    try {
      let newBal;
      try {
        const r = await Api.transactions.withdraw({amount, pin, mode, description:desc||'Cash Withdrawal'});
        newBal = r.data.balance;
      } catch(e) {
        if(e.message?.includes('PIN')||e.message?.includes('pin')) { showToast('Incorrect PIN','error'); return; }
        if(pin!=='4521') { showToast('Incorrect transaction PIN','error'); return; }
        if(amount>MOCK.account.balance) { showToast('Insufficient balance!','error'); return; }
        MOCK.account.balance -= amount;
        MOCK.summary.balance = MOCK.account.balance;
        MOCK.summary.monthlyDebit += amount;
        MOCK.transactions.unshift({ txnId:genId(), createdAt:new Date().toISOString(), description:desc||'Cash Withdrawal', type:'debit', amount, balanceAfter:MOCK.account.balance, mode, status:'success' });
        newBal = MOCK.account.balance;
      }
      closeModal('mod-withdraw');
      showToast(`${fmt(amount)} withdrawn! Balance: ${fmt(newBal)}`,'success');
      await refreshBalance();
      loadRecentTxns();
    } finally { setBtnLd('wd-btn', false); }
  }

  async function transfer(toAcct, amount, pin, mode, desc) {
    if(!toAcct||!amount||amount<1) { showToast('Fill all fields','error'); return; }
    setBtnLd('tf-btn', true);
    try {
      let newBal, bene;
      try {
        const r = await Api.transactions.transfer({toAccountNumber:toAcct, amount, pin, mode, description:desc||'Fund Transfer'});
        newBal = r.data.balance; bene = r.data.beneficiary;
      } catch(e) {
        if(e.message?.includes('PIN')||e.message?.includes('pin')) { showToast('Incorrect PIN','error'); return; }
        if(pin!=='4521') { showToast('Incorrect transaction PIN','error'); return; }
        if(toAcct.replace(/\s/g,'')!=='7834221056438821') { showToast('Account not found. Try: 7834 2210 5643 8821','error'); return; }
        if(amount>MOCK.account.balance) { showToast('Insufficient balance!','error'); return; }
        MOCK.account.balance -= amount;
        MOCK.summary.balance = MOCK.account.balance;
        MOCK.transactions.unshift({ txnId:genId(), createdAt:new Date().toISOString(), description:`Transfer to Priya Patel`, type:'debit', amount, balanceAfter:MOCK.account.balance, mode, status:'success' });
        newBal = MOCK.account.balance; bene = 'Priya Patel';
      }
      closeModal('mod-transfer');
      showToast(`${fmt(amount)} sent to ${bene||'beneficiary'}!`,'success');
      await refreshBalance();
      loadRecentTxns();
    } finally { setBtnLd('tf-btn', false); }
  }

  /* ── MINI STATEMENT ── */
  async function miniStatement() {
    openModal('mod-mini');
    setTxt('mini-bal', 'Loading...');
    $('mini-list').innerHTML = '<div class="tbl-empty">Fetching...</div>';
    const data = await apiCall(
      ()=>Api.account.miniStatement(),
      ()=>({ data:{ balance:MOCK.account.balance, transactions:MOCK.transactions.slice(0,5) } })
    );
    const d = data?.data || {};
    setTxt('mini-bal', fmt(d.balance||MOCK.account.balance));
    const txns = d.transactions || MOCK.transactions.slice(0,5);
    $('mini-list').innerHTML = txns.length ? txns.map(t=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--br2)">
        <div><div style="font-weight:600;font-size:.83rem">${t.description||t.desc}</div><div class="muted">${fmtD(t.createdAt||t.date)}</div></div>
        <div class="${t.type==='credit'?'cr':'dr'}" style="font-size:.84rem;font-weight:700">${t.type==='credit'?'+':'-'}${fmt(t.amount)}</div>
      </div>`).join('') : '<div class="tbl-empty">No transactions</div>';
  }

  /* ── NOTIFICATIONS ── */
  async function loadNotifs() {
    const data = await apiCall(()=>Api.notifications.list(), ()=>({data:MOCK.notifications, unread:2}));
    const notifs = data?.data || MOCK.notifications;
    const unread = data?.unread || 0;
    const badge = $('n-badge');
    if(badge) { badge.textContent=unread; badge.classList.toggle('hidden',unread===0); }
    const list = $('notif-list'); if(!list) return;
    list.innerHTML = notifs.length ? notifs.map(n=>`
      <div class="notif-item ${n.read?'':'unread'}">
        <div class="notif-ico">${n.icon||'🔔'}</div>
        <div><div class="notif-title">${n.title}</div><div class="notif-msg">${n.message}</div><div class="notif-time">${fmtDT(n.createdAt)}</div></div>
      </div>`).join('') : '<div class="tbl-empty">No notifications</div>';
  }

  function toggleNotifs() {
    const p=$('notif-panel'); if(!p) return;
    p.classList.toggle('open');
    if(p.classList.contains('open')) loadNotifs();
  }

  async function markAllRead() {
    await apiCall(()=>Api.notifications.markAllRead(), ()=>{});
    MOCK.notifications.forEach(n=>n.read=true);
    $('n-badge')?.classList.add('hidden');
    showToast('All notifications read','success');
    loadNotifs();
  }

  /* ── LOANS ── */
  function openLoanModal(type) {
    if($('ln-type')) $('ln-type').value = type;
    openModal('mod-loan'); updateEmiPreview();
  }

  async function loadLoans() {
    const el = $('loans-list'); if(!el) return;
    el.innerHTML = '<div class="tbl-empty">Loading...</div>';
    const data = await apiCall(()=>Api.loans.my(), ()=>({data:[]}));
    const loans = data?.data || [];
    if(!loans.length) { el.innerHTML='<div class="tbl-empty" style="padding:40px">No loan applications yet. Apply above!</div>'; return; }
    el.innerHTML = loans.map(l=>`
      <div class="loan-card mt12">
        <div class="flex-b"><div class="loan-type">${l.loanType} Loan</div><span class="badge ${l.status==='approved'?'bg-green':l.status==='rejected'?'bg-red':l.status==='active'?'bg-blue':'bg-gold'}">${l.status}</span></div>
        <div class="loan-amt">${fmt(l.amount)}</div>
        <div style="display:flex;justify-content:space-between;font-size:.77rem;color:var(--s1)">
          <span>Tenure: ${l.tenure} months</span><span>Rate: ${l.interestRate}% p.a.</span><span>EMI: ${fmt(l.emi)}/mo</span>
        </div>
      </div>`).join('');
  }

  async function applyLoan(data) {
    setBtnLd('ln-btn', true);
    try {
      await apiCall(()=>Api.loans.apply(data), ()=>{});
      closeModal('mod-loan');
      showToast('Loan application submitted! Admin will review.','success');
      loadLoans();
    } finally { setBtnLd('ln-btn', false); }
  }

  /* ── EMI CALCULATOR ── */
  function updateEmiPreview() {
    const amt = parseFloat($('ln-amt')?.value||0);
    const tn = parseInt($('ln-tenure')?.value||0);
    const type = $('ln-type')?.value;
    const rates = { Personal:12.5, Home:8.5, Vehicle:9.5, Education:7.0, Business:14.0 };
    const r = (rates[type]||12)/12/100;
    const el = $('emi-preview'); if(!el) return;
    if(amt>=10000 && tn>=6) {
      const emi = Math.round(amt*r*Math.pow(1+r,tn)/(Math.pow(1+r,tn)-1));
      el.textContent = `📊 EMI: ${fmt(emi)}/month • Total: ${fmt(emi*tn)} • Interest: ${fmt(emi*tn-amt)}`;
      el.className = 'alert al-i';
    } else { el.textContent = 'Enter amount & tenure to preview EMI'; el.className = 'alert al-w'; }
  }

  /* ── ADMIN ── */
  async function renderAdmin() {
    admTab('overview');
  }

  async function loadAdmDash() {
    const data = await apiCall(()=>Api.admin.dashboard(), ()=>({data:MOCK.admDash}));
    const d = data?.data || MOCK.admDash;
    setTxt('adm-total', d.totalUsers||0); setTxt('adm-active', d.activeUsers||0);
    setTxt('adm-blocked', d.blockedUsers||0); setTxt('adm-funds', fmt(d.totalFunds||0));
    setTxt('adm-txns', d.totalTxns||0);
    const tbody = $('adm-recent-tbody');
    if(tbody) {
      const txns = d.recentTxns || MOCK.admDash.recentTxns;
      tbody.innerHTML = txns.map(t=>`<tr>
        <td class="td-b small">${t.txnId}</td>
        <td>${t.user?.name||'—'}</td>
        <td>${t.description||'—'}</td>
        <td class="${t.type==='credit'?'cr':'dr'}">${t.type==='credit'?'+':'-'}${fmt(t.amount)}</td>
        <td><span class="badge ${t.type==='credit'?'bg-green':'bg-red'}">${t.type}</span></td>
        <td>${fmtD(t.createdAt)}</td>
      </tr>`).join('');
    }
  }

  async function loadAdmUsers(search='', filter='all') {
    const tbody = $('adm-users-tbody'); if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="tbl-empty">Loading...</td></tr>';
    const data = await apiCall(
      ()=>Api.admin.users({search, status:filter}),
      ()=>({ data: MOCK.admUsers.filter(u=>(filter==='all'||u.status===filter)&&(!search||u.name.toLowerCase().includes(search)||u.email.toLowerCase().includes(search))) })
    );
    const users = data?.data || [];
    tbody.innerHTML = users.map(u=>`<tr>
      <td class="td-b small">${u._id||u.id}</td>
      <td>${u.name}</td>
      <td class="muted small">${u.email}</td>
      <td>${u.account?fmt(u.account.balance):fmt(u.balance||0)}</td>
      <td><span class="badge ${u.status==='active'?'bg-green':'bg-red'}">${u.status}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="App.viewAdmUser('${u._id||u.id}')">View</button>
        <button class="btn ${u.status==='active'?'btn-danger':'btn-success'} btn-sm" style="margin-left:5px" onclick="App.blockUser('${u._id||u.id}')">${u.status==='active'?'Block':'Unblock'}</button>
      </td>
    </tr>`).join('')||'<tr><td colspan="6" class="tbl-empty">No users found</td></tr>';
  }

  async function loadAdmTxns(search='') {
    const tbody = $('adm-txns-tbody'); if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="tbl-empty">Loading...</td></tr>';
    const data = await apiCall(
      ()=>Api.admin.transactions({search}),
      ()=>({ data: MOCK.admDash.recentTxns })
    );
    const txns = data?.data || [];
    tbody.innerHTML = txns.map(t=>`<tr>
      <td class="td-b small">${t.txnId}</td>
      <td>${t.user?.name||'—'}</td>
      <td>${fmtD(t.createdAt)}</td>
      <td>${t.description||'—'}</td>
      <td class="${t.type==='credit'?'cr':'dr'}">${t.type==='credit'?'+':'-'}${fmt(t.amount)}</td>
      <td><span class="badge ${t.type==='credit'?'bg-green':'bg-red'}">${t.type}</span></td>
    </tr>`).join('')||'<tr><td colspan="6" class="tbl-empty">No transactions</td></tr>';
  }

  function viewAdmUser(id) {
    const u = MOCK.admUsers.find(u=>(u._id||u.id)===id) || {_id:id,name:'User',email:'—',status:'active',account:{balance:0,accountNumber:'—',accountType:'—'}};
    const a = u.account||{};
    $('mod-user-body').innerHTML = `
      <div class="grid2" style="gap:12px;margin-bottom:18px">
        <div><div class="flbl">User ID</div><div style="font-weight:600;font-size:.84rem">${u._id||u.id}</div></div>
        <div><div class="flbl">Name</div><div style="font-weight:600">${u.name}</div></div>
        <div><div class="flbl">Email</div><div style="font-weight:600;font-size:.84rem">${u.email}</div></div>
        <div><div class="flbl">Status</div><span class="badge ${u.status==='active'?'bg-green':'bg-red'}">${u.status}</span></div>
        <div><div class="flbl">Account No.</div><div style="font-weight:600;font-size:.8rem">${a.accountNumber||'—'}</div></div>
        <div><div class="flbl">Balance</div><div style="font-weight:700;color:var(--green)">${fmt(a.balance||0)}</div></div>
        <div><div class="flbl">Account Type</div><div style="font-weight:600">${a.accountType||'—'}</div></div>
        <div><div class="flbl">Role</div><div style="font-weight:600">${u.role||'user'}</div></div>
      </div>
      <div class="flex-c gap12 mt16">
        <button class="btn ${u.status==='active'?'btn-danger':'btn-success'} w100" onclick="App.blockUser('${u._id||u.id}');App.closeModal('mod-user-view')">${u.status==='active'?'🚫 Block User':'✅ Unblock User'}</button>
        <button class="btn btn-ghost w100" onclick="App.closeModal('mod-user-view')">Close</button>
      </div>`;
    openModal('mod-user-view');
  }

  async function blockUser(id) {
    await apiCall(()=>Api.admin.blockUser(id), ()=>{});
    const u = MOCK.admUsers.find(u=>(u._id||u.id)===id);
    if(u) u.status = u.status==='active'?'blocked':'active';
    showToast('User status updated','info');
    loadAdmUsers();
    loadAdmDash();
  }

  function admTab(tab) {
    document.querySelectorAll('.adm-content').forEach(el=>el.classList.add('hidden'));
    document.querySelectorAll('.adm-tab').forEach(b=>b.classList.remove('active'));
    $('admt-'+tab)?.classList.remove('hidden');
    document.querySelector(`.adm-tab[data-tab="${tab}"]`)?.classList.add('active');
    document.querySelectorAll('.sidebar .sb-item').forEach(b=>b.classList.remove('active'));
    if(tab==='overview') loadAdmDash();
    if(tab==='users') loadAdmUsers();
    if(tab==='transactions') loadAdmTxns();
  }

  function admReport(type) {
    const el=$('adm-report-out'); if(!el) return;
    el.classList.remove('hidden');
    let html=`<div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;margin-bottom:14px">📊 ${type.charAt(0).toUpperCase()+type.slice(1)} Report — Generated ${fmtDT(new Date())}</div>`;
    if(type==='users') {
      html+=`<table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Balance</th><th>Type</th><th>Status</th></tr></thead><tbody>${MOCK.admUsers.map(u=>`<tr><td class="td-b small">${u._id}</td><td>${u.name}</td><td>${u.email}</td><td>${fmt(u.account?.balance||0)}</td><td>${u.account?.accountType||'—'}</td><td><span class="badge ${u.status==='active'?'bg-green':'bg-red'}">${u.status}</span></td></tr>`).join('')}</tbody></table>`;
    } else if(type==='transactions') {
      const cr=MOCK.admDash.recentTxns.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0);
      const dr=MOCK.admDash.recentTxns.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0);
      html+=`<div class="grid2 mb16"><div class="stat-card"><div class="stat-ico" style="background:var(--greenbg)">📈</div><div><div class="stat-lbl">Credits</div><div class="stat-val cr">${fmt(cr)}</div></div></div><div class="stat-card"><div class="stat-ico" style="background:var(--redbg)">📉</div><div><div class="stat-lbl">Debits</div><div class="stat-val dr">${fmt(dr)}</div></div></div></div>`;
      html+=`<table><thead><tr><th>ID</th><th>User</th><th>Description</th><th>Amount</th><th>Type</th></tr></thead><tbody>${MOCK.admDash.recentTxns.map(t=>`<tr><td class="td-b small">${t.txnId}</td><td>${t.user?.name||'—'}</td><td>${t.description}</td><td class="${t.type==='credit'?'cr':'dr'}">${fmt(t.amount)}</td><td><span class="badge ${t.type==='credit'?'bg-green':'bg-red'}">${t.type}</span></td></tr>`).join('')}</tbody></table>`;
    } else {
      html+=`<div class="grid2"><div class="stat-card"><div class="stat-ico" style="background:var(--goldbg)">💰</div><div><div class="stat-lbl">Total Funds Managed</div><div class="stat-val" style="font-size:1.1rem">${fmt(MOCK.admDash.totalFunds)}</div></div></div><div class="stat-card"><div class="stat-ico" style="background:var(--greenbg)">👥</div><div><div class="stat-lbl">Active Accounts</div><div class="stat-val">${MOCK.admDash.activeUsers}</div></div></div></div>`;
      html+=`<div class="mt16"><table><thead><tr><th>Name</th><th>Account</th><th>Type</th><th>Balance</th><th>Status</th></tr></thead><tbody>${MOCK.admUsers.map(u=>`<tr><td>${u.name}</td><td class="small">${u.account?.accountNumber}</td><td>${u.account?.accountType}</td><td>${fmt(u.account?.balance)}</td><td><span class="badge ${u.status==='active'?'bg-green':'bg-red'}">${u.status}</span></td></tr>`).join('')}</tbody></table></div>`;
    }
    el.innerHTML=html; showToast('Report generated!','success');
  }

  /* ── INIT ── */
  function init() {
    // OTP inputs
    document.querySelectorAll('.otp-in').forEach((inp,i,arr)=>{
      inp.addEventListener('input',()=>{ if(inp.value&&i<arr.length-1){arr[i+1].focus();inp.classList.add('filled');} });
      inp.addEventListener('keydown',e=>{ if(e.key==='Backspace'&&!inp.value&&i>0){inp.classList.remove('filled');arr[i-1].focus();} });
    });
    // Close modals on overlay click
    document.querySelectorAll('.overlay').forEach(ov=>ov.addEventListener('click',e=>{ if(e.target===ov) ov.classList.remove('open'); }));
    // Close notif panel on outside click
    document.addEventListener('click',e=>{
      const panel=$('notif-panel'), btn=document.querySelector('.notif-btn');
      if(panel?.classList.contains('open')&&!panel.contains(e.target)&&!btn?.contains(e.target)) panel.classList.remove('open');
    });
    // EMI live calc
    ['ln-amt','ln-tenure','ln-type'].forEach(id=>$(id)?.addEventListener('input',updateEmiPreview));
    // Token expiry
    window.addEventListener('nb:logout',()=>logout());
  }

  return {
    go, showSec, openModal, closeModal, showToast,
    login, demoLogin, logout, register,
    sendOtp, sendOtpAgain, verifyOtp, resetPwd,
    refreshBalance, loadTxns, searchTxns, filterTxns, exportCSV,
    txnPageNav, miniStatement,
    deposit, withdraw, transfer,
    loadProfile, updateProfile, changePwd, changePin,
    openLoanModal, applyLoan, loadLoans,
    loadNotifs, toggleNotifs, markAllRead,
    renderAdmin, admTab, blockUser, viewAdmUser, admReport,
    loadAdmUsers, loadAdmTxns,
    init,
  };
})();

/* ── PASSWORD STRENGTH ── */
function checkStr(v) {
  const bar=$('str-bar'),txt=$('str-txt'); if(!bar) return;
  let s=0;
  if(v.length>=8)s++; if(/[A-Z]/.test(v))s++; if(/[0-9]/.test(v))s++; if(/[^A-Za-z0-9]/.test(v))s++;
  const lv=[null,{c:'var(--red)',w:'25%',l:'Weak'},{c:'#f97316',w:'50%',l:'Fair'},{c:'var(--gold)',w:'75%',l:'Good'},{c:'var(--green)',w:'100%',l:'Strong'}][Math.max(1,s)];
  bar.style.cssText=`background:${lv.c};width:${v?lv.w:'0'};height:4px;border-radius:99px;margin-top:5px;transition:all .3s`;
  if(txt) txt.textContent = v?`Strength: ${lv.l}`:'Password strength';
}

/* ── EYE TOGGLE ── */
function toggleEye(id,btn) {
  const inp=document.getElementById(id); if(!inp) return;
  inp.type=inp.type==='password'?'text':'password';
  btn.textContent=inp.type==='password'?'👁':'🙈';
}

/* ── FORM HANDLERS ── */
function handleLogin(e){ e.preventDefault(); App.login(document.getElementById('lg-email').value.trim(), document.getElementById('lg-pwd').value); }
function handleRegister(e){
  e.preventDefault();
  const pwd=document.getElementById('rg-pwd').value, conf=document.getElementById('rg-conf').value;
  if(pwd!==conf){App.showToast('Passwords do not match','error');return;}
  if(pwd.length<6){App.showToast('Min 6 characters','error');return;}
  App.register({name:document.getElementById('rg-name').value,email:document.getElementById('rg-email').value,phone:document.getElementById('rg-phone').value,dob:document.getElementById('rg-dob').value,password:pwd,accountType:document.getElementById('rg-acct').value});
}
function handleFp1(e){e.preventDefault();App.sendOtp(document.getElementById('fp-email').value.trim());}
function handleFp2(e){e.preventDefault();App.verifyOtp();}
function handleFp3(e){
  e.preventDefault();
  const p=document.getElementById('fp-npwd').value,c=document.getElementById('fp-cpwd').value;
  if(p!==c){App.showToast('Passwords do not match','error');return;}
  App.resetPwd(p);
}
function handleDeposit(e){e.preventDefault();App.deposit(parseFloat(document.getElementById('dp-amt').value),document.getElementById('dp-mode').value,document.getElementById('dp-desc').value);e.target.reset();}
function handleWithdraw(e){e.preventDefault();App.withdraw(parseFloat(document.getElementById('wd-amt').value),document.getElementById('wd-pin').value,document.getElementById('wd-mode').value,document.getElementById('wd-desc').value);e.target.reset();}
function handleTransfer(e){e.preventDefault();App.transfer(document.getElementById('tf-acct').value.trim(),parseFloat(document.getElementById('tf-amt').value),document.getElementById('tf-pin').value,document.getElementById('tf-mode').value,document.getElementById('tf-desc').value);e.target.reset();}
function handleUpdateProfile(e){e.preventDefault();App.updateProfile();}
function handleChangePwd(e){e.preventDefault();App.changePwd(document.getElementById('cp-cur').value,document.getElementById('cp-new').value,document.getElementById('cp-conf').value);e.target.reset();}
function handleChangePin(e){e.preventDefault();App.changePin(document.getElementById('pin-cur').value,document.getElementById('pin-new').value,document.getElementById('pin-conf').value);e.target.reset();}
function handleLoan(e){e.preventDefault();App.applyLoan({loanType:document.getElementById('ln-type').value,amount:parseFloat(document.getElementById('ln-amt').value),tenure:parseInt(document.getElementById('ln-tenure').value),purpose:document.getElementById('ln-purpose').value});}

document.addEventListener('DOMContentLoaded',()=>App.init());

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'

try {
  const configRes = await fetch('/api/config')
  const firebaseConfig = await configRes.json()

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const provider = new GoogleAuthProvider()

  let currentUser = null

  // Auth state listener
  onAuthStateChanged(auth, async (user) => {
    currentUser = user
    if (user) {
      document.getElementById('auth-btn').textContent = 'Sign Out'
      document.getElementById('user-name').textContent = user.displayName
      document.getElementById('user-avatar').src = user.photoURL
      document.getElementById('user-info').style.display = 'flex'
      await loadHistory()
    } else {
      document.getElementById('auth-btn').textContent = 'Sign in with Google'
      document.getElementById('user-info').style.display = 'none'
    }
  })

  // Login/logout
  window.handleAuth = async () => {
    if (currentUser) {
      await signOut(auth)
    } else {
      await signInWithPopup(auth, provider)
    }
  }

  // Save message to Firebase
  window.saveToHistory = async (userMsg, botResponse) => {
    if (!currentUser) return
    await addDoc(collection(db, 'users', currentUser.uid, 'chats'), {
      userMessage: userMsg,
      botResponse: botResponse,
      timestamp: serverTimestamp()
    })
    await loadHistory()
  }

  window.appendMessage = (sender, text) => {
    if (sender === 'user') {
      const msgs = document.getElementById('msgs')
      if (msgs) msgs.innerHTML = ''
      addUser(text)
    } else {
      hideEmpty()
      msgCount++
      const mid = 'msg' + msgCount
      const el = document.createElement('div')
      el.className = 'msg msg-a'
      el.innerHTML = `
        <div class="bubble bubble-a" id="bb${mid}">
          ${fmt(text)}
        </div>
        <div class="rich" id="rc${mid}"></div>
        <div class="meta" id="mm${mid}"></div>`
      const msgs = document.getElementById('msgs')
      if (msgs) msgs.appendChild(el)
      scroll()
    }
  }

  // Load history
  window.loadHistory = async () => {
    if (!currentUser) return
    const q = query(collection(db, 'users', currentUser.uid, 'chats'), orderBy('timestamp', 'desc'), limit(20))
    const snapshot = await getDocs(q)
    const historyContainer = document.getElementById('history-list')
    historyContainer.innerHTML = ''
    snapshot.forEach(doc => {
      const data = doc.data()
      const item = document.createElement('div')
      item.className = 'history-item'
      item.textContent = data.userMessage
      item.onclick = () => {
        appendMessage('user', data.userMessage)
        appendMessage('bot', data.botResponse)
      }
      historyContainer.appendChild(item)
    })
  }

  // Check user plan and usage from Firestore
  window.checkUsage = async () => {
    if (!currentUser) return { allowed: true, plan: 'free', used: 0, limit: 20 }
    const docSnap = await getDoc(doc(db, 'users', currentUser.uid))
    const data = docSnap.exists() ? docSnap.data() : {}
    const plan = data.plan || 'free'
    const used = data.queriesUsed || 0
    const limit = plan === 'free' ? 20 : plan === 'basic' ? 500 : 2000

    // Reset monthly count if month changed
    if (data.planResets && new Date() > new Date(data.planResets)) {
      await setDoc(doc(db, 'users', currentUser.uid), { queriesUsed: 0, planResets: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString() }, { merge: true })
      return { allowed: true, plan, used: 0, limit }
    }
    return { allowed: used < limit, plan, used, limit }
  }

  // Increment usage count
  window.incrementUsage = async () => {
    if (!currentUser) return
    const ref = doc(db, 'users', currentUser.uid)
    const snap = await getDoc(ref)
    const used = snap.exists() ? (snap.data().queriesUsed || 0) : 0
    await setDoc(ref, { queriesUsed: used + 1 }, { merge: true })
  }

  // Show paywall
  window.showPaywall = (used, limit, plan) => {
    const overlay = document.createElement('div')
    overlay.id = 'paywall'
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999;'
    overlay.innerHTML = `
      <div style="background:#111;border:1px solid #222;border-radius:16px;padding:40px;max-width:420px;text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">🔒</div>
        <h2 style="color:#fff;margin-bottom:8px;">You've used ${used}/${limit} queries</h2>
        <p style="color:#888;margin-bottom:28px;font-size:14px;">Upgrade to keep using NullPoint — still way cheaper than ChatGPT Plus.</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <button onclick="startPayment('basic')" style="background:#00d4ff;color:#000;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">Basic — ₹99/month · 500 queries</button>
          <button onclick="startPayment('pro')" style="background:#fff;color:#000;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">Pro — ₹199/month · 2,000 queries</button>
          <button onclick="document.getElementById('paywall').remove()" style="background:transparent;color:#555;border:none;padding:8px;cursor:pointer;font-size:13px;">Maybe later</button>
        </div>
      </div>`
    document.body.appendChild(overlay)
  }

  // Start Razorpay payment
  window.startPayment = async (plan) => {
    if (!currentUser) return
    const orderRes = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    })
    const order = await orderRes.json()
    const options = {
      key: await fetch('/api/config').then(r => r.json()).then(c => c.razorpayKeyId),
      amount: order.amount,
      currency: 'INR',
      name: 'NullPoint',
      description: plan === 'basic' ? 'Basic Plan — 500 queries/month' : 'Pro Plan — 2,000 queries/month',
      order_id: order.id,
      handler: async (response) => {
        const verify = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...response, uid: currentUser.uid, plan })
        })
        const result = await verify.json()
        if (result.success) {
          document.getElementById('paywall')?.remove()
          alert(`✅ You're now on the ${plan} plan!`)
        }
      },
      prefill: { email: currentUser.email, name: currentUser.displayName },
      theme: { color: '#00d4ff' }
    }
    const rzp = new window.Razorpay(options)
    rzp.open()
  }
} catch(e) {
  console.warn('Firebase unavailable:', e.message)
  window.handleAuth = () => alert('Auth unavailable. Check server.')
  window.saveToHistory = async () => {}
  window.loadHistory = async () => {}
  window.checkUsage = async () => ({ allowed: true, plan: 'free', used: 0, limit: 20 })
  window.incrementUsage = async () => {}
  window.showPaywall = () => alert('Please sign in to continue using NullPoint.')
}

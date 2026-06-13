// Safe defaults — Firebase overrides these once it loads
// These MUST exist before any other script runs so send() never crashes

window.handleAuth = () => {
  alert('Loading authentication... please try again in a moment.')
}

window.saveToHistory = async () => {}

window.loadHistory = async () => {}

window.checkUsage = async () => ({
  allowed: true,
  plan: 'free',
  used: 0,
  limit: 20
})

window.incrementUsage = async () => {}

window.showPaywall = (used, limit, plan) => {
  alert(`You've used ${used}/${limit} queries. Sign in to continue.`)
}

window.startPayment = async (plan) => {
  alert('Please sign in first to upgrade your plan.')
}

// Sidebar toggle
window.toggleSidebar = (btn) => {
  const sb = document.getElementById('history-sidebar')
  const open = sb.style.transform === 'translateX(0px)'
  sb.style.transform = open ? 'translateX(-240px)' : 'translateX(0px)'
  btn.style.transform = open ? 'translateX(0px)' : 'translateX(240px)'
  btn.setAttribute('aria-expanded', String(!open))
}

const NOTIF_MESSAGES = [
  { title: '🤖 Shadow Garden Bot', body: 'Your bot is running smoothly! Check the dashboard for updates.' },
  { title: '📊 Dashboard Reminder', body: 'Don\'t forget to check your bot stats and top commands!' },
  { title: '🛡️ Shadow Garden', body: 'Review any pending banned users or maintenance settings.' },
  { title: '⭐ Premium Requests', body: 'Check if there are new premium subscription requests waiting.' },
  { title: '💬 Bot Activity', body: 'Your bot has been active! View the latest command usage.' },
  { title: '🔔 Shadow Garden', body: 'Reminder: Check your guest accounts and group messages.' },
];

let notifIndex = 0;

function showNotif() {
  const msg = NOTIF_MESSAGES[notifIndex % NOTIF_MESSAGES.length];
  notifIndex++;
  const notif = new Notification(msg.title, {
    body: msg.body,
    icon: './assets/favicon.ico',
    badge: './assets/apple-touch-icon.png',
    silent: false,
  });
  setTimeout(() => notif.close(), 6000);
  notif.onclick = () => { window.focus(); notif.close(); };
}

function sendDashboardNotif() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    showNotif();
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') showNotif();
    });
  }
}

function askNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showNotif();
        setInterval(sendDashboardNotif, 6 * 60 * 1000);
      }
    });
  } else if (Notification.permission === 'granted') {
    setInterval(sendDashboardNotif, 6 * 60 * 1000);
  }
}

document.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', e => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
    (e.ctrlKey && e.key === 'U')
  ) e.preventDefault();
});

document.addEventListener('selectstart', e => e.preventDefault());

(function detectDevTools() {
  const threshold = 160;
  setInterval(() => {
    if (
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold
    ) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888;font-size:15px;">⚠️ Access Restricted.</div>';
    }
  }, 1000);
})();

document.addEventListener('click', function triggerOnce() {
  askNotifPermission();
  document.removeEventListener('click', triggerOnce);
});

setTimeout(sendDashboardNotif, 30 * 1000);

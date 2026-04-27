async function lookupUID() {
  const input = document.getElementById('uidInput').value.trim();
  const btn = document.getElementById('uidLookupBtn');
  const resultBox = document.getElementById('uidResult');
  const resultValue = document.getElementById('uidResultValue');
  const resultUrl = document.getElementById('uidResultUrl');

  clearAuthToast();
  resultBox.style.display = 'none';

  if (!input) { showAuthToast('Please enter a URL or username.'); return; }

  btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;

  try {
    const res = await fetch(`/uid?url=${encodeURIComponent(input)}`);
    const d = await res.json();

    if (!d.ok) { showAuthToast(d.error || 'Failed to find UID.'); return; }

    resultValue.textContent = d.uid;
    resultUrl.textContent = d.profile_url;
    resultBox.style.display = 'block';
    window._lastUID = d.uid;
  } catch {
    showAuthToast('Could not reach the server.');
  } finally {
    btn.innerHTML = 'Find UID';
    btn.disabled = false;
  }
}

function copyUID() {
  const uid = window._lastUID;
  if (!uid) return;
  navigator.clipboard.writeText(uid).then(() => {
    showAuthToast('UID copied!', 'ok');
  }).catch(() => {
    showAuthToast('Copy failed. Try manually.');
  });
}

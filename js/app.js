function notifyMe() {
  const el = document.getElementById('notify-email');
  if (!el.value || !el.value.includes('@')) {
    el.style.borderColor = '#e63946';
    setTimeout(() => el.style.borderColor = '', 1200);
    return;
  }
  el.disabled = true;
  document.querySelector('.notify-row button').disabled = true;
  document.getElementById('notify-thanks').style.display = 'block';
}

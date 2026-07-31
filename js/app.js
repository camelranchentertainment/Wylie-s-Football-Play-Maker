// Public anon key — protected by RLS (insert-only, no read access, see
// supabase/migrations/20260730000600_store_notify_signups.sql)
const APP_SUPA_URL = 'https://rvxanoqourdrfmbucvpz.supabase.co';
const APP_SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eGFub3FvdXJkcmZtYnVjdnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDg2NDksImV4cCI6MjA5MDU4NDY0OX0.7YOW4HtsI-VjgjYZTfAt2tZIUbw_O4NE8oRiTKEbGWY';

async function notifyMe() {
  const el = document.getElementById('notify-email');
  const email = (el.value || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    el.style.borderColor = '#e63946';
    setTimeout(() => (el.style.borderColor = ''), 1200);
    return;
  }
  const btn = document.querySelector('.notify-row button');
  el.disabled = true;
  btn.disabled = true;
  try {
    if (typeof supabase === 'undefined') throw new Error('client unavailable');
    const client = supabase.createClient(APP_SUPA_URL, APP_SUPA_KEY);
    const { error } = await client.from('store_notify_signups').insert({ email });
    // Ignore duplicate-email conflicts (unique index) — already on the list
    // is still a success from the visitor's point of view.
    if (error && error.code !== '23505') throw error;
  } catch (err) {
    console.error('[notifyMe] signup failed:', err);
    // Fail open: still show the thank-you message so a transient network
    // error doesn't look broken to the visitor, but re-enable the form so
    // they can retry if they want to.
    el.disabled = false;
    btn.disabled = false;
  }
  document.getElementById('notify-thanks').style.display = 'block';
}

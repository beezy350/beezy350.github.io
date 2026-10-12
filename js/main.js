// ============================================
// Mobile nav toggle
// ============================================
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.style.display === 'flex';
    navLinks.style.display = isOpen ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '64px';
    navLinks.style.right = '24px';
    navLinks.style.background = '#FFFFFF';
    navLinks.style.padding = '16px 24px';
    navLinks.style.borderRadius = '10px';
    navLinks.style.boxShadow = '0 10px 30px -10px rgba(31,59,44,0.25)';
  });
}

// ============================================
// Signature element: checklist ticks itself off
// once the hero scrolls into view
// ============================================
const checklist = document.getElementById('checklist');

if (checklist) {
  const items = checklist.querySelectorAll('li');

  const runChecklist = () => {
    items.forEach((item, i) => {
      setTimeout(() => item.classList.add('checked'), i * 220);
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        runChecklist();
        observer.disconnect();
      }
    });
  }, { threshold: 0.4 });

  observer.observe(checklist);
}

// ============================================
// Quote form. Forms with an action URL and a real
// Web3Forms access key submit via fetch; anything
// else stays in local test mode.
// ============================================
const quoteForm = document.getElementById('quote-form');

if (quoteForm) {
  const statusEl = document.getElementById('form-status');
  const submitBtn = quoteForm.querySelector('button[type="submit"]');
  const keyField = quoteForm.querySelector('[name="access_key"]');
  const isLive = () => quoteForm.action.startsWith('http') && keyField && !keyField.value.startsWith('YOUR_');

  const showStatus = (msg, isError) => {
    if (!statusEl) { alert(msg); return; }
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', Boolean(isError));
  };

  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isLive()) {
      showStatus('Test mode: the form is not connected yet, so nothing was sent. Add your Web3Forms access key to go live.');
      quoteForm.reset();
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';

    try {
      const res = await fetch(quoteForm.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(quoteForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Request failed');

      showStatus("Thanks! We received your request and will contact you within one business day.");
      quoteForm.reset();
    } catch (err) {
      showStatus('Sorry, something went wrong sending your request. Please call or email us directly.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}

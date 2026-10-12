// ============================================
// Mobile nav toggle
// ============================================
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
  const setOpen = (open) => {
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!navLinks.classList.contains('open'));
  });
  // Close after choosing a link, tapping elsewhere, or pressing Escape
  navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.nav')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  // Phones fire resize when the address bar hides; only react to width changes
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastWidth) { lastWidth = window.innerWidth; setOpen(false); }
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

  // Prefill from the refund estimator, if the visitor came from it
  try {
    const intake = JSON.parse(sessionStorage.getItem('falconIntake') || 'null');
    const notes = quoteForm.querySelector('#notes');
    if (intake && notes && !notes.value) {
      notes.value = intake.summary;
      for (const [id, value] of [['filing', intake.filingType], ['status', intake.status]]) {
        const select = quoteForm.querySelector('#' + id);
        if (select && [...select.options].some((o) => o.text === value)) select.value = value;
      }
    }
  } catch (e) { /* storage blocked or bad data */ }

  // "Get a trucking quote" preselects the trucking service
  const truckCta = document.getElementById('truck-cta');
  const filingSelect = quoteForm.querySelector('#filing');
  if (truckCta && filingSelect) {
    truckCta.addEventListener('click', () => { filingSelect.value = 'Trucking bookkeeping / IFTA'; });
  }

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

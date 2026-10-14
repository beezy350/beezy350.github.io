// ============================================
// Mobile nav toggle
// ============================================
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
  const setOpen = (open) => {
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  };

  navToggle.addEventListener('click', () => {
    setOpen(!navLinks.classList.contains('open'));
  });

  // Close the menu after a link is tapped
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
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
// Quote form — placeholder handler until real
// lead capture (Web3Forms / Formspree) is wired up.
// ============================================
const quoteForm = document.getElementById('quote-form');

if (quoteForm) {
  quoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thanks! Online quote requests are not live yet. Please check back soon.');
    quoteForm.reset();
  });
}

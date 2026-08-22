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
// Quote form — placeholder handler.
// Day 6-7 of the build plan replaces this with
// real lead capture (Web3Forms / Formspree).
// ============================================
const quoteForm = document.getElementById('quote-form');

if (quoteForm) {
  quoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Form captured locally for testing. Lead storage + email notifications get wired up in Day 6-7.');
    quoteForm.reset();
  });
}

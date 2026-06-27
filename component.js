window.__PortfolioComponent = function(DCLogic) { return class Component extends DCLogic {
  state = { theme: 'light', showResume: false, navOpen: false, toast: '', sending: false };

  themes = {
    dark: {
      '--bg':'#0a1120','--surface':'#0f1b2d','--surface2':'#162338','--fg':'#e8edf5',
      '--muted':'#8b9bb5','--faint':'#5a6a84','--border':'rgba(232,237,245,.11)',
      '--accent':'#22d3ee','--accent-soft':'rgba(6,182,212,.14)'
    },
    light: {
      '--bg':'#eef2f7','--surface':'#f6f8fb','--surface2':'#ffffff','--fg':'#0f1b2d',
      '--muted':'#4a5e7a','--faint':'#7889a0','--border':'rgba(15,27,45,.12)',
      '--accent':'#06b6d4','--accent-soft':'rgba(6,182,212,.10)'
    }
  };

  componentDidMount() {
    let saved = 'dark';
    try { saved = localStorage.getItem('jp-portfolio-theme') || 'light'; } catch(e) {}
    this.setState({ theme: saved });
    this.applyTheme(saved);
    requestAnimationFrame(() => { this.setupObservers(); this.setupCarousel(); });
  }

  applyTheme(t) {
    const r = this.rootEl; if (!r) return;
    const vars = this.themes[t] || this.themes.dark;
    for (const k in vars) r.style.setProperty(k, vars[k]);
  }

  setupObservers() {
    const root = this.rootEl || document;
    const revs = root.querySelectorAll('[data-reveal]');
    revs.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(26px)';
      el.style.transition = 'opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)';
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.style.opacity = '1';
            e.target.style.transform = 'none';
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
      revs.forEach(el => io.observe(el));

      const counts = root.querySelectorAll('[data-count]');
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { this.animateCount(e.target); io2.unobserve(e.target); }
        });
      }, { threshold: 0.6 });
      counts.forEach(el => io2.observe(el));

      const secs = root.querySelectorAll('section[id]');
      const links = root.querySelectorAll('[data-nav]');
      const io3 = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            links.forEach(a => { a.style.color = (a.dataset.nav === e.target.id) ? 'var(--accent)' : 'var(--muted)'; });
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(el => io3.observe(el));
    } else {
      revs.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    }
  }

  setupCarousel() {
    const track = document.getElementById('carouselTrack');
    const viewport = document.getElementById('carouselViewport');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const dotsWrap = document.getElementById('carouselDots');
    if (!track || !viewport) return;

    const total = track.querySelectorAll('.work-preview-card').length;
    const gap = 20;
    let current = 0;
    let timer;

    function getVisible() { return window.innerWidth <= 560 ? 1 : 3; }

    function buildDots() {
      const visible = getVisible();
      const maxIndex = total - visible;
      dotsWrap.innerHTML = '';
      for (let i = 0; i <= maxIndex; i++) {
        const d = document.createElement('button');
        d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        d.setAttribute('aria-label', `Go to slide ${i + 1}`);
        d.addEventListener('click', () => { goTo(i); resetTimer(); });
        dotsWrap.appendChild(d);
      }
    }

    function goTo(idx) {
      const visible = getVisible();
      const maxIndex = total - visible;
      current = Math.max(0, Math.min(idx, maxIndex));
      const vw = viewport.offsetWidth;
      track.style.transform = `translateX(-${current * (vw + gap) / visible}px)`;
      dotsWrap.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
      });
    }

    function next() { goTo(current < total - getVisible() ? current + 1 : 0); }
    function prev() { goTo(current > 0 ? current - 1 : total - getVisible()); }

    prevBtn.addEventListener('click', () => { prev(); resetTimer(); });
    nextBtn.addEventListener('click', () => { next(); resetTimer(); });

    viewport.addEventListener('mouseenter', () => clearInterval(timer));
    viewport.addEventListener('mouseleave', () => startTimer());

    window.addEventListener('resize', () => { buildDots(); goTo(Math.min(current, total - getVisible())); });

    function startTimer() { timer = setInterval(next, 3500); }
    function resetTimer() { clearInterval(timer); startTimer(); }

    buildDots();
    startTimer();
  }

  animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const dur = 1300, start = performance.now();
    const step = (now) => {
      let p = Math.min((now - start) / dur, 1);
      p = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * p).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  nav(id) {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 58;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    if (this.state.navOpen) this.setState({ navOpen: false });
  }

  toggleTheme() {
    const t = this.state.theme === 'dark' ? 'light' : 'dark';
    this.setState({ theme: t });
    this.applyTheme(t);
    try { localStorage.setItem('jp-portfolio-theme', t); } catch(e) {}
  }

  async onFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    this.setState({ sending: true, toast: '' });
    try {
      const res = await fetch('https://formsubmit.co/ajax/5029c528dd85ab0c4d448453e38f90ac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const data = await res.json();
      if (data.success === 'true' || data.success === true) {
        this.setState({ sending: false, toast: "Thanks! I'll be in touch within 24h." });
        form.reset();
      } else {
        this.setState({ sending: false, toast: 'Something went wrong. Please try again.' });
      }
    } catch {
      this.setState({ sending: false, toast: 'Network error. Please try again.' });
    }
    clearTimeout(this._t);
    this._t = setTimeout(() => this.setState({ toast: '' }), 5000);
  }

  renderVals() {
    return {
      setRoot: (el) => { this.rootEl = el; if (el) this.applyTheme(this.state.theme); },
      themeIcon: this.state.theme === 'dark' ? '☀' : '☾',
      mobileMenuH: this.state.navOpen ? '320px' : '0px',
      toast: this.state.toast,
      showResume: this.state.showResume,
      toggleTheme: () => this.toggleTheme(),
      toggleNav: () => this.setState({ navOpen: !this.state.navOpen }),
      openResume: () => this.setState({ showResume: true, navOpen: false }),
      closeResume: () => this.setState({ showResume: false }),
      printResume: () => {
        const a = document.createElement('a');
        a.href = 'assets/resume/shaun-esua-mensah-resume.pdf';
        a.download = 'Shaun_Ato_Aifoli_Esua-Mensah_resume.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
      stop: (e) => e.stopPropagation(),
      submitLabel: this.state.sending ? 'Sending...' : 'Send message →',
      toastColor: this.state.toast.startsWith('Thanks') ? '#3fbf6a' : '#e53e3e',
      toastIcon: this.state.toast.startsWith('Thanks') ? '✓' : '✗',
      onFormSubmit: (e) => this.onFormSubmit(e),
      goHome: () => this.nav('home'),
      goWork: () => this.nav('work'),
      goAbout: () => this.nav('about'),
      goSkills: () => this.nav('skills'),
      goExp: () => this.nav('experience'),
      goContact: () => this.nav('contact'),
    };
  }
}; };

(() => {
  "use strict";

  const $ = (selector, scope = document) => scope?.querySelector(selector) ?? null;
  const $$ = (selector, scope = document) => scope ? [...scope.querySelectorAll(selector)] : [];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = () => window.innerWidth > 900;
  const root = document.documentElement;

  root.classList.add("js");
  $("#current-year").textContent = new Date().getFullYear();

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.scrollTo(0, 0);
  });

  /* Preloader com Web Animations API: executa uma vez e possui saída de segurança. */
  const preloader = $(".preloader");
  let preloaderFinished = false;

  const finishPreloader = () => {
    if (preloaderFinished) return;
    preloaderFinished = true;
    root.classList.add("page-ready", "motion-active");
    if (preloader) {
      preloader.style.display = "none";
      preloader.remove();
    }
  };

  const runPreloader = async () => {
    if (!preloader || reducedMotion || !Element.prototype.animate) {
      finishPreloader();
      return;
    }

    const word = $(".preloader-word", preloader);
    const letters = $$(".preloader-letter", preloader);
    const mobile = !desktop();
    const safetyTimer = window.setTimeout(finishPreloader, mobile ? 1100 : 1550);

    try {
      const wordIn = word.animate(
        [{ transform: "translateX(105vw)" }, { transform: "translateX(0)" }],
        { duration: mobile ? 340 : 480, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" }
      );
      const letterAnimations = letters.map((letter, index) => letter.animate(
        [{ transform: "translateY(115%)" }, { transform: "translateY(0)" }],
        { duration: mobile ? 330 : 420, delay: index * 60, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" }
      ));
      await Promise.all([wordIn.finished, ...letterAnimations.map((animation) => animation.finished)]);

      if (!mobile) {
        await word.animate(
          [{ transform: "translateX(0) scale(1)" }, { transform: "translate(-31vw,-34vh) scale(.16)" }],
          { duration: 300, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" }
        ).finished;
      }

      root.classList.add("page-ready");
      await preloader.animate(
        [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }],
        { duration: mobile ? 280 : 350, easing: "cubic-bezier(.76,0,.24,1)", fill: "both" }
      ).finished;
    } catch (_) {
      // O conteúdo nunca fica bloqueado se o navegador interromper uma animação.
    } finally {
      window.clearTimeout(safetyTimer);
      finishPreloader();
    }
  };

  runPreloader();

  /* Navegação móvel */
  const menuButton = $(".mobile-menu-button");
  const mobileMenu = $(".mobile-menu");

  const setMenu = (open) => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    mobileMenu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };

  menuButton?.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
  $$("a", mobileMenu).forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  /* Cópia de e-mail */
  $$("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const feedback = $(".copy-feedback", button);
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        if (feedback) feedback.textContent = "E-mail copiado";
      } catch (_) {
        if (feedback) feedback.textContent = button.dataset.copy;
      }
      button.classList.add("is-copied");
      window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (feedback) feedback.textContent = "Copiar e-mail";
      }, 1600);
    });
  });

  /* Revelações entram apenas quando próximas da viewport. */
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
  $$("[data-reveal]").forEach((element) => revealObserver.observe(element));

  const skillsSection = $(".skills-section");
  const chatWindow = $(".chat-window");
  const activityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-inview", entry.isIntersecting);
      if (entry.isIntersecting) entry.target.classList.add("has-entered");
    });
  }, { rootMargin: "25% 0px 25% 0px", threshold: 0.01 });
  if (skillsSection) activityObserver.observe(skillsSection);
  if (chatWindow) activityObserver.observe(chatWindow);

  /* Elementos e métricas usados pelo controlador de scroll. */
  const progressBar = $(".scroll-progress span");
  const sidebar = $(".sidebar");
  const sections = $$("[data-section]");
  const darkSections = $$("[data-theme='dark']");
  const hero = $(".hero");
  const heroWordmark = $(".hero-wordmark");
  const heroPortrait = $(".hero-portrait");
  const heroCenter = $(".hero-center-copy");
  const heroRole = $(".hero-card--role");
  const heroYears = $(".hero-card--years");
  const heroTraits = $(".hero-card--traits");
  const heroNav = $(".hero-nav-ghost");
  const journey = $(".journey");
  const journeyCards = $$(".journey-card");
  const journeyCurrent = $("#journey-current");
  const journeyPath = $(".journey-path-progress");
  const skillsTrack = $(".skills-track");
  const skillsViewport = $(".skills-viewport");
  const skillsProgress = $(".skills-progress i");
  const capabilityText = $(".capabilities-text");
  const capabilities = $(".capabilities");
  const capabilityOrbits = $$(".capability-orbits span");
  let capabilityChars = [];
  let frameRequested = false;

  const splitCapabilityText = () => {
    if (!capabilityText || capabilityText.dataset.split === "true") return;
    const process = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragment = document.createDocumentFragment();
          [...child.textContent].forEach((character) => {
            const span = document.createElement("span");
            span.className = "char";
            span.textContent = character;
            fragment.appendChild(span);
          });
          child.replaceWith(fragment);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          process(child);
        }
      });
    };
    process(capabilityText);
    capabilityText.dataset.split = "true";
    capabilityChars = $$(".char", capabilityText);
  };
  splitCapabilityText();

  const setTransform = (element, value) => {
    if (element) element.style.transform = value;
  };

  const updateHero = () => {
    if (!hero || !desktop() || reducedMotion) return;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < -50 || rect.top > window.innerHeight + 50) return;
    const distance = Math.max(1, rect.height - window.innerHeight);
    const progress = clamp(-rect.top / distance);

    setTransform(heroWordmark, `translateY(${-16 * progress}%) scale(${1 - .28 * progress})`);
    if (heroWordmark) heroWordmark.style.opacity = String(1 - .92 * progress);
    setTransform(heroPortrait, `translateX(-50%) translateY(${-6 * progress}%) scale(${1 - .22 * progress})`);
    if (heroPortrait) heroPortrait.style.opacity = String(1 - .72 * progress);
    setTransform(heroCenter, `translateY(${-110 * progress}px)`);
    if (heroCenter) heroCenter.style.opacity = String(1 - .82 * progress);
    setTransform(heroRole, `translate(${-100 * progress}px,${-45 * progress}px) scale(${1 - .28 * progress})`);
    setTransform(heroYears, `translate(${-80 * progress}px,${60 * progress}px) scale(${1 - .25 * progress})`);
    setTransform(heroTraits, `translate(${100 * progress}px,${-35 * progress}px) scale(${1 - .25 * progress})`);
    [heroRole, heroYears, heroTraits].forEach((card) => {
      if (card) card.style.opacity = String(1 - progress);
    });
    setTransform(heroNav, `translateY(${-30 * progress}px)`);
    if (heroNav) heroNav.style.opacity = String(1 - progress);
  };

  const updateJourney = () => {
    if (!journey || !desktop() || reducedMotion) return;
    const rect = journey.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const distance = Math.max(1, rect.height - window.innerHeight);
    const progress = clamp(-rect.top / distance);
    const position = progress * Math.max(1, journeyCards.length - 1);

    journeyCards.forEach((card, index) => {
      const delta = position - index;
      const distanceFromCenter = Math.min(1, Math.abs(delta));
      const opacity = clamp(1 - Math.abs(delta) * 1.55);
      const x = -50 - delta * 22;
      const y = -50 - delta * 18;
      const scale = 1 - distanceFromCenter * .3;
      card.style.opacity = String(opacity);
      card.style.transform = `translate(${x}%,${y}%) scale(${scale}) rotate(${-delta * 4}deg)`;
      card.style.pointerEvents = opacity > .55 ? "auto" : "none";
    });

    if (journeyCurrent) journeyCurrent.textContent = String(Math.round(position) + 1).padStart(2, "0");
    if (journeyPath) journeyPath.style.strokeDashoffset = String(2000 * (1 - progress));
  };

  const updateSkills = () => {
    if (!skillsSection || !skillsTrack || !skillsViewport || !desktop() || reducedMotion) return;
    const rect = skillsSection.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const distance = Math.max(1, rect.height - window.innerHeight);
    const progress = clamp(-rect.top / distance);
    const overflow = Math.max(0, skillsTrack.scrollWidth - skillsViewport.clientWidth + 24);
    setTransform(skillsTrack, `translate3d(${-overflow * progress}px,0,0)`);
    if (skillsProgress) skillsProgress.style.transform = `scaleX(${progress})`;
  };

  const updateCapabilities = () => {
    if (!capabilities || capabilityChars.length === 0 || reducedMotion) return;
    const rect = capabilities.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const progress = clamp((window.innerHeight * .88 - rect.top) / Math.max(1, rect.height * .62));
    const total = capabilityChars.length;

    capabilityChars.forEach((char, index) => {
      const local = clamp((progress - (index / total) * .62) / .18);
      const red = Math.round(187 + (12 - 187) * local);
      const green = Math.round(181 + (12 - 181) * local);
      const blue = Math.round(164 + (12 - 164) * local);
      char.style.color = `rgb(${red},${green},${blue})`;
      char.style.transform = `translateY(${(1 - local) * 4}px)`;
    });

    capabilityOrbits.forEach((orbit, index) => {
      const direction = index % 2 ? -1 : 1;
      orbit.style.transform = `translateY(${direction * (progress - .5) * 100}px) rotate(${direction * (progress - .5) * 18}deg)`;
    });
  };

  const updateNavigation = () => {
    const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progressBar) progressBar.style.transform = `scaleY(${clamp(window.scrollY / maximum)})`;

    const marker = window.innerHeight * .46;
    let active = "inicio";
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= marker && rect.bottom > marker) active = section.dataset.section;
    });
    $$("[data-nav]").forEach((link) => {
      const current = link.dataset.nav === active;
      link.classList.toggle("is-active", current);
      if (current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    const dark = darkSections.some((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top < marker && rect.bottom > marker;
    });
    sidebar?.classList.toggle("is-dark", dark);
  };

  const updateMotion = () => {
    frameRequested = false;
    updateNavigation();
    updateHero();
    updateJourney();
    updateSkills();
    updateCapabilities();
  };

  const requestMotion = () => {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(updateMotion);
  };

  window.addEventListener("scroll", requestMotion, { passive: true });
  window.addEventListener("resize", () => {
    if (!desktop()) {
      [heroWordmark, heroPortrait, heroCenter, heroRole, heroYears, heroTraits, heroNav, skillsTrack].forEach((element) => {
        if (!element) return;
        element.style.removeProperty("transform");
        element.style.removeProperty("opacity");
      });
      journeyCards.forEach((card) => {
        card.style.removeProperty("transform");
        card.style.removeProperty("opacity");
        card.style.removeProperty("pointer-events");
      });
    }
    requestMotion();
  }, { passive: true });
  requestMotion();

  /* Ações magnéticas com atualização limitada a um frame. */
  $$(".magnetic").forEach((element) => {
    let magneticFrame = 0;
    element.addEventListener("pointermove", (event) => {
      if (!desktop()) return;
      window.cancelAnimationFrame(magneticFrame);
      magneticFrame = window.requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .14;
        const y = (event.clientY - rect.top - rect.height / 2) * .18;
        element.style.transform = `translate(${x}px,${y}px)`;
      });
    });
    element.addEventListener("pointerleave", () => {
      element.style.transform = "translate(0,0)";
    });
  });

  /* Trilho arrastável no mobile. */
  if (skillsViewport) {
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    skillsViewport.addEventListener("pointerdown", (event) => {
      if (desktop()) return;
      dragging = true;
      startX = event.clientX;
      startScroll = skillsViewport.scrollLeft;
      skillsViewport.classList.add("is-dragging");
      skillsViewport.setPointerCapture(event.pointerId);
    });
    skillsViewport.addEventListener("pointermove", (event) => {
      if (dragging) skillsViewport.scrollLeft = startScroll - (event.clientX - startX);
    });
    const release = () => {
      dragging = false;
      skillsViewport.classList.remove("is-dragging");
    };
    skillsViewport.addEventListener("pointerup", release);
    skillsViewport.addEventListener("pointercancel", release);
  }

  /* Cursor contextual só existe enquanto o trilho está sob o ponteiro. */
  const dragCursor = $(".drag-cursor");
  const skillsSticky = $(".skills-sticky");
  if (dragCursor && skillsSticky && !reducedMotion) {
    skillsSticky.addEventListener("pointerenter", () => {
      if (desktop()) dragCursor.classList.add("is-visible");
    });
    skillsSticky.addEventListener("pointerleave", () => dragCursor.classList.remove("is-visible"));
    skillsSticky.addEventListener("pointermove", (event) => {
      if (!desktop()) return;
      dragCursor.style.left = `${event.clientX}px`;
      dragCursor.style.top = `${event.clientY}px`;
    });
  }

  /* Rastro do rodapé criado sob demanda e removido em seguida. */
  const footerLogo = $(".footer-logo");
  const trailLayer = $(".trail-layer");
  const trailWords = ["PROCESSOS", "DADOS", "EXCEL", "GESTÃO", "SAÚDE", "TECNOLOGIA"];
  let trailIndex = 0;
  let lastTrailX = 0;
  let lastTrailY = 0;

  footerLogo?.addEventListener("pointermove", (event) => {
    if (reducedMotion || !desktop() || !trailLayer) return;
    const rect = footerLogo.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (Math.hypot(x - lastTrailX, y - lastTrailY) < 55) return;
    lastTrailX = x;
    lastTrailY = y;

    const chip = document.createElement("span");
    chip.className = "trail-chip";
    chip.textContent = trailWords[trailIndex++ % trailWords.length];
    chip.style.left = `${x}px`;
    chip.style.top = `${y}px`;
    chip.style.setProperty("--rotate", `${(Math.random() - .5) * 22}deg`);
    trailLayer.appendChild(chip);

    requestAnimationFrame(() => {
      chip.style.transition = "transform .4s cubic-bezier(.22,1,.36,1), opacity .4s ease .85s";
      chip.style.transform = "translate(-50%,-50%) rotate(var(--rotate)) scale(1)";
      window.setTimeout(() => {
        chip.style.opacity = "0";
        chip.style.transform = "translate(-50%,-65%) rotate(var(--rotate)) scale(.75)";
      }, 850);
      window.setTimeout(() => chip.remove(), 1300);
    });
  });
})();

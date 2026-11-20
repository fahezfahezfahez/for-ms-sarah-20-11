(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const skyCanvas = $("#sky");
  const fireworksCanvas = $("#fireworks");
  const heartCanvas = $("#heartCanvas");
  const petalLayer = $("#petalLayer");
  const spinHeartBtn = $("#spinHeartBtn");

  const bgMusic = $("#bgMusic");
  const musicToggle = $("#musicToggle");
  const volumeSlider = $("#volumeSlider");
  const musicStatus = $("#musicStatus");

  const skyCtx = skyCanvas?.getContext("2d");
  const fireworksCtx = fireworksCanvas?.getContext("2d");
  const heartCtx = heartCanvas?.getContext("2d");

  let currentPage = "hero";
  let skyAnimationId = null;
  let heartAnimationId = null;
  let fireworksAnimationId = null;
  let resizeTimeout = null;
  let navigationToken = 0;

  let stars = [];
  let heartParticles = [];
  let fireworks = [];

  // Trạng thái xoay của trái tim & góc xoay lượng giác (radian)
  let isHeartSpinning = false;
  let angleY = 0;
  let angleX = 0;
  let isDraggingHeart = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  let heartLastTime = 0;
  let fireworksLastLaunch = 0;

  // ================================================
  // 1. PAGE SWITCHING
  // ================================================

  function showPage(id) {
    const nextPage = document.getElementById(id);

    if (!nextPage || id === currentPage) return;

    const oldPage = document.getElementById(currentPage);
    const token = ++navigationToken;

    if (oldPage) {
      oldPage.classList.remove("is-leaving");
      oldPage.classList.add("is-leaving");
    }

    window.setTimeout(() => {
      if (token !== navigationToken) return;

      if (oldPage) {
        oldPage.classList.remove("is-active", "is-leaving");
      }

      nextPage.classList.add("is-active");
      currentPage = id;

      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "auto" : "smooth"
      });

      if (id === "letterPage") {
        startLetterAnimation();
      }

      if (id === "finale") {
        startHeartAnimation();
        startFireworks();
      } else {
        stopFinaleAnimations();
      }
    }, reducedMotion ? 0 : 360);
  }

  $$("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  window.showPage = showPage;


  // ================================================
  // 2. LETTER ANIMATION
  // ================================================

  function startLetterAnimation() {
    const letter = $(".letter");
    if (!letter) return;

    letter.classList.remove("animate-in");
    void letter.offsetWidth;
    letter.classList.add("animate-in");
  }


  // ================================================
  // 3. BACKGROUND MUSIC
  // ================================================

  function setMusicStatus(message) {
    if (musicStatus) {
      musicStatus.textContent = message;
    }
  }

  function setMusicButton(isPlaying) {
    if (!musicToggle) return;

    musicToggle.textContent = isPlaying
      ? "♫ Pause Music"
      : "♫ Play Music";

    musicToggle.setAttribute(
      "aria-pressed",
      String(isPlaying)
    );
  }

  if (bgMusic) {
    bgMusic.loop = true;
    bgMusic.volume = volumeSlider
      ? Number(volumeSlider.value) / 100
      : 0.35;

    bgMusic.addEventListener("play", () => {
      setMusicButton(true);
      setMusicStatus("Music is playing ♪");
    });

    bgMusic.addEventListener("pause", () => {
      setMusicButton(false);
      setMusicStatus("Music is paused.");
    });

    bgMusic.addEventListener("ended", () => {
      setMusicButton(false);
    });

    bgMusic.addEventListener("canplay", () => {
      setMusicStatus("");
    });

    bgMusic.addEventListener("error", () => {
      setMusicButton(false);
      setMusicStatus(
        "Couldn't load music. Check if music.mp3 is in the folder."
      );
    });
  }

  if (musicToggle && bgMusic) {
    musicToggle.addEventListener("click", async () => {
      if (!bgMusic.paused) {
        bgMusic.pause();
        return;
      }

      setMusicStatus("Loading music...");

      try {
        await bgMusic.play();
      } catch (error) {
        console.error("Music error:", error);

        setMusicButton(false);
        setMusicStatus(
          "Can't play music right now. Check music.mp3 and try again."
        );
      }
    });
  }

  if (volumeSlider && bgMusic) {
    volumeSlider.addEventListener("input", () => {
      const volume = Number(volumeSlider.value) / 100;

      bgMusic.volume = Math.max(0, Math.min(1, volume));

      if (volume === 0) {
        setMusicStatus("Volume is muted (0%).");
      } else if (!bgMusic.paused) {
        setMusicStatus("Music is playing ♪");
      }
    });
  }


  // ================================================
  // 4. CANVAS SIZE SETUP
  // ================================================

  function setupCanvas(canvas, ctx, width, height) {
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }


  // ================================================
  // 5. STARRY BACKGROUND
  // ================================================

  function resizeSky() {
    if (!skyCanvas || !skyCtx) return;

    setupCanvas(
      skyCanvas,
      skyCtx,
      window.innerWidth,
      window.innerHeight
    );

    stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.65 + 0.2,
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: Math.random() * 0.006 + 0.002
    }));
  }

  function drawSky() {
    if (!skyCtx) return;

    skyCtx.clearRect(
      0, 0,
      window.innerWidth,
      window.innerHeight
    );

    for (const star of stars) {
      star.alpha += star.speed * star.direction;

      if (star.alpha > 0.95 || star.alpha < 0.15) {
        star.direction *= -1;
      }

      skyCtx.beginPath();
      skyCtx.arc(
        star.x,
        star.y,
        star.radius,
        0,
        Math.PI * 2
      );

      skyCtx.fillStyle =
        `rgba(255, 225, 246, ${star.alpha})`;

      skyCtx.fill();
    }

    if (!reducedMotion) {
      skyAnimationId = requestAnimationFrame(drawSky);
    }
  }


  // ================================================
  // 6. FALLING PETALS
  // ================================================

  function createPetals() {
    if (!petalLayer) return;

    petalLayer.replaceChildren();

    if (reducedMotion) return;

    for (let i = 0; i < 18; i++) {
      const petal = document.createElement("span");

      petal.className = "petal";
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDelay = `${Math.random() * -15}s`;
      petal.style.animationDuration =
        `${9 + Math.random() * 10}s`;

      petalLayer.appendChild(petal);
    }
  }


  // ================================================
  // 7. 3D PARTICLE HEART (TRIGONOMETRIC ROTATION)
  // ================================================

  function heartPoint(t) {
    return {
      x: 16 * Math.pow(Math.sin(t), 3),
      y: -(
        13 * Math.cos(t)
        - 5 * Math.cos(2 * t)
        - 2 * Math.cos(3 * t)
        - Math.cos(4 * t)
      )
    };
  }

  function rotateTrigonometric(x, y, z, thetaY, thetaX) {
    const cosY = Math.cos(thetaY);
    const sinY = Math.sin(thetaY);
    const cosX = Math.cos(thetaX);
    const sinX = Math.sin(thetaX);

    // Xoay quanh trục Y bằng cos và sin
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    // Xoay quanh trục X bằng cos và sin
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    return { x: x1, y: y2, z: z2 };
  }

  function updateSpinButtonUI() {
    if (!spinHeartBtn) return;

    spinHeartBtn.textContent = isHeartSpinning
      ? "❚❚ Pause Spin"
      : "♥ Start Spinning";
    spinHeartBtn.setAttribute("aria-pressed", String(isHeartSpinning));
  }

  if (spinHeartBtn) {
    spinHeartBtn.addEventListener("click", () => {
      isHeartSpinning = !isHeartSpinning;
      updateSpinButtonUI();

      // Khởi động lại vòng lặp vẽ ngay khi bấm nút (kể cả khi máy bật Reduced Motion)
      if (currentPage === "finale" && heartAnimationId === null) {
        heartLastTime = performance.now();
        heartAnimationId = requestAnimationFrame(drawHeart);
      }
    });
  }

  function resizeHeart() {
    if (!heartCanvas || !heartCtx) return;

    const stage = heartCanvas.parentElement;

    const width = stage?.clientWidth || 500;
    const height = stage?.clientHeight || 380;

    setupCanvas(heartCanvas, heartCtx, width, height);

    heartParticles = [];

    for (let i = 0; i < 850; i++) {
      const t = Math.random() * Math.PI * 2;
      const point = heartPoint(t);

      const fill = Math.sqrt(Math.random());
      const thickness = (1 - fill * 0.5) * 8;

      heartParticles.push({
        x: point.x * fill,
        y: point.y * fill,
        z: (Math.random() - 0.5) * 2 * thickness,
        size: Math.random() * 1.6 + 0.5,
        alpha: Math.random() * 0.55 + 0.4
      });
    }
  }

  if (heartCanvas) {
    heartCanvas.style.cursor = "grab";
    heartCanvas.style.touchAction = "none";

    heartCanvas.addEventListener("pointerdown", (e) => {
      isDraggingHeart = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      heartCanvas.style.cursor = "grabbing";
    });

    window.addEventListener("pointermove", (e) => {
      if (!isDraggingHeart) return;

      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      angleY += dx * 0.014;
      angleX = Math.max(-0.75, Math.min(0.75, angleX + dy * 0.012));

      if (heartAnimationId === null && currentPage === "finale") {
        drawHeart(performance.now());
      }
    });

    window.addEventListener("pointerup", () => {
      if (!isDraggingHeart) return;
      isDraggingHeart = false;
      heartCanvas.style.cursor = "grab";
    });
  }

  function drawHeart(time = 0) {
    if (!heartCtx || currentPage !== "finale") {
      heartAnimationId = null;
      return;
    }

    const stage = heartCanvas.parentElement;
    const width = stage?.clientWidth || 500;
    const height = stage?.clientHeight || 380;

    heartCtx.clearRect(0, 0, width, height);

    if (heartLastTime === 0) {
      heartLastTime = time;
    }

    const delta = Math.min(time - heartLastTime, 40);
    heartLastTime = time;

    // Khi người dùng bấm nút "Start Spinning", trái tim xoay đều 360° theo lượng giác
    if (isHeartSpinning && !isDraggingHeart) {
      angleY += delta * 0.0022;
      angleX = Math.sin(time * 0.002) * 0.25;
    }

    const pulse = isHeartSpinning
      ? 1 + Math.sin(time * 0.004) * 0.04
      : 1;

    const scale = Math.min(width / 39, height / 34) * 0.82 * pulse;
    const centerX = width / 2;
    const centerY = height / 2;

    const projected = heartParticles.map((p) => {
      const rot = rotateTrigonometric(p.x, p.y, p.z, angleY, angleX);
      const perspective = 260 / (260 + rot.z * 2.4);

      return {
        x: centerX + rot.x * scale * perspective,
        y: centerY + rot.y * scale * perspective,
        z: rot.z,
        radius: Math.max(0.35, p.size * perspective),
        alpha: Math.min(1, Math.max(0.2, p.alpha * perspective))
      };
    });

    projected.sort((a, b) => b.z - a.z);

    for (const dot of projected) {
      heartCtx.beginPath();
      heartCtx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);

      heartCtx.fillStyle = `rgba(255, 125, 195, ${dot.alpha})`;
      heartCtx.shadowBlur = 9;
      heartCtx.shadowColor = "rgba(255, 65, 170, 0.85)";
      heartCtx.fill();
    }

    heartCtx.shadowBlur = 0;

    if (!reducedMotion || isHeartSpinning) {
      heartAnimationId = requestAnimationFrame(drawHeart);
    } else {
      heartAnimationId = null;
    }
  }

  function startHeartAnimation() {
    if (!heartCanvas || !heartCtx) return;
    if (heartAnimationId !== null) return;

    resizeHeart();
    heartLastTime = 0;

    if (reducedMotion && !isHeartSpinning) {
      drawHeart(0);
    } else {
      heartAnimationId = requestAnimationFrame(drawHeart);
    }
  }


  // ================================================
  // 8. FIREWORKS
  // ================================================

  function resizeFireworks() {
    if (!fireworksCanvas || !fireworksCtx) return;

    setupCanvas(
      fireworksCanvas,
      fireworksCtx,
      window.innerWidth,
      window.innerHeight
    );
  }

  function launchFirework(x, y) {
    const colors = [
      [255, 112, 188],
      [255, 220, 140],
      [190, 145, 255],
      [130, 225, 255],
      [255, 155, 170]
    ];

    const color = colors[
      Math.floor(Math.random() * colors.length)
    ];

    const count = 75;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.6 + 0.6;

      fireworks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: Math.random() * 0.012 + 0.008,
        size: Math.random() * 1.8 + 0.6,
        color
      });
    }
  }

  function drawFireworks(time = 0) {
    if (!fireworksCtx || currentPage !== "finale") {
      fireworksAnimationId = null;
      return;
    }

    fireworksCtx.clearRect(
      0, 0,
      window.innerWidth,
      window.innerHeight
    );

    if (time - fireworksLastLaunch > 720) {
      launchFirework(
        window.innerWidth * (0.12 + Math.random() * 0.76),
        window.innerHeight * (0.12 + Math.random() * 0.42)
      );

      fireworksLastLaunch = time;
    }

    fireworks = fireworks.filter(
      (particle) => particle.life > 0
    );

    for (const particle of fireworks) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      particle.vy += 0.025;
      particle.vx *= 0.992;
      particle.vy *= 0.992;
      particle.life -= particle.decay;

      const [r, g, b] = particle.color;

      fireworksCtx.beginPath();
      fireworksCtx.arc(
        particle.x,
        particle.y,
        particle.size,
        0,
        Math.PI * 2
      );

      fireworksCtx.fillStyle =
        `rgba(${r}, ${g}, ${b}, ${Math.max(0, particle.life)})`;

      fireworksCtx.shadowBlur = 12;
      fireworksCtx.shadowColor = `rgb(${r}, ${g}, ${b})`;
      fireworksCtx.fill();
    }

    fireworksCtx.shadowBlur = 0;

    if (!reducedMotion) {
      fireworksAnimationId = requestAnimationFrame(drawFireworks);
    } else {
      fireworksAnimationId = null;
    }
  }

  function startFireworks() {
    if (!fireworksCanvas || !fireworksCtx) return;
    if (fireworksAnimationId !== null) return;

    resizeFireworks();
    fireworks = [];

    launchFirework(
      window.innerWidth * 0.25,
      window.innerHeight * 0.28
    );

    launchFirework(
      window.innerWidth * 0.5,
      window.innerHeight * 0.2
    );

    launchFirework(
      window.innerWidth * 0.75,
      window.innerHeight * 0.32
    );

    fireworksLastLaunch = 0;

    if (reducedMotion) {
      drawFireworks(1000);
    } else {
      fireworksAnimationId = requestAnimationFrame(drawFireworks);
    }
  }


  // ================================================
  // 9. STOP FINALE ANIMATIONS
  // ================================================

  function stopFinaleAnimations() {
    isHeartSpinning = false;
    updateSpinButtonUI();

    if (heartAnimationId !== null) {
      cancelAnimationFrame(heartAnimationId);
      heartAnimationId = null;
    }

    if (fireworksAnimationId !== null) {
      cancelAnimationFrame(fireworksAnimationId);
      fireworksAnimationId = null;
    }

    fireworks = [];

    if (fireworksCtx) {
      fireworksCtx.clearRect(
        0, 0,
        window.innerWidth,
        window.innerHeight
      );
    }

    if (heartCtx && heartCanvas) {
      const stage = heartCanvas.parentElement;

      heartCtx.clearRect(
        0, 0,
        stage?.clientWidth || 500,
        stage?.clientHeight || 380
      );
    }

    heartLastTime = 0;
  }


  // ================================================
  // 10. INIT & RESIZE
  // ================================================

  function init() {
    updateSpinButtonUI();
    resizeSky();
    resizeFireworks();
    resizeHeart();
    createPetals();

    if (reducedMotion) {
      drawSky();
    } else {
      skyAnimationId = requestAnimationFrame(drawSky);
    }
  }

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
      resizeSky();
      resizeFireworks();

      if (currentPage === "finale") {
        resizeHeart();

        if (reducedMotion && !isHeartSpinning) {
          drawHeart(0);
          drawFireworks(1000);
        }
      }

      if (reducedMotion) {
        drawSky();
      }
    }, 120);
  });

  init();
})();
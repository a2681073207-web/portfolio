(() => {
  "use strict";

  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lerp = (a, b, n) => a + (b - a) * n;

  const finishLoading = () => {
    window.setTimeout(() => body.classList.add("is-loaded"), 320);
  };

  if (document.readyState === "complete") {
    finishLoading();
  } else {
    window.addEventListener("load", finishLoading, { once: true });
    window.setTimeout(() => body.classList.add("is-loaded"), 1500);
  }

  const timeNode = document.getElementById("localTime");
  const updateTime = () => {
    if (!timeNode) return;
    timeNode.textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date());
  };
  updateTime();
  window.setInterval(updateTime, 1000);

  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const closeMenu = () => {
    body.classList.remove("menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  };

  menuToggle?.addEventListener("click", () => {
    const isOpen = body.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  const revealNodes = [...document.querySelectorAll("[data-reveal]")];
  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -7% 0px" });
    revealNodes.forEach((node, index) => {
      node.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
      revealObserver.observe(node);
    });
  } else {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  }

  const hero = document.querySelector(".hero");
  const stage = null;
  const pointerHint = document.getElementById("pointerHint");
  const heroAura = document.getElementById("heroAura");
  const cursor = document.getElementById("cursor");
  const cursorLabel = cursor?.querySelector(".cursor__label");
  const heroImages = [];


  heroImages.forEach((src) => {
    const image = new Image();
    image.src = src;
  });

  let heroVisible = true;
  let heroInView = true;
  let imageIndex = 0;
  let lastCycle = 0;
  let lastPointerMove = 0;
  let pointerMoved = false;
  let lastAutoSpawn = 0;
  const planes = [];
  const cursorState = { x: window.innerWidth / 2, y: window.innerHeight / 2, currentX: window.innerWidth / 2, currentY: window.innerHeight / 2 };
  const pointer = { x: window.innerWidth * 0.55, y: window.innerHeight * 0.47 };
  heroAura?.style.setProperty("--aura-x", `${pointer.x}px`);
  heroAura?.style.setProperty("--aura-y", `${pointer.y}px`);

  if ("IntersectionObserver" in window && hero) {
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroInView = entry.isIntersecting;
    }, { threshold: 0.12 });
    heroObserver.observe(hero);
  }

  const setPointerFromClient = (clientX, clientY) => {
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    pointer.x = clientX - rect.left;
    pointer.y = clientY - rect.top;
    heroAura?.style.setProperty("--aura-x", `${pointer.x}px`);
    heroAura?.style.setProperty("--aura-y", `${pointer.y}px`);
    cursorState.x = clientX;
    cursorState.y = clientY;
  };

  const removePlane = (plane) => {
    if (!plane || plane.dataset.leaving === "true") return;
    plane.dataset.leaving = "true";
    plane.classList.add("is-leaving");
    window.setTimeout(() => plane.remove(), 520);
  };

  const spawnPlane = (now = performance.now()) => {
    if (!stage || !heroInView || reducedMotion.matches || document.hidden) return;

    const imageSrc = heroImages[imageIndex % heroImages.length];
    imageIndex += 1;

    const plane = document.createElement("div");
    plane.className = "pointer-plane";
    plane.dataset.leaving = "false";
    plane.dataset.born = String(now);
    plane.dataset.rot = String((Math.random() - 0.5) * 5);
    plane.dataset.drift = String((Math.random() - 0.5) * 48);
    plane.dataset.scale = String(0.96 + Math.random() * 0.08);

    const image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";
    image.addEventListener("load", () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const ratio = image.naturalWidth / image.naturalHeight;
      let width;
      let height;
      if (ratio >= 1) {
        width = clamp(window.innerWidth * 0.30, 260, 460);
        height = width / ratio;
      } else {
        height = clamp(window.innerHeight * 0.29, 180, 315);
        width = height * ratio;
      }
      plane.style.width = `${width.toFixed(2)}px`;
      plane.style.height = `${height.toFixed(2)}px`;
      const loadedRect = plane.getBoundingClientRect();
      plane.dataset.width = String(loadedRect.width || width);
      plane.dataset.height = String(loadedRect.height || height);
    }, { once: true });
    image.src = imageSrc;
    plane.appendChild(image);
    stage.appendChild(plane);

    const rect = plane.getBoundingClientRect();
    plane.dataset.width = String(rect.width || 190);
    plane.dataset.height = String(rect.height || 260);
    plane.dataset.x = String(pointer.x);
    plane.dataset.y = String(pointer.y);

    planes.push(plane);
    window.requestAnimationFrame(() => plane.classList.add("is-visible"));

    while (planes.length > 1) removePlane(planes.shift());
    window.setTimeout(() => removePlane(plane), 1700);
    lastCycle = now;
  };

  const updatePlanes = (now) => {
    for (let i = planes.length - 1; i >= 0; i -= 1) {
      const plane = planes[i];
      if (!plane.isConnected) {
        planes.splice(i, 1);
        continue;
      }

      const age = now - Number(plane.dataset.born || now);
      const departed = plane.dataset.leaving === "true";
      const targetScale = Number(plane.dataset.scale || 1) * (departed ? 0.88 : 1);
      const targetX = pointer.x + Number(plane.dataset.drift || 0) * Math.sin(age / 620 + i);
      const targetY = pointer.y - i * 7 - age * 0.009;
      const x = lerp(Number(plane.dataset.x || targetX), targetX, 0.07);
      const y = lerp(Number(plane.dataset.y || targetY), targetY, 0.07);
      const width = Number(plane.dataset.width || 190);
      const height = Number(plane.dataset.height || 260);
      const rotation = Number(plane.dataset.rot || 0) * (departed ? 0.55 : 1);

      plane.dataset.x = String(x);
      plane.dataset.y = String(y);
      plane.style.transform = `translate3d(${x - width / 2}px, ${y - height / 2}px, 0) rotate(${rotation}deg) scale(${targetScale})`;
    }
  };

  const animate = (now) => {
    const cursorEase = finePointer.matches ? 0.2 : 1;
    cursorState.currentX = lerp(cursorState.currentX, cursorState.x, cursorEase);
    cursorState.currentY = lerp(cursorState.currentY, cursorState.y, cursorEase);
    if (cursor) {
      cursor.style.transform = `translate3d(${cursorState.currentX}px, ${cursorState.currentY}px, 0) translate(-50%, -50%)`;
    }

    updatePlanes(now);

    if (heroVisible && now - lastAutoSpawn > 1650 && now - lastPointerMove > 1900 && !reducedMotion.matches) {
      lastAutoSpawn = now;
      if (!pointerMoved) {
        pointer.x = hero ? hero.clientWidth * (0.43 + Math.random() * 0.22) : window.innerWidth * 0.55;
        pointer.y = hero ? hero.clientHeight * (0.28 + Math.random() * 0.33) : window.innerHeight * 0.45;
      }
      spawnPlane(now);
    }

    window.requestAnimationFrame(animate);
  };

  window.requestAnimationFrame(animate);

  hero?.addEventListener("pointermove", (event) => {
    if (!finePointer.matches || reducedMotion.matches) return;
    heroVisible = true;
    pointerMoved = true;
    setPointerFromClient(event.clientX, event.clientY);
    lastPointerMove = performance.now();
    pointerHint?.classList.add("is-hidden");
    if (performance.now() - lastCycle > 300) spawnPlane();
  }, { passive: true });

  hero?.addEventListener("pointerleave", () => {
    pointerMoved = false;
  });

  if (finePointer.matches && !reducedMotion.matches) {
    window.addEventListener("pointermove", (event) => {
      cursorState.x = event.clientX;
      cursorState.y = event.clientY;
      cursor?.classList.add("is-visible");

      const interactive = event.target.closest("a, button");
      cursor?.classList.toggle("is-active", Boolean(interactive));
      if (cursorLabel) {
        cursorLabel.textContent = interactive?.matches("[data-project]") ? "OPEN" : interactive ? "GO" : "MOVE";
      }
    }, { passive: true });

    document.addEventListener("mouseleave", () => cursor?.classList.remove("is-visible"));
  } else {
    cursor?.remove();
  }

  const projects = {
    five: {
      "index": "01 / 05",
      "tag": "PRODUCT DESIGN · A—F",
      "title": "Product Boards",
      "zh": "智能产品设计展板合集",
      "type": "Industrial Design / Product Systems",
      "description": "Six intelligent product directions presented in full a–f source order.",
      items: [
        {"type":"image","src":"library/boards-a-01.webp","label":"a01 / [砺]船体锈蚀切割一体机1.jpg","width":2560,"height":3622,"letter":"a"},
        {"type":"image","src":"library/boards-a-02.webp","label":"a02 / [砺]船体锈蚀切割一体机2.jpg","width":2560,"height":3622,"letter":"a"},
        {"type":"image","src":"library/boards-b-01.webp","label":"b01 / PURE.河道清淤泥装备1.jpg","width":3508,"height":4961,"letter":"b"},
        {"type":"image","src":"library/boards-b-02.webp","label":"b02 / PURE.河道清淤泥装备2.jpg","width":3508,"height":4961,"letter":"b"},
        {"type":"image","src":"library/boards-b-03.webp","label":"b03 / PURE.河道清淤泥装备3.jpg","width":3508,"height":4961,"letter":"b"},
        {"type":"image","src":"library/boards-c-01.webp","label":"c01 / 古建筑修复机器1.jpg","width":1280,"height":1811,"letter":"c"},
        {"type":"image","src":"library/boards-c-02.webp","label":"c02 / 古建筑修复机器2.jpg","width":1280,"height":1811,"letter":"c"},
        {"type":"image","src":"library/boards-c-03.webp","label":"c03 / 古建筑修复机器3.jpg","width":1280,"height":1811,"letter":"c"},
        {"type":"image","src":"library/boards-d-01.webp","label":"d01 / 农作专家机器1.jpg","width":1280,"height":1811,"letter":"d"},
        {"type":"image","src":"library/boards-d-02.webp","label":"d02 / 农作专家机器2.jpg","width":1280,"height":1811,"letter":"d"},
        {"type":"image","src":"library/boards-d-03.webp","label":"d03 / 农作专家机器3.jpg","width":1920,"height":2717,"letter":"d"},
        {"type":"image","src":"library/boards-e-01.webp","label":"e01 / 矿用应急搜救与排水一体化机器1.jpg","width":1787,"height":2527,"letter":"e"},
        {"type":"image","src":"library/boards-e-02.webp","label":"e02 / 矿用应急搜救与排水一体化机器2.jpg","width":1192,"height":1685,"letter":"e"},
        {"type":"image","src":"library/boards-e-03.webp","label":"e03 / 矿用应急搜救与排水一体化机器3.jpg","width":1192,"height":1685,"letter":"e"},
        {"type":"image","src":"library/boards-f-01.webp","label":"f01 / 适老助餐辅具1.jpg","width":1280,"height":1811,"letter":"f"},
        {"type":"image","src":"library/boards-f-02.webp","label":"f02 / 适老助餐辅具2.jpg","width":1280,"height":1812,"letter":"f"},
        {"type":"image","src":"library/boards-f-03.webp","label":"f03 / 适老助餐辅具3.jpg","width":1280,"height":1811,"letter":"f"}
      ]
    },
    yi: {
      "index": "05 / 05",
      "tag": "VISUAL / CULTURE",
      "title": "Yi Chronicle",
      "zh": "焰绣银章：彝族非遗文化基因活化图鉴",
      "type": "Information Design / Cultural Research",
      "description": "An information atlas that translates Yi cultural symbols, craft and ritual knowledge into a navigable visual language.",
      items: [
              {
                      "type": "image",
                      "src": "library/yi-information-visualization.jpg",
                      "label": "彝族信息可视化.jpg",
                      "width": 5026,
                      "height": 7107
              },
              {
                      "type": "image",
                      "src": "library/yi-fire-festival-cover.webp",
                      "label": "b《彝族火把节》封面.jpg",
                      "width": 4961,
                      "height": 3508
              },
              {
                      "type": "video",
                      "src": "library/1-e.mp4",
                      "label": "c彝族视频.mp4"
              },
              {
                      "type": "video",
                      "src": "library/1-f.mp4",
                      "label": "d彝族视频.MP4"
              }
      ]
    },
    byd: {
      "index": "02 / 05",
      "tag": "AUTOMOTIVE HMI · UX / UI",
      "title": "BYD Intelligent Cockpit",
      "zh": "比亚迪智能座舱 HMI 体验设计",
      "type": "Automotive HMI / UX / UI",
      "description": "A modular cockpit experience that keeps critical driving information legible, calm and immediately actionable.",
      items: [
              {
                      "type": "image",
                      "src": "library/3-hmi-long.jpg",
                      "label": "a比亚迪HMI设计长图.jpg",
                      "width": 1238,
                      "height": 18656
              },
              {
                      "type": "video",
                      "src": "library/2-a.mp4",
                      "label": "b中控交互视频.mp4"
              }
      ]
    },
    mediflow: {
      "index": "03 / 05",
      "tag": "SERVICE DESIGN · MOBILE UX",
      "title": "MediFlow",
      "zh": "预约挂号 App 用户体验设计",
      "type": "Service Design / Mobile UX",
      "description": "A calmer appointment and registration journey built around clarity, reassurance and fewer decision points for first-time users.",
      items: [
              {
                      "type": "image",
                      "src": "library/4-app-long.jpg",
                      "label": "a长图.png",
                      "width": 1920,
                      "height": 23370
              },
              {
                      "type": "video",
                      "src": "library/3-a.mp4",
                      "label": "b预约挂号.mp4"
              }
      ]
    },
    poluo: {
      "index": "04 / 05",
      "tag": "INTERACTION / EXPERIENCE",
      "title": "坡见龙门",
      "zh": "文化交互产品与可操作原型设计",
      "type": "Interaction Design / Experience Prototype",
      "description": "A cultural interaction prototype combining spatial storytelling, screen feedback and an operable experience flow.",
      items: [
              {
                      "type": "video",
                      "src": "library/4-a.mp4",
                      "label": "a演示视频.mp4"
              },
              {
                      "type": "image",
                      "src": "library/4-b.webp",
                      "label": "b封面.png",
                      "width": 1672,
                      "height": 941
              },
              {
                      "type": "image",
                      "src": "library/4-c.webp",
                      "label": "c图片.png",
                      "width": 1600,
                      "height": 900
              },
              {
                      "type": "file",
                      "name": "d坡见龙门展示.pptx",
                      "ext": "PPTX"
              }
      ]
    },
    hull: {
      "index": "01A / 05",
      "tag": "MARINE ROBOTICS",
      "title": "Hull Lab",
      "zh": "船体锈蚀切割一体机",
      "type": "Industrial Design / Marine Robotics",
      "description": "Automated inspection and precision processing for difficult-to-reach hull surfaces, designed to improve safety and repeatability.",
      items: [
        {"type":"image","src":"library/boards-a-01.webp","label":"a01 / [砺]船体锈蚀切割一体机1.jpg","width":2560,"height":3622,"letter":"a"},
        {"type":"image","src":"library/boards-a-02.webp","label":"a02 / [砺]船体锈蚀切割一体机2.jpg","width":2560,"height":3622,"letter":"a"}
      ]
    },
    pure: {
      "index": "01B / 05",
      "tag": "ENVIRONMENTAL PRODUCT",
      "title": "Pure River",
      "zh": "PURE 河道清淤装备",
      "type": "Product System / Sustainability",
      "description": "A river maintenance system designed around efficient collection, low disturbance and a clearer operational footprint.",
      items: [
        {"type":"image","src":"library/boards-b-01.webp","label":"b01 / PURE.河道清淤泥装备1.jpg","width":3508,"height":4961,"letter":"b"},
        {"type":"image","src":"library/boards-b-02.webp","label":"b02 / PURE.河道清淤泥装备2.jpg","width":3508,"height":4961,"letter":"b"},
        {"type":"image","src":"library/boards-b-03.webp","label":"b03 / PURE.河道清淤泥装备3.jpg","width":3508,"height":4961,"letter":"b"}
      ]
    },
    heritage: {
      "index": "01C / 05",
      "tag": "CULTURAL TECHNOLOGY",
      "title": "Heritage Repair",
      "zh": "古建筑修复机器人",
      "type": "Robotics / Cultural Technology",
      "description": "A precision repair concept explored for fragile architectural surfaces, where access, control and preservation must work together.",
      items: [
        {"type":"image","src":"library/boards-c-01.webp","label":"c01 / 古建筑修复机器1.jpg","width":1280,"height":1811,"letter":"c"},
        {"type":"image","src":"library/boards-c-02.webp","label":"c02 / 古建筑修复机器2.jpg","width":1280,"height":1811,"letter":"c"},
        {"type":"image","src":"library/boards-c-03.webp","label":"c03 / 古建筑修复机器3.jpg","width":1280,"height":1811,"letter":"c"}
      ]
    },
    mine: {
      "index": "01E / 05",
      "tag": "EMERGENCY ROBOTICS",
      "title": "Deep Rescue",
      "zh": "矿用应急搜救与排水一体化机器",
      "type": "Industrial Design / Robotics",
      "description": "An integrated emergency platform combining search support, environmental sensing and high-capacity drainage in one compact system.",
      items: [
        {"type":"image","src":"library/boards-e-01.webp","label":"e01 / 矿用应急搜救与排水一体化机器1.jpg","width":1787,"height":2527,"letter":"e"},
        {"type":"image","src":"library/boards-e-02.webp","label":"e02 / 矿用应急搜救与排水一体化机器2.jpg","width":1192,"height":1685,"letter":"e"},
        {"type":"image","src":"library/boards-e-03.webp","label":"e03 / 矿用应急搜救与排水一体化机器3.jpg","width":1192,"height":1685,"letter":"e"}
      ]
    },
    agri: {
      "index": "01D / 05",
      "tag": "AGRICULTURAL ROBOTICS",
      "title": "Agri Expert",
      "zh": "农作专家机器人",
      "type": "Robotics / Product Design",
      "description": "A field-oriented robotic companion that supports monitoring, guidance and precision work in demanding agricultural environments.",
      items: [
        {"type":"image","src":"library/boards-d-01.webp","label":"d01 / 农作专家机器1.jpg","width":1280,"height":1811,"letter":"d"},
        {"type":"image","src":"library/boards-d-02.webp","label":"d02 / 农作专家机器2.jpg","width":1280,"height":1811,"letter":"d"},
        {"type":"image","src":"library/boards-d-03.webp","label":"d03 / 农作专家机器3.jpg","width":1920,"height":2717,"letter":"d"}
      ]
    },
    care: {
      "index": "01F / 05",
      "tag": "INCLUSIVE DESIGN",
      "title": "Care Assist",
      "zh": "适老助餐辅具",
      "type": "Inclusive Design / Product System",
      "description": "A dining support concept that aims to preserve dignity, independence and comfort for older users through thoughtful detail.",
      items: [
        {"type":"image","src":"library/boards-f-01.webp","label":"f01 / 适老助餐辅具1.jpg","width":1280,"height":1811,"letter":"f"},
        {"type":"image","src":"library/boards-f-02.webp","label":"f02 / 适老助餐辅具2.jpg","width":1280,"height":1812,"letter":"f"},
        {"type":"image","src":"library/boards-f-03.webp","label":"f03 / 适老助餐辅具3.jpg","width":1280,"height":1811,"letter":"f"}
      ]
    }

  };


const honors = [
    {
      "src": "library/honor-01.webp",
      "title": "UVADC国3等奖",
      "width": 4960,
      "height": 7015
    },
    {
      "src": "library/honor-03.webp",
      "title": "东方设计奖国2",
      "width": 1190,
      "height": 1666
    },
    {
      "src": "library/honor-04.webp",
      "title": "东方设计奖国3",
      "width": 1190,
      "height": 1666
    },
    {
      "src": "library/honor-05.webp",
      "title": "东方设计奖省2",
      "width": 1190,
      "height": 1666
    },
    {
      "src": "library/honor-08.webp",
      "title": "大文赛国1（矿井救援）",
      "width": 2480,
      "height": 3508
    },
    {
      "src": "library/honor-09.webp",
      "title": "大文赛国1（震后外骨骼）",
      "width": 2480,
      "height": 3508
    },
    {
      "src": "library/honor-10.webp",
      "title": "好创意国三（彝族火把节）",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-11.webp",
      "title": "好创意国三（雪地车）",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-12.webp",
      "title": "好创意国三（露营灯）",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-13.webp",
      "title": "未来设计国2",
      "width": 4898,
      "height": 6872
    },
    {
      "src": "library/honor-14.webp",
      "title": "未来设计省1",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-15.webp",
      "title": "未来设计省2",
      "width": 4762,
      "height": 6735
    }
  ];





  const honorDialog = document.getElementById("honorDialog");
  const honorFlow = document.getElementById("honorFlow");
  const honorFlowStage = document.getElementById("honorFlowStage");
  const honorFlowCurrent = document.getElementById("honorFlowCurrent");
  const honorFlowTotal = document.getElementById("honorFlowTotal");
  let honorFlowActive = 9;
  let honorFlowCards = [];

  const updateHonorFlow = (nextIndex) => {
    if (!honors.length || !honorFlowStage) return;
    honorFlowActive = Math.max(0, Math.min(honors.length - 1, Number(nextIndex) || 0));
    const width = honorFlowStage.clientWidth || window.innerWidth;
    const spread = Math.max(105, Math.min(210, width * 0.145));
    honorFlowCards.forEach((card, index) => {
      const position = index - honorFlowActive;
      const visiblePosition = Math.max(-4, Math.min(4, position));
      const distance = Math.abs(visiblePosition);
      const isFolded = Math.abs(position) > 4;
      const x = isFolded ? (position < 0 ? -width * 0.62 : width * 0.62) : visiblePosition * spread;
      const y = isFolded ? 130 : distance * 28;
      const z = isFolded ? -780 : -distance * 105;
      const rotateY = isFolded ? (position < 0 ? 68 : -68) : (visiblePosition === 0 ? 0 : (visiblePosition > 0 ? -48 : 48));
      const rotateZ = isFolded ? (position < 0 ? -8 : 8) : visiblePosition * -2.4;
      const scale = isFolded ? 0.48 : 1 - distance * 0.062;
      const opacity = isFolded ? 0 : 1;
      card.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      card.style.opacity = String(opacity);
      card.style.zIndex = String(120 - Math.round(distance * 10));
      card.classList.toggle("is-active", position === 0);
      card.classList.toggle("is-folded", isFolded);
    });
    if (honorFlowCurrent) honorFlowCurrent.textContent = String(honorFlowActive + 1).padStart(2, "0");
    if (honorFlowTotal) honorFlowTotal.textContent = String(honors.length).padStart(2, "0");
  };

  if (honorFlowStage) {
    honorFlowStage.innerHTML = honors.map((honor, index) => `
      <button class="honor-flow-card" style="--art-ratio: ${honor.width} / ${honor.height}" type="button" data-honor="${index}" aria-label="查看${honor.title}奖状">
        <span class="honor-flow-card__image"><img src="${honor.src}" alt="${honor.title}" loading="${Math.abs(index - 9) < 4 ? "eager" : "lazy"}"></span>
        <span class="honor-flow-card__caption"><b>${String(index + 1).padStart(2, "0")}</b><strong>${honor.title}</strong></span>
      </button>`).join("");
    honorFlowCards = [...honorFlowStage.querySelectorAll(".honor-flow-card")];
    honorFlow?.addEventListener("pointermove", (event) => {
      if (reducedMotion.matches) return;
      const rect = honorFlow.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      updateHonorFlow(Math.round(ratio * (honors.length - 1)));
    }, { passive: true });
    honorFlowCards.forEach((card, index) => card.addEventListener("focus", () => updateHonorFlow(index)));
    window.addEventListener("resize", () => updateHonorFlow(honorFlowActive));
    window.requestAnimationFrame(() => updateHonorFlow(honorFlowActive));
  }

  const showHonor = (index) => {
    if (!honors.length || !honorDialog) return;
    honorIndex = (index + honors.length) % honors.length;
    updateHonorFlow(honorIndex);
    const honor = honors[honorIndex];
    honorImage.src = honor.src;
    honorImage.alt = honor.title;
    honorTitle.textContent = honor.title;
    honorCounter.textContent = `${String(honorIndex + 1).padStart(2, "0")} / ${String(honors.length).padStart(2, "0")}`;
    if (!honorDialog.open && typeof honorDialog.showModal === "function") {
      honorDialog.showModal();
      body.classList.add("dialog-open");
    }
  };

  document.querySelectorAll("[data-honor]").forEach((button) => {
    button.addEventListener("click", () => showHonor(Number(button.dataset.honor)));
  });
  document.getElementById("honorPrev")?.addEventListener("click", () => showHonor(honorIndex - 1));
  document.getElementById("honorNext")?.addEventListener("click", () => showHonor(honorIndex + 1));
  honorDialog?.querySelector(".honor-dialog__close")?.addEventListener("click", () => {
    honorDialog.close();
    body.classList.remove("dialog-open");
  });
  honorDialog?.addEventListener("cancel", () => body.classList.remove("dialog-open"));
  honorDialog?.addEventListener("click", (event) => {
    if (event.target === honorDialog) {
      honorDialog.close();
      body.classList.remove("dialog-open");
    }
  });
  window.addEventListener("keydown", (event) => {
    if (!honorDialog?.open) return;
    if (event.key === "ArrowLeft") showHonor(honorIndex - 1);
    if (event.key === "ArrowRight") showHonor(honorIndex + 1);
  });

  const setupCardTilt = () => {
    if (!finePointer.matches || reducedMotion.matches) return;
    document.querySelectorAll(".tilt-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        const strength = card.classList.contains("project-entry__visual") ? 8 : 5;
        const lift = card.classList.contains("project-entry__visual") ? -10 : -6;
        card.style.transform = `perspective(900px) rotateX(${(-y * strength).toFixed(2)}deg) rotateY(${(x * strength).toFixed(2)}deg) translateY(${lift}px)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  };
  setupCardTilt();

  const setupProductBoards = () => {
    const stage = document.querySelector("[data-board-stage]");
    const track = stage?.querySelector(".product-boards__track");
    const cards = [...(stage?.querySelectorAll(".board-gallery__item") || [])];
    if (!stage || !track || !cards.length || reducedMotion.matches || !finePointer.matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const render = () => {
      frame = 0;
      currentX = lerp(currentX, targetX, 0.1);
      currentY = lerp(currentY, targetY, 0.1);
      stage.style.setProperty("--board-x", `${currentX.toFixed(2)}px`);
      stage.style.setProperty("--board-y", `${currentY.toFixed(2)}px`);
      if (Math.abs(currentX - targetX) > 0.08 || Math.abs(currentY - targetY) > 0.08) {
        frame = window.requestAnimationFrame(render);
      }
    };

    const requestRender = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      const nx = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      const ny = clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
      const px = nx - 0.5;
      const py = ny - 0.5;

      targetX = -px * Math.min(12, rect.width * 0.01);
      targetY = -py * 34;

      cards.forEach((card, index) => {
        const depth = 4 + (index % 3) * 3;
        card.style.setProperty("--motion-x", `${(-px * depth).toFixed(2)}px`);
        card.style.setProperty("--motion-y", `${(-py * depth * 0.72).toFixed(2)}px`);
        card.style.setProperty("--motion-rotate", `${(-px * (index % 2 ? -1.7 : 1.7)).toFixed(2)}deg`);
      });

      requestRender();
    });

    stage.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
      cards.forEach((card) => {
        card.style.setProperty("--motion-x", "0px");
        card.style.setProperty("--motion-y", "0px");
        card.style.setProperty("--motion-rotate", "0deg");
      });
      requestRender();
    });

    stage.addEventListener("focusout", () => {
      targetX = 0;
      targetY = 0;
      requestRender();
    });
  };

  setupProductBoards();

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const dialog = document.getElementById("projectDialog");
  const dialogTag = document.getElementById("dialogTag");
  const dialogIndex = document.getElementById("dialogIndex");
  const dialogTitle = document.getElementById("dialogTitle");
  const dialogZh = document.getElementById("dialogZh");
  const dialogDescription = document.getElementById("dialogDescription");
  const dialogType = document.getElementById("dialogType");
  const dialogGallery = document.getElementById("dialogGallery");

  const openProject = (key) => {
    const project = projects[key];
    if (!project || !dialog) return;

    dialogTag.textContent = project.tag;
    dialogIndex.textContent = project.index;
    dialogTitle.textContent = project.title;
    dialogZh.textContent = project.zh;
    dialogDescription.textContent = project.description;
    dialogType.textContent = project.type;
    const galleryMarkup = project.items.map((item, index) => {
      const number = String(index + 1).padStart(2, "0");
      if (item.type === "video") {
        return `<figure class="detail-item detail-item--video"><figcaption><span>${number}</span><strong>${item.label}</strong></figcaption><video src="${item.src}" controls playsinline preload="metadata" aria-label="${item.label}"></video></figure>`;
      }
      if (item.type === "image") {
        return `<figure class="detail-item detail-item--image"><figcaption><span>${number}</span><strong>${item.label}</strong><em>${item.width} ? ${item.height}</em></figcaption><img src="${item.src}" alt="${item.label}" loading="lazy" decoding="async"></figure>`;
      }
      return `<div class="detail-item detail-item--file"><span>${item.ext}</span><strong>${item.name}</strong><em>SOURCE FILE</em></div>`;
    }).join("");
    dialogGallery.innerHTML = galleryMarkup;

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      body.classList.add("dialog-open");
    }
  };

  document.querySelectorAll("[data-project]").forEach((button) => {
    button.addEventListener("click", () => openProject(button.dataset.project));
  });

  const closeDialog = () => {
    dialog?.querySelectorAll("video").forEach((video) => video.pause());
    if (dialog?.open) dialog.close();
    body.classList.remove("dialog-open");
  };

  dialog?.querySelector(".dialog-close")?.addEventListener("click", closeDialog);
  dialog?.addEventListener("cancel", () => body.classList.remove("dialog-open"));
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });


  const reelSection = document.querySelector(".showreel");
  const reelFrame = document.getElementById("reelFrame");
  const showreelVideo = document.getElementById("showreelVideo");
  const reelToggle = document.getElementById("reelToggle");
  const reelProgress = document.getElementById("reelProgress");
  const reelProgressTrack = reelProgress?.parentElement;
  const reelScrubber = document.getElementById("reelScrubber");
  const reelTime = document.getElementById("reelTime");
  let reelScrollMode = true;
  let reelTicking = false;
  let reelDragging = false;

  const formatReelTime = (seconds) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
    const secs = Math.floor(safe % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  const updateReelUi = (progress) => {
    const safeProgress = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
    if (reelProgress) reelProgress.style.width = `${(safeProgress * 100).toFixed(2)}%`;
    if (reelProgressTrack) reelProgressTrack.style.setProperty("--reel-progress", `${(safeProgress * 100).toFixed(2)}%`);
    if (reelScrubber && !reelDragging) reelScrubber.value = String(Math.round(safeProgress * 1000));
    const duration = showreelVideo && Number.isFinite(showreelVideo.duration) ? showreelVideo.duration : 22.69;
    if (reelTime) reelTime.textContent = `${formatReelTime(safeProgress * duration)} / ${formatReelTime(duration)}`;
  };

  const syncReel = () => {
    reelTicking = false;
    if (!reelSection || !reelFrame || !showreelVideo) return;

    const rect = reelSection.getBoundingClientRect();
    const travel = Math.max(reelSection.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    const scale = 0.86 + eased * 0.14;

    reelFrame.style.setProperty("--reel-scale", scale.toFixed(4));
    reelFrame.style.setProperty("--reel-x", `${Math.round((0.5 - progress) * 150)}px`);

    if (reelScrollMode) {
      updateReelUi(progress);
      const duration = Number.isFinite(showreelVideo.duration) ? showreelVideo.duration : 22.69;
      if (showreelVideo.readyState >= 1) {
        try {
          showreelVideo.currentTime = progress * Math.max(duration - 0.08, 0);
        } catch (error) {
          // Metadata may still be resolving on mobile; the next scroll frame will retry.
        }
      }
    } else {
      const duration = Number.isFinite(showreelVideo.duration) ? showreelVideo.duration : 22.69;
      updateReelUi(duration ? showreelVideo.currentTime / duration : 0);
    }
  };

  const requestReelSync = () => {
    if (reelTicking) return;
    reelTicking = true;
    window.requestAnimationFrame(syncReel);
  };

  showreelVideo?.addEventListener("loadedmetadata", () => {
    showreelVideo.pause();
    syncReel();
  });
  window.addEventListener("scroll", requestReelSync, { passive: true });
  window.addEventListener("resize", requestReelSync);
  syncReel();


  const seekReelTo = (ratio) => {
    if (!showreelVideo) return;
    const safeRatio = clamp(Number.isFinite(ratio) ? ratio : 0, 0, 1);
    const duration = Number.isFinite(showreelVideo.duration) ? showreelVideo.duration : 22.69;
    reelScrollMode = false;
    showreelVideo.pause();
    reelToggle?.classList.remove("is-live");
    const label = reelToggle?.querySelector("span");
    if (label) label.textContent = "PLAY WITH SOUND";
    if (showreelVideo.readyState >= 1) {
      try {
        showreelVideo.currentTime = safeRatio * Math.max(duration - 0.08, 0);
      } catch (error) {
        // The next input event will retry once metadata is available.
      }
    }
    updateReelUi(safeRatio);
  };

  const endReelScrub = () => {
    if (!reelDragging) return;
    reelDragging = false;
    const duration = showreelVideo && Number.isFinite(showreelVideo.duration) ? showreelVideo.duration : 22.69;
    updateReelUi(showreelVideo && duration ? showreelVideo.currentTime / duration : 0);
  };

  reelScrubber?.addEventListener("pointerdown", (event) => {
    reelDragging = true;
    reelScrubber.setPointerCapture?.(event.pointerId);
    seekReelTo(Number(reelScrubber.value) / 1000);
  });
  reelScrubber?.addEventListener("input", (event) => {
    reelDragging = true;
    seekReelTo(Number(event.currentTarget.value) / 1000);
  });
  reelScrubber?.addEventListener("change", (event) => {
    seekReelTo(Number(event.currentTarget.value) / 1000);
    endReelScrub();
  });
  window.addEventListener("pointerup", endReelScrub);
  window.addEventListener("touchend", endReelScrub, { passive: true });

  showreelVideo?.addEventListener("timeupdate", () => {
    if (reelScrollMode || reelDragging || !showreelVideo.duration) return;
    updateReelUi(showreelVideo.currentTime / showreelVideo.duration);
  });

  reelToggle?.addEventListener("click", async () => {
    if (!showreelVideo) return;
    const resumeAfterSeek = !reelScrollMode && showreelVideo.paused;
    if (resumeAfterSeek) {
      reelToggle.classList.add("is-live");
      const label = reelToggle.querySelector("span");
      if (label) label.textContent = "PAUSE FILM";
      try {
        await showreelVideo.play();
      } catch (error) {
        reelToggle.classList.remove("is-live");
        if (label) label.textContent = "PLAY WITH SOUND";
      }
      return;
    }
    reelScrollMode = !reelScrollMode;
    reelToggle.classList.toggle("is-live", !reelScrollMode);
    const label = reelToggle.querySelector("span");
    if (!reelScrollMode) {
      if (label) label.textContent = "PAUSE FILM";
      try {
        await showreelVideo.play();
      } catch (error) {
        reelScrollMode = true;
        reelToggle.classList.remove("is-live");
        if (label) label.textContent = "PLAY WITH SOUND";
      }
    } else {
      showreelVideo.pause();
      if (label) label.textContent = "PLAY WITH SOUND";
      syncReel();
    }
  });

  window.addEventListener("resize", () => {
    if (!hero) return;
    pointer.x = clamp(pointer.x, 0, hero.clientWidth);
    pointer.y = clamp(pointer.y, 0, hero.clientHeight);
    heroAura?.style.setProperty("--aura-x", `${pointer.x}px`);
    heroAura?.style.setProperty("--aura-y", `${pointer.y}px`);
  });
  const copyEditorLaunch = document.getElementById("copyEditorLaunch");
  const copyEditorPanel = document.getElementById("copyEditorPanel");
  const copyEditorStatus = document.getElementById("copyEditorStatus");
  const copyEditorDone = document.getElementById("copyEditorDone");
  const copyEditorExport = document.getElementById("copyEditorExport");
  const copyEditorReset = document.getElementById("copyEditorReset");
  const copyStorageKey = "ziqi-copy-overrides-v2";
  const copySelectors = [
    ".hero__eyebrow span", ".hero__identity strong", ".hero__identity span", ".hero__copy p",
    ".section-kicker span", ".works__heading h2", ".works__heading p",
    ".product-boards__eyebrow span", ".product-boards__title span", ".product-boards__title em",
    ".product-boards__intro", ".product-boards__note", ".product-boards__all span", ".product-boards__all strong",
    ".board-gallery__meta strong", ".board-gallery__meta em", ".product-boards__footer span",
    ".project-entry__copy h3", ".project-entry__zh", ".project-entry__desc",
    ".statement__label p", ".statement__label .micro-copy", ".statement__headline", ".statement__aside p",
    ".resume__heading h2", ".resume__heading p", ".resume-intro__eyebrow", ".resume-intro__profile h3",
    ".resume-intro__quote", ".resume-intro__meta span", ".resume-intro__contact span",
    ".resume-scroll-block__head > span", ".resume-scroll-block__head h4", ".resume-scroll-block__head em",
    ".resume-scroll-item > span", ".resume-scroll-item strong", ".resume-scroll-item p",
    ".honors__head h3", ".honors__head p", ".honor-flow-card__caption strong",
    ".contact__eyebrow", ".contact__title", ".contact__mail span", ".footer span", ".footer a"
  ];
  const copyNodes = [...document.querySelectorAll(copySelectors.join(","))];
  let copySaved = {};
  try { copySaved = JSON.parse(localStorage.getItem(copyStorageKey) || "{}"); } catch (error) { copySaved = {}; }
  copyNodes.forEach((node, index) => {
    const key = `copy-${index}`;
    node.dataset.copyKey = key;
    node.spellcheck = false;
    if (typeof copySaved[key] === "string") node.innerHTML = copySaved[key];
  });
  const setCopyMode = (active) => {
    copyNodes.forEach((node) => { node.contentEditable = active ? "true" : "false"; });
    body.classList.toggle("copy-editing", active);
    if (copyEditorPanel) copyEditorPanel.hidden = !active;
    if (copyEditorLaunch) copyEditorLaunch.hidden = active;
    if (copyEditorStatus && active) copyEditorStatus.textContent = "自动保存到本机";
  };
  const persistCopy = (node) => {
    copySaved[node.dataset.copyKey] = node.innerHTML;
    try { localStorage.setItem(copyStorageKey, JSON.stringify(copySaved)); } catch (error) { /* local preview only */ }
    if (copyEditorStatus) copyEditorStatus.textContent = "已保存";
  };
  copyNodes.forEach((node) => node.addEventListener("input", () => persistCopy(node)));
  copyEditorLaunch?.addEventListener("click", () => setCopyMode(true));
  copyEditorDone?.addEventListener("click", () => setCopyMode(false));
  copyEditorReset?.addEventListener("click", () => {
    try { localStorage.removeItem(copyStorageKey); } catch (error) { /* noop */ }
    window.location.reload();
  });
  copyEditorExport?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(copySaved, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ziqi-copy-edits.json";
    link.click();
    URL.revokeObjectURL(url);
  });
})();
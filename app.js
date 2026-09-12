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
  const stage = document.getElementById("pointerStage");
  const pointerHint = document.getElementById("pointerHint");
  const cursor = document.getElementById("cursor");
  const cursorLabel = cursor?.querySelector(".cursor__label");
  const heroImages = [
    "assets/hero-hull.webp",
    "assets/hero-pure.webp",
    "assets/hero-heritage.webp",
    "assets/hero-mine.webp",
    "assets/hero-agri.webp",
    "assets/hero-care.webp"
  ];

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
    plane.dataset.rot = String((Math.random() - 0.5) * 7);
    plane.dataset.drift = String((Math.random() - 0.5) * 68);
    plane.dataset.scale = String(0.96 + Math.random() * 0.08);

    const image = document.createElement("img");
    image.src = imageSrc;
    image.alt = "";
    image.decoding = "async";
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
    window.setTimeout(() => removePlane(plane), 1100);
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
      const targetX = pointer.x + Number(plane.dataset.drift || 0) * Math.sin(age / 360 + i);
      const targetY = pointer.y - i * 10 - age * 0.018;
      const x = lerp(Number(plane.dataset.x || targetX), targetX, 0.13);
      const y = lerp(Number(plane.dataset.y || targetY), targetY, 0.13);
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

    if (heroVisible && now - lastAutoSpawn > 820 && now - lastPointerMove > 1150 && !reducedMotion.matches) {
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
    if (performance.now() - lastCycle > 115) spawnPlane();
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
    yi: {
      "index": "01 / 06",
      "tag": "VISUAL / CULTURE",
      "title": "Yi Chronicle",
      "zh": "焰绣银章：彝族非遗文化基因活化图鉴",
      "type": "Information Design / Cultural Research",
      "description": "An information atlas that translates Yi cultural symbols, craft and ritual knowledge into a navigable visual language.",
      items: [
              {
                      "type": "image",
                      "src": "library/1-a.webp",
                      "label": "a彝族非遗信息可视化_画板 1.jpg",
                      "width": 4961,
                      "height": 3508,
                      "letter": "a"
              },
              {
                      "type": "image",
                      "src": "library/1-b.webp",
                      "label": "b彝族非遗信息可视化-02.jpg",
                      "width": 4961,
                      "height": 3508,
                      "letter": "b"
              },
              {
                      "type": "image",
                      "src": "library/1-c.webp",
                      "label": "c彝族非遗信息可视化-03.jpg",
                      "width": 4961,
                      "height": 3508,
                      "letter": "c"
              },
              {
                      "type": "image",
                      "src": "library/1-d.webp",
                      "label": "d封面.jpg",
                      "width": 3508,
                      "height": 4961,
                      "letter": "d"
              },
              {
                      "type": "video",
                      "src": "library/1-e.mp4",
                      "label": "detail-1-09.mp4",
                      "letter": "e"
              },
              {
                      "type": "video",
                      "src": "library/1-f.mp4",
                      "label": "detail-1-10.mp4",
                      "letter": "f"
              }
      ]
    },
    byd: {
      "index": "02 / 06",
      "tag": "AUTOMOTIVE HMI · UX / UI",
      "title": "BYD Intelligent Cockpit",
      "zh": "比亚迪智能座舱 HMI 体验设计",
      "type": "Automotive HMI / UX / UI",
      "description": "A modular cockpit experience that keeps critical driving information legible, calm and immediately actionable.",
      items: [
              {
                      "type": "video",
                      "src": "library/2-a.mp4",
                      "label": "detail-2-08.mp4",
                      "letter": "a"
              },
              {
                      "type": "image",
                      "src": "library/2-b.jpg",
                      "label": "b设计提案.jpg",
                      "width": 1858,
                      "height": 29376,
                      "letter": "b"
              }
      ]
    },
    mediflow: {
      "index": "03 / 06",
      "tag": "SERVICE DESIGN · MOBILE UX",
      "title": "MediFlow",
      "zh": "预约挂号 App 用户体验设计",
      "type": "Service Design / Mobile UX",
      "description": "A calmer appointment and registration journey built around clarity, reassurance and fewer decision points for first-time users.",
      items: [
              {
                      "type": "video",
                      "src": "library/3-a.mp4",
                      "label": "detail-3-01.mp4",
                      "letter": "a"
              },
              {
                      "type": "image",
                      "src": "library/3-b.jpg",
                      "label": "b长图.png",
                      "width": 1920,
                      "height": 23370,
                      "letter": "b"
              }
      ]
    },
    poluo: {
      "index": "04 / 06",
      "tag": "INTERACTION / EXPERIENCE",
      "title": "坡见龙门",
      "zh": "文化交互产品与可操作原型设计",
      "type": "Interaction Design / Experience Prototype",
      "description": "A cultural interaction prototype combining spatial storytelling, screen feedback and an operable experience flow.",
      items: [
              {
                      "type": "video",
                      "src": "library/4-a.mp4",
                      "label": "detail-4-05.mp4",
                      "letter": "a"
              },
              {
                      "type": "image",
                      "src": "library/4-b.webp",
                      "label": "b封面.png",
                      "width": 1672,
                      "height": 941,
                      "letter": "b"
              },
              {
                      "type": "image",
                      "src": "library/4-c.webp",
                      "label": "c图片.png",
                      "width": 1600,
                      "height": 900,
                      "letter": "c"
              },
              {
                      "type": "file",
                      "name": "d坡见龙门展示.pptx",
                      "ext": "PPTX",
                      "letter": "d"
              }
      ]
    },
    five: {
      "index": "05 / 06",
      "tag": "PRODUCT DESIGN · A—F",
      "title": "Product Boards",
      "zh": "智能产品设计展板合集",
      "type": "Industrial Design / Product Systems",
      "description": "Six intelligent product directions presented in full source order, from marine engineering and environmental restoration to cultural repair, rescue, agriculture and inclusive care.",
      items: [
              {
                      "type": "image",
                      "src": "library/5a-[砺]船体锈蚀切割一体机1.webp",
                      "label": "[砺]船体锈蚀切割一体机1.jpg",
                      "width": 2560,
                      "height": 3622,
                      "letter": "a"
              },
              {
                      "type": "image",
                      "src": "library/5a-[砺]船体锈蚀切割一体机2.webp",
                      "label": "[砺]船体锈蚀切割一体机2.jpg",
                      "width": 2560,
                      "height": 3622,
                      "letter": "a"
              },
              {
                      "type": "image",
                      "src": "library/5b-PURE.河道清淤泥装备1.webp",
                      "label": "PURE.河道清淤泥装备1.jpg",
                      "width": 3508,
                      "height": 4961,
                      "letter": "b"
              },
              {
                      "type": "image",
                      "src": "library/5b-PURE.河道清淤泥装备2.webp",
                      "label": "PURE.河道清淤泥装备2.jpg",
                      "width": 3508,
                      "height": 4961,
                      "letter": "b"
              },
              {
                      "type": "image",
                      "src": "library/5b-PURE.河道清淤泥装备3.webp",
                      "label": "PURE.河道清淤泥装备3.jpg",
                      "width": 3508,
                      "height": 4961,
                      "letter": "b"
              },
              {
                      "type": "image",
                      "src": "library/5c-古建筑修复机器1.webp",
                      "label": "古建筑修复机器1.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "c"
              },
              {
                      "type": "image",
                      "src": "library/5c-古建筑修复机器2.webp",
                      "label": "古建筑修复机器2.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "c"
              },
              {
                      "type": "image",
                      "src": "library/5c-古建筑修复机器3.webp",
                      "label": "古建筑修复机器3.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "c"
              },
              {
                      "type": "image",
                      "src": "library/5d-矿用应急搜救与排水一体化机器1.webp",
                      "label": "矿用应急搜救与排水一体化机器1.jpg",
                      "width": 1787,
                      "height": 2527,
                      "letter": "d"
              },
              {
                      "type": "image",
                      "src": "library/5d-矿用应急搜救与排水一体化机器2.webp",
                      "label": "矿用应急搜救与排水一体化机器2.jpg",
                      "width": 1192,
                      "height": 1685,
                      "letter": "d"
              },
              {
                      "type": "image",
                      "src": "library/5d-矿用应急搜救与排水一体化机器3.webp",
                      "label": "矿用应急搜救与排水一体化机器3.jpg",
                      "width": 1192,
                      "height": 1685,
                      "letter": "d"
              },
              {
                      "type": "image",
                      "src": "library/5e-农作专家机器1.webp",
                      "label": "农作专家机器1.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "e"
              },
              {
                      "type": "image",
                      "src": "library/5e-农作专家机器2.webp",
                      "label": "农作专家机器2.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "e"
              },
              {
                      "type": "image",
                      "src": "library/5e-农作专家机器3.webp",
                      "label": "农作专家机器3.jpg",
                      "width": 1920,
                      "height": 2717,
                      "letter": "e"
              },
              {
                      "type": "image",
                      "src": "library/5f-适老助餐辅具1.webp",
                      "label": "适老助餐辅具1.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "f"
              },
              {
                      "type": "image",
                      "src": "library/5f-适老助餐辅具2.webp",
                      "label": "适老助餐辅具2.jpg",
                      "width": 1280,
                      "height": 1812,
                      "letter": "f"
              },
              {
                      "type": "image",
                      "src": "library/5f-适老助餐辅具3.webp",
                      "label": "适老助餐辅具3.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "f"
              }
      ]
    },
    hull: {
      "index": "05A / 06",
      "tag": "MARINE ROBOTICS",
      "title": "Hull Lab",
      "zh": "船体锈蚀切割一体机",
      "type": "Industrial Design / Marine Robotics",
      "description": "Automated inspection and precision processing for difficult-to-reach hull surfaces, designed to improve safety and repeatability.",
      items: [
              {
                      "type": "image",
                      "src": "library/5a-[砺]船体锈蚀切割一体机1.webp",
                      "label": "[砺]船体锈蚀切割一体机1.jpg",
                      "width": 2560,
                      "height": 3622,
                      "letter": "a"
              },
              {
                      "type": "image",
                      "src": "library/5a-[砺]船体锈蚀切割一体机2.webp",
                      "label": "[砺]船体锈蚀切割一体机2.jpg",
                      "width": 2560,
                      "height": 3622,
                      "letter": "a"
              }
      ]
    },
    pure: {
      "index": "05B / 06",
      "tag": "ENVIRONMENTAL PRODUCT",
      "title": "Pure River",
      "zh": "PURE 河道清淤装备",
      "type": "Product System / Sustainability",
      "description": "A river maintenance system designed around efficient collection, low disturbance and a clearer operational footprint.",
      items: [
              {
                      "type": "image",
                      "src": "library/5b-PURE.河道清淤泥装备1.webp",
                      "label": "PURE.河道清淤泥装备1.jpg",
                      "width": 3508,
                      "height": 4961,
                      "letter": "b"
              },
              {
                      "type": "image",
                      "src": "library/5b-PURE.河道清淤泥装备2.webp",
                      "label": "PURE.河道清淤泥装备2.jpg",
                      "width": 3508,
                      "height": 4961,
                      "letter": "b"
              },
              {
                      "type": "image",
                      "src": "library/5b-PURE.河道清淤泥装备3.webp",
                      "label": "PURE.河道清淤泥装备3.jpg",
                      "width": 3508,
                      "height": 4961,
                      "letter": "b"
              }
      ]
    },
    heritage: {
      "index": "05C / 06",
      "tag": "CULTURAL TECHNOLOGY",
      "title": "Heritage Repair",
      "zh": "古建筑修复机器人",
      "type": "Robotics / Cultural Technology",
      "description": "A precision repair concept explored for fragile architectural surfaces, where access, control and preservation must work together.",
      items: [
              {
                      "type": "image",
                      "src": "library/5c-古建筑修复机器1.webp",
                      "label": "古建筑修复机器1.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "c"
              },
              {
                      "type": "image",
                      "src": "library/5c-古建筑修复机器2.webp",
                      "label": "古建筑修复机器2.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "c"
              },
              {
                      "type": "image",
                      "src": "library/5c-古建筑修复机器3.webp",
                      "label": "古建筑修复机器3.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "c"
              }
      ]
    },
    mine: {
      "index": "05D / 06",
      "tag": "EMERGENCY ROBOTICS",
      "title": "Deep Rescue",
      "zh": "矿用应急搜救与排水一体化机器",
      "type": "Industrial Design / Robotics",
      "description": "An integrated emergency platform combining search support, environmental sensing and high-capacity drainage in one compact system.",
      items: [
              {
                      "type": "image",
                      "src": "library/5d-矿用应急搜救与排水一体化机器1.webp",
                      "label": "矿用应急搜救与排水一体化机器1.jpg",
                      "width": 1787,
                      "height": 2527,
                      "letter": "d"
              },
              {
                      "type": "image",
                      "src": "library/5d-矿用应急搜救与排水一体化机器2.webp",
                      "label": "矿用应急搜救与排水一体化机器2.jpg",
                      "width": 1192,
                      "height": 1685,
                      "letter": "d"
              },
              {
                      "type": "image",
                      "src": "library/5d-矿用应急搜救与排水一体化机器3.webp",
                      "label": "矿用应急搜救与排水一体化机器3.jpg",
                      "width": 1192,
                      "height": 1685,
                      "letter": "d"
              }
      ]
    },
    agri: {
      "index": "05E / 06",
      "tag": "AGRICULTURAL ROBOTICS",
      "title": "Agri Expert",
      "zh": "农作专家机器人",
      "type": "Robotics / Product Design",
      "description": "A field-oriented robotic companion that supports monitoring, guidance and precision work in demanding agricultural environments.",
      items: [
              {
                      "type": "image",
                      "src": "library/5e-农作专家机器1.webp",
                      "label": "农作专家机器1.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "e"
              },
              {
                      "type": "image",
                      "src": "library/5e-农作专家机器2.webp",
                      "label": "农作专家机器2.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "e"
              },
              {
                      "type": "image",
                      "src": "library/5e-农作专家机器3.webp",
                      "label": "农作专家机器3.jpg",
                      "width": 1920,
                      "height": 2717,
                      "letter": "e"
              }
      ]
    },
    care: {
      "index": "05F / 06",
      "tag": "INCLUSIVE DESIGN",
      "title": "Care Assist",
      "zh": "适老助餐辅具",
      "type": "Inclusive Design / Product System",
      "description": "A dining support concept that aims to preserve dignity, independence and comfort for older users through thoughtful detail.",
      items: [
              {
                      "type": "image",
                      "src": "library/5f-适老助餐辅具1.webp",
                      "label": "适老助餐辅具1.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "f"
              },
              {
                      "type": "image",
                      "src": "library/5f-适老助餐辅具2.webp",
                      "label": "适老助餐辅具2.jpg",
                      "width": 1280,
                      "height": 1812,
                      "letter": "f"
              },
              {
                      "type": "image",
                      "src": "library/5f-适老助餐辅具3.webp",
                      "label": "适老助餐辅具3.jpg",
                      "width": 1280,
                      "height": 1811,
                      "letter": "f"
              }
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
      "src": "library/honor-02.webp",
      "title": "UVADC省一等奖",
      "width": 4960,
      "height": 7015
    },
    {
      "src": "library/honor-03.webp",
      "title": "东方创意省银",
      "width": 10737,
      "height": 7653
    },
    {
      "src": "library/honor-04.webp",
      "title": "东方创意省银2",
      "width": 10737,
      "height": 7653
    },
    {
      "src": "library/honor-05.webp",
      "title": "东方设计奖国2",
      "width": 1190,
      "height": 1666
    },
    {
      "src": "library/honor-06.webp",
      "title": "东方设计奖国3",
      "width": 1190,
      "height": 1666
    },
    {
      "src": "library/honor-07.webp",
      "title": "东方设计奖省2",
      "width": 1190,
      "height": 1666
    },
    {
      "src": "library/honor-08.webp",
      "title": "国青杯一等奖",
      "width": 2686,
      "height": 1917
    },
    {
      "src": "library/honor-09.webp",
      "title": "国青杯三等奖1",
      "width": 2752,
      "height": 1947
    },
    {
      "src": "library/honor-10.webp",
      "title": "国青杯三等奖2",
      "width": 2650,
      "height": 1818
    },
    {
      "src": "library/honor-11.webp",
      "title": "国青杯二等奖",
      "width": 1818,
      "height": 1280
    },
    {
      "src": "library/honor-12.webp",
      "title": "大文赛国1（矿井救援）",
      "width": 2480,
      "height": 3508
    },
    {
      "src": "library/honor-13.webp",
      "title": "大文赛国1（震后外骨骼）",
      "width": 2480,
      "height": 3508
    },
    {
      "src": "library/honor-14.webp",
      "title": "好创意国三（彝族火把节）",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-15.webp",
      "title": "好创意国三（雪地车）",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-16.webp",
      "title": "好创意国三（露营灯）",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-17.webp",
      "title": "未来设计国2",
      "width": 4898,
      "height": 6872
    },
    {
      "src": "library/honor-18.webp",
      "title": "未来设计省1",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-19.webp",
      "title": "未来设计省2",
      "width": 4762,
      "height": 6735
    },
    {
      "src": "library/honor-20.webp",
      "title": "未来设计省3",
      "width": 4762,
      "height": 6735
    }
  ];





  const honorDialog = document.getElementById("honorDialog");
  const honorList = document.getElementById("honorList");
  const honorImage = document.getElementById("honorImage");
  const honorTitle = document.getElementById("honorTitle");
  const honorCounter = document.getElementById("honorCounter");
  let honorIndex = 0;

  if (honorList) {
    honorList.innerHTML = honors.map((honor, index) => `
      <button class="honor-item tilt-card" type="button" data-honor="${index}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${honor.title}</strong>
        <i>↗</i>
      </button>`).join("");
  }

  const showHonor = (index) => {
    if (!honors.length || !honorDialog) return;
    honorIndex = (index + honors.length) % honors.length;
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
  const reelTime = document.getElementById("reelTime");
  let reelScrollMode = true;
  let reelTicking = false;

  const formatReelTime = (seconds) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
    const secs = Math.floor(safe % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
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
    if (reelProgress) reelProgress.style.width = `${(progress * 100).toFixed(2)}%`;

    const duration = Number.isFinite(showreelVideo.duration) ? showreelVideo.duration : 30;
    if (reelTime) reelTime.textContent = `${formatReelTime(progress * duration)} / ${formatReelTime(duration)}`;

    if (reelScrollMode && showreelVideo.readyState >= 1) {
      try {
        showreelVideo.currentTime = progress * Math.max(duration - 0.08, 0);
      } catch (error) {
        // Metadata may still be resolving on mobile; the next scroll frame will retry.
      }
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

  reelToggle?.addEventListener("click", async () => {
    if (!showreelVideo) return;
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
        if (label) label.textContent = "SCROLL TO PLAY";
      }
    } else {
      showreelVideo.pause();
      if (label) label.textContent = "SCROLL TO PLAY";
      syncReel();
    }
  });

  window.addEventListener("resize", () => {
    if (!hero) return;
    pointer.x = clamp(pointer.x, 0, hero.clientWidth);
    pointer.y = clamp(pointer.y, 0, hero.clientHeight);
  });
})();
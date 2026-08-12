"use strict";

/* PULSE DLC — публичный сайт для GitHub Pages. */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  user: null,
  features: {},
  keys: [],
  version: "266",
  plans: [
    { id: "day1", name: "1 день", days: 1, price: 19, game: "rust" },
    { id: "day7", name: "7 дней", days: 7, price: 99, game: "rust" },
    { id: "day30", name: "30 дней", days: 30, price: 239, game: "rust" },
    { id: "life", name: "Lifetime", days: 0, price: 666, game: "rust" },
    { id: "cs2_day1", name: "1 день", days: 1, price: 29, game: "cs2" },
    { id: "cs2_day7", name: "7 дней", days: 7, price: 149, game: "cs2" },
    { id: "cs2_day30", name: "30 дней", days: 30, price: 349, game: "cs2" },
    { id: "cs2_life", name: "Lifetime", days: 0, price: 999, game: "cs2" },
  ],
};

/* ================= ФОН: белый дождь + молнии ================= */

(function initRain() {
  const canvas = document.getElementById("rain");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const flash = document.getElementById("flash");
  let W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const DROPS = 220;
  let drops = [];

  function resize() {
    W = window.innerWidth * dpr;
    H = window.innerHeight * dpr;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    spawnDrops();
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawnDrop(o) {
    o = o || {};
    const depth = o.depth != null ? o.depth : rand(0, 1);
    return {
      x: o.x != null ? o.x : rand(0, W),
      y: o.y != null ? o.y : rand(-H, 0),
      depth,
      len: (14 + depth * 18) * dpr,
      sp: (0.7 + depth * 1.6) * dpr,
      w: (0.7 + depth * 0.9) * dpr,
      a: 0.06 + depth * 0.2
    };
  }

  function spawnDrops() {
    drops = [];
    for (let i = 0; i < DROPS; i++) drops.push(spawnDrop());
  }

  let strikeAt = performance.now() + rand(2500, 5000);
  let flashTick = 0;

  function strike() {
    flashTick = 1;
    const bolts = 2 + Math.floor(Math.random() * 2);
    for (let b = 0; b < bolts; b++) {
      const x0 = rand(W * 0.15, W * 0.85);
      ctx.save();
      ctx.strokeStyle = b === 0 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = (b === 0 ? 2.4 : 1.2) * dpr;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255,255,255,0.8)";
      ctx.shadowBlur = 18 * dpr;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      let x = x0, y = 0;
      while (y < H) {
        y += rand(40, 110) * dpr;
        x += rand(-60, 60) * dpr;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function tick(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y += d.sp;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${d.a})`;
      ctx.lineWidth = d.w;
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y - d.len);
      ctx.stroke();
      if (d.y > H + 50) {
        drops[i] = spawnDrop({ x: rand(0, W), y: rand(-60, -20), depth: rand(0, 1) });
      }
    }

    if (now >= strikeAt) {
      strike();
      strikeAt = now + rand(6000, 12000);
    }

    if (flashTick > 0) {
      flashTick++;
      const t = flashTick;
      const a = Math.max(0, 0.16 * Math.exp(-t / 9));
      flash.style.opacity = a;
      if (t > 70) flashTick = 0;
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();

/* ================= API ================= */

async function api(path, opts = {}) {
  const init = { method: opts.method || "GET" };
  if (opts.body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
  return data;
}

async function refreshMe() {
  const d = await api("/api/me");
  state.user = d.user;
  state.features = d.features;
  state.keys = d.keys;
  state.plans = d.plans;
}

async function loadPlans() {
  const d = await api("/api/meta");
  state.plans = d.products;
  state.version = d.version;
}

/* ================= ТОСТ ================= */

let toastTimer = null;
function toast(msg, kind) {
  const el = $("#toast");
  el.innerHTML = msg;
  el.className = "toast" + (kind === "good" ? " good" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3600);
}

/* ================= РОУТИНГ ================= */

const ROUTES = ["home", "products"];

function route() {
  const h = (location.hash || "").replace(/^#/, "");
  let name = h.replace(/^\//, "").split("?")[0] || "home";
  if (name.startsWith("features") || name === "menu-preview") name = "home";
  if (!ROUTES.includes(name)) name = "home";

  ROUTES.forEach((r) => {
    $("#page-" + r).classList.toggle("hidden", r !== name);
    const link = $(`[data-nav="${r}"]`);
    if (link) link.classList.toggle("active", r === name);
  });
  if (name === "home") renderHome();
  if (name === "products") renderProducts();

  if (name === "home" && h.startsWith("features")) {
    setTimeout(() => document.getElementById("features")?.scrollIntoView(), 50);
  }
  window.scrollTo(0, 0);
}

/* ================= ГЛАВНАЯ ================= */

const FEATURE_GROUPS = [
  {
    title: "Игрок",
    items: [
      "ESP игроков: имя, бокс, скелет, дистанция, ХП, оружие",
      "Трейсеры до цели, цвет тиммейтов",
      "Показ спящих и подбитых (wounded)",
      "Radar — мини-карта игроков и мира",
      "Hotkeys overlay — хоткеи поверх игры",
    ],
  },
  {
    title: "Оружие",
    items: [
      "Аимбот: вкл/выкл, FOV, хитбокс (голова/шея/грудь/таз)",
      "Silent Aim и фильтры целей",
      "Игнор NPC / тиммейтов / спящих, visible check",
      "No Recoil + регулятор остаточной отдачи",
      "Instant Eoka, Fast Reload, No Bob",
    ],
  },
  {
    title: "Движение",
    items: [
      "Spiderman — лазание по стенам",
      "Water Walk — хождение по воде",
      "Infinite Jump и No Fall",
      "Omni Sprint в любую сторону + множитель скорости",
      "Стабильное движение без лишнего покачивания",
    ],
  },
  {
    title: "Визуал",
    items: [
      "FOV Changer с настройкой значения",
      "Time Changer — своё время суток",
      "Aspect fix для корректного W2S",
      "Оверлейные индикаторы и таймеры",
      "Минималистичный ненавязчивый рендер",
    ],
  },
  {
    title: "Мир",
    items: [
      "Руды: камень, сера, металл, конопля",
      "Лут: ящики, военные, тулбоксы, бочки, нефть, дизель, склады",
      "Животные: кабан, медведь, волк, курица, олень",
      "ESP NPC: скелет, бокс, имя, ХП отдельным цветом",
      "Настройка дистанций отображения для каждой категории",
    ],
  },
];

function renderHome() {
  const wrap = $("#feat-list");
  if (wrap.dataset.rendered) return;
  wrap.dataset.rendered = "1";
  FEATURE_GROUPS.forEach((g, i) => {
    const art = document.createElement("article");
    art.className = "feat-group reveal";
    art.style.setProperty("--d", `${i * 0.06}s`);
    const h = document.createElement("h3");
    h.textContent = g.title;
    const ul = document.createElement("ul");
    g.items.forEach((it) => {
      const li = document.createElement("li");
      li.textContent = it;
      ul.appendChild(li);
    });
    art.appendChild(h);
    art.appendChild(ul);
    wrap.appendChild(art);
    attachTilt(art, 60);
  });

  buildSlideshow();
}

const SLIDES = [
  { src: "menu/01-player.png", title: "Игрок" },
  { src: "menu/02-weapons.png", title: "Оружие" },
  { src: "menu/03-visuals.png", title: "Визуалы" },
  { src: "menu/04-world.png", title: "Мир" },
  { src: "menu/05-settings.png", title: "Настройки" },
];

let slideIdx = 0;
let slideTimer = null;

function attachTilt(el, divisor = 70) {
  el.style.transition = "transform 0.12s ease-out";
  el.style.transformStyle = "preserve-3d";
  el.style.willChange = "transform";
  let rafId = null;
  let pendX = 0, pendY = 0, rect = null;
  function apply() {
    rafId = null;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = (cy - pendY) / divisor;
    const rotY = (pendX - cx) / divisor;
    el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }
  el.addEventListener("mousemove", (e) => {
    pendX = e.clientX - rect.left;
    pendY = e.clientY - rect.top;
    if (!rafId) rafId = requestAnimationFrame(apply);
  });
  el.addEventListener("mouseenter", () => {
    rect = el.getBoundingClientRect();
    el.style.transition = "transform 0.12s ease-out";
  });
  el.addEventListener("mouseleave", () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    el.style.transition = "transform 0.5s ease";
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  });
}

function buildSlideshow() {
  const wrap = $("#slideshow");
  if (!wrap || wrap.dataset.rendered) return;
  wrap.dataset.rendered = "1";

  const frame = document.createElement("div");
  frame.className = "slide-frame";
  attachTilt(frame);
  SLIDES.forEach((s, i) => {
    const img = document.createElement("img");
    img.className = "slide" + (i === 0 ? " active" : "");
    img.src = s.src;
    img.alt = "Меню PULSE DLC — " + s.title;
    frame.appendChild(img);
  });
  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "slide-nav prev";
  prev.setAttribute("aria-label", "Назад");
  prev.textContent = "‹";
  prev.onclick = () => gotoSlide(slideIdx - 1);
  const next = document.createElement("button");
  next.type = "button";
  next.className = "slide-nav next";
  next.setAttribute("aria-label", "Вперёд");
  next.textContent = "›";
  next.onclick = () => gotoSlide(slideIdx + 1);
  frame.appendChild(prev);
  frame.appendChild(next);
  wrap.appendChild(frame);

  const meta = document.createElement("div");
  meta.className = "slide-meta";
  const title = document.createElement("span");
  title.className = "slide-title";
  title.textContent = SLIDES[0].title;
  const dots = document.createElement("div");
  dots.className = "slide-dots";
  SLIDES.forEach((s, i) => {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "dot" + (i === 0 ? " on" : "");
    d.setAttribute("aria-label", s.title);
    d.onclick = () => gotoSlide(i);
    dots.appendChild(d);
  });
  meta.appendChild(title);
  meta.appendChild(dots);
  wrap.appendChild(meta);

  window.slideMeta = { title };
  startSlideTimer();
}

function startSlideTimer() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => gotoSlide(slideIdx + 1, true), 4200);
}

function gotoSlide(i, silent) {
  const wrap = $("#slideshow");
  if (!wrap) return;
  slideIdx = ((i % SLIDES.length) + SLIDES.length) % SLIDES.length;
  const imgs = wrap.querySelectorAll(".slide");
  imgs.forEach((im, k) => im.classList.toggle("active", k === slideIdx));
  const dots = wrap.querySelectorAll(".dot");
  dots.forEach((d, k) => d.classList.toggle("on", k === slideIdx));
  const title = wrap.querySelector(".slide-title");
  if (title) title.textContent = SLIDES[slideIdx].title;
  if (!silent) startSlideTimer();
}

/* ================= ПРОДУКТЫ ================= */

const GAME_NAMES = { rust: "RUST", cs2: "CS2", spoofer: "SPOOFER" };
let currentGame = "rust";

function switchGame(game) {
  currentGame = game;
  document.querySelectorAll("#game-tabs .game-tab").forEach((b) => {
    b.classList.toggle("on", b.dataset.game === game);
  });
  renderProducts();
}

function renderProducts() {
  const row = $("#price-row");
  row.innerHTML = "";
  const plans = state.plans.filter((p) => (p.game || "rust") === currentGame);
  plans.forEach((p, i) => {
    const card = document.createElement("article");
    card.className = "plan" + (p.id === "day7" || p.id === "cs2_day7" ? " hot" : "") + (p.price === 0 ? " free" : "");
    card.style.animationDelay = `${i * 0.08}s`;
    if (currentGame !== "cs2") attachTilt(card, 45);
    if (currentGame === "cs2") {
      card.classList.add("soon");
      const overlay = document.createElement("div");
      overlay.className = "soon-overlay";
      overlay.innerHTML = "<span>SOON</span>";
      card.appendChild(overlay);
    }
    const label = document.createElement("p");
    label.className = "plan-label";
    label.textContent = p.name;
    const h = document.createElement("h3");
    h.textContent = "PULSE DLC";
    const blurb = document.createElement("p");
    blurb.className = "plan-blurb";
    blurb.textContent = p.days === 0 ? "Навсегда, одна покупка" :
      p.days === 1 ? "Разовый доступ на сутки" :
      p.days === 7 ? "Неделя игры без ограничений" : "Месяц подписки, выгодно";
    const meta = document.createElement("p");
    meta.className = "plan-meta";
    meta.textContent = GAME_NAMES[p.game || "rust"] + " · v" + state.version;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn solid";
    btn.textContent = p.price === 0 ? "БЕСПЛАТНО" : p.price + " ₽";
    btn.onclick = () => buyPlan(p.id);
    card.appendChild(label);
    card.appendChild(h);
    card.appendChild(blurb);
    card.appendChild(meta);
    card.appendChild(btn);
    row.appendChild(card);
  });

  $("#products-hint").textContent = "Оплата: Telegram или FunPay. По вопросам покупки напишите в поддержку.";
}

function buyPlan(id) {
  const plan = state.plans.find((p) => p.id === id);
  if (plan) openBuyModal(id);
}

async function proceedFreePlan(plan) {
  closeBuyModal();
  toast("Бесплатная <b>" + plan.name + "</b> выдается…", "good");
  try {
    const d = await api("/api/buy", { method: "POST", body: { planId: plan.id, method: "free" } });
    setTimeout(() => toast("Ключ активирован: <b>" + d.key.code + "</b>", "good"), 400);
    await refreshMe();
  } catch (e) {
    toast(e.message, "bad");
  }
  renderProducts();
  renderCabinet();
}

/* ================= МЕНЮ (ОВЕРЛЕЙ) ================= */

let activeTab = "weapons";
let featuresSaveTimer = null;

function pushFeatures() {
  clearTimeout(featuresSaveTimer);
  featuresSaveTimer = setTimeout(() => {
    api("/api/features", { method: "PUT", body: { features: state.features } }).catch(() => {});
  }, 250);
}

const MENU = [
  {
    id: "weapons", name: "Оружие", feats: [
      { t: "t", key: "no_recoil", name: "No Recoil", desc: "Полное подавление отдачи" },
      { t: "s", key: "recoil_control", name: "Recoil Control", desc: "% остаточной отдачи", min: 0, max: 100, step: 5, suffix: "%" },
      { t: "t", key: "instant_eoka", name: "Instant Eoka", desc: "Мгновенный поджог эоки" },
      { t: "t", key: "fast_reload", name: "Fast Reload", desc: "Ускоренная перезарядка" },
      { t: "t", key: "no_bob", name: "No Bob", desc: "Убирает покачивание рук" },
    ],
  },
  {
    id: "aim", name: "Аим", feats: [
      { t: "t", key: "aim_enable", name: "Aim Assist", desc: "Наведение на цель" },
      { t: "t", key: "silent_aim", name: "Silent Aim", desc: "Без изменения взгляда" },
      { t: "s", key: "aim_fov", name: "Aim FOV", desc: "Радиус захвата", min: 1, max: 180, step: 1, suffix: "°" },
      { t: "x", key: "aim_hitbox", name: "Hitbox", desc: "Точка попадания", options: [
        { v: 0, l: "Голова" }, { v: 1, l: "Шея" }, { v: 2, l: "Грудь" }, { v: 3, l: "Таз" }] },
      { t: "t", key: "aim_ignore_sleepers", name: "Игнор. спящих", desc: "Не целить в спящих" },
      { t: "t", key: "aim_ignore_npc", name: "Игнор. NPC", desc: "Не целить в ботов" },
      { t: "t", key: "aim_ignore_team", name: "Игнор. тиммейтов", desc: "Не целить в своих" },
      { t: "t", key: "aim_visible_check", name: "Visible Check", desc: "Целить только в видимых" },
      { t: "t", key: "aim_draw_fov", name: "Draw FOV", desc: "Рисовать круг FOV" },
    ],
  },
  {
    id: "move", name: "Движение", feats: [
      { t: "t", key: "spiderman", name: "Spiderman", desc: "Лазание по стенам" },
      { t: "t", key: "water_walk", name: "Water Walk", desc: "Хождение по воде" },
      { t: "t", key: "infinite_jump", name: "Infinite Jump", desc: "Бесконечный прыжок" },
      { t: "t", key: "no_fall", name: "No Fall", desc: "Без урона от падения" },
      { t: "t", key: "omni_sprint", name: "Omni Sprint", desc: "Спринт в любую сторону" },
      { t: "s", key: "omni_speed", name: "Speed", desc: "Множитель скорости", min: 1, max: 20, step: 0.5, suffix: "x" },
    ],
  },
  {
    id: "misc", name: "Визуал", feats: [
      { t: "t", key: "fov_changer", name: "FOV Changer", desc: "Изменение FOV камеры" },
      { t: "s", key: "fov_value", name: "FOV Value", desc: "Значение FOV", min: 60, max: 160, step: 1, suffix: "°" },
      { t: "t", key: "time_changer", name: "Time Changer", desc: "Смена времени суток" },
      { t: "s", key: "time_hour", name: "Hour", desc: "Час дня", min: 0, max: 24, step: 1, suffix: "ч" },
      { t: "t", key: "aspect_fix", name: "Aspect Fix", desc: "Фикс аспекта W2S" },
      { t: "t", key: "radar_enable", name: "Radar", desc: "Мини-радар" },
      { t: "t", key: "hotkeys_overlay", name: "Hotkeys Overlay", desc: "Хоткеи поверх игры" },
    ],
  },
  {
    id: "ores", name: "Руды", feats: [
      { t: "t", key: "ore_enabled", name: "Ore ESP", desc: "ESP по рудам" },
      { t: "t", key: "ore_show_name", name: "Имя", desc: "Название руды" },
      { t: "t", key: "ore_show_distance", name: "Дистанция", desc: "Расстояние до руды" },
      { t: "t", key: "ore_show_box", name: "Box", desc: "Рамка вокруг руды" },
      { t: "s", key: "ore_max_distance", name: "Max Dist", desc: "Максимальная дистанция", min: 50, max: 500, step: 10, suffix: "м" },
      { t: "t", key: "draw_stone", name: "Камень", desc: "Stone node" },
      { t: "t", key: "draw_sulfur", name: "Сера", desc: "Sulfur node" },
      { t: "t", key: "draw_metal", name: "Металл", desc: "Metal node" },
      { t: "t", key: "draw_hemp", name: "Конопля", desc: "Hemp plant" },
    ],
  },
  {
    id: "loot", name: "Лут", feats: [
      { t: "t", key: "loot_enabled", name: "Loot ESP", desc: "ESP по луту" },
      { t: "t", key: "loot_show_name", name: "Имя", desc: "Название" },
      { t: "t", key: "loot_show_distance", name: "Дистанция", desc: "Расстояние" },
      { t: "t", key: "loot_show_box", name: "Box", desc: "Рамка" },
      { t: "s", key: "loot_max_distance", name: "Max Dist", desc: "Дистанция", min: 50, max: 400, step: 10, suffix: "м" },
      { t: "t", key: "draw_crate", name: "Ящик", desc: "Crate" },
      { t: "t", key: "draw_military", name: "Военный", desc: "Military crate" },
      { t: "t", key: "draw_toolbox", name: "Тулбокс", desc: "Toolbox" },
      { t: "t", key: "draw_barrel", name: "Бочка", desc: "Barrel" },
      { t: "t", key: "draw_oil", name: "Нефть", desc: "Oil" },
      { t: "t", key: "draw_diesel", name: "Дизель", desc: "Diesel" },
      { t: "t", key: "draw_storage", name: "Склад", desc: "Storage" },
    ],
  },
  {
    id: "animals", name: "Животные", feats: [
      { t: "t", key: "animal_enabled", name: "Animal ESP", desc: "ESP по животным" },
      { t: "t", key: "animal_show_name", name: "Имя", desc: "Название" },
      { t: "t", key: "animal_show_distance", name: "Дистанция", desc: "Расстояние" },
      { t: "t", key: "animal_show_box", name: "Box", desc: "Рамка" },
      { t: "s", key: "animal_max_distance", name: "Max Dist", desc: "Дистанция", min: 50, max: 500, step: 10, suffix: "м" },
      { t: "t", key: "draw_boar", name: "Кабан", desc: "Boar" },
      { t: "t", key: "draw_bear", name: "Медведь", desc: "Bear" },
      { t: "t", key: "draw_wolf", name: "Волк", desc: "Wolf" },
      { t: "t", key: "draw_chicken", name: "Курица", desc: "Chicken" },
      { t: "t", key: "draw_deer", name: "Олень", desc: "Deer" },
    ],
  },
  {
    id: "players", name: "Игроки", feats: [
      { t: "t", key: "player_enabled", name: "Player ESP", desc: "ESP по игрокам" },
      { t: "t", key: "player_skeleton", name: "Скелет", desc: "Bone-скелет" },
      { t: "t", key: "player_box", name: "Box", desc: "Рамка" },
      { t: "t", key: "player_name", name: "Имя", desc: "Ник игрока" },
      { t: "t", key: "player_distance", name: "Дистанция", desc: "Расстояние" },
      { t: "t", key: "player_health", name: "Здоровье", desc: "HP игрока" },
      { t: "t", key: "player_tracer", name: "Трейсер", desc: "Линия до цели" },
      { t: "t", key: "player_weapon", name: "Оружие", desc: "Оружие в руках" },
      { t: "t", key: "player_show_sleepers", name: "Спящие", desc: "Спящие игроки" },
      { t: "t", key: "player_show_wounded", name: "Подбитые", desc: "Wounded игроки" },
      { t: "t", key: "player_team_color", name: "Цвет тимы", desc: "Подсветка своих" },
      { t: "s", key: "player_max_distance", name: "Max Dist", desc: "Дистанция", min: 50, max: 600, step: 10, suffix: "м" },
    ],
  },
  {
    id: "npc", name: "НПС", feats: [
      { t: "t", key: "npc_enabled", name: "NPC ESP", desc: "ESP по ботам" },
      { t: "t", key: "npc_skeleton", name: "Скелет", desc: "Bone-скелет" },
      { t: "t", key: "npc_box", name: "Box", desc: "Рамка" },
      { t: "t", key: "npc_name", name: "Имя", desc: "Ник" },
      { t: "t", key: "npc_distance", name: "Дистанция", desc: "Расстояние" },
      { t: "t", key: "npc_health", name: "Здоровье", desc: "HP" },
      { t: "t", key: "npc_tracer", name: "Трейсер", desc: "Линия до цели" },
      { t: "s", key: "npc_max_distance", name: "Max Dist", desc: "Дистанция", min: 50, max: 600, step: 10, suffix: "м" },
    ],
  },
];

function renderMenuTabs() {
  const wrap = $("#menu-tabs");
  wrap.innerHTML = "";
  MENU.forEach((tab) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "menu-tab" + (tab.id === activeTab ? " active" : "");
    b.textContent = tab.name;
    b.onclick = () => { activeTab = tab.id; renderMenu(); };
    wrap.appendChild(b);
  });
}

function renderMenu() {
  renderMenuTabs();
  const tab = MENU.find((t) => t.id === activeTab) || MENU[0];
  const feats = state.features;
  const body = $("#menu-body");
  body.innerHTML = "";

  tab.feats.forEach((ft) => {
    const card = document.createElement("div");
    card.className = "feat";
    if (ft.t === "s") card.classList.add("slider-row");
    if (ft.t === "x") card.classList.add("sel-row");

    const label = document.createElement("div");
    label.className = "feat-label";
    const name = document.createElement("b");
    name.textContent = ft.name;
    const desc = document.createElement("span");
    desc.textContent = ft.desc;
    label.appendChild(name);
    label.appendChild(desc);

    if (ft.t === "t") {
      const val = !!feats[ft.key];
      const sw = document.createElement("label");
      sw.className = "switch";
      const inp = document.createElement("input");
      inp.type = "checkbox";
      inp.checked = val;
      inp.onchange = () => {
        feats[ft.key] = inp.checked;
        pushFeatures();
      };
      const track = document.createElement("span");
      track.className = "track";
      const knob = document.createElement("span");
      knob.className = "knob";
      track.appendChild(knob);
      sw.appendChild(inp);
      sw.appendChild(track);
      card.appendChild(label);
      card.appendChild(sw);
    } else if (ft.t === "s") {
      const val = +feats[ft.key];
      const cur = document.createElement("b");
      cur.textContent = val + ft.suffix;
      label.appendChild(cur);

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = ft.min; slider.max = ft.max; slider.step = ft.step;
      slider.value = val;
      slider.oninput = () => {
        feats[ft.key] = parseFloat(slider.value);
        cur.textContent = parseFloat(slider.value) + ft.suffix;
        pushFeatures();
      };
      card.appendChild(label);
      card.appendChild(slider);
    } else if (ft.t === "x") {
      const val = +feats[ft.key];
      const sel = document.createElement("select");
      ft.options.forEach((o) => {
        const op = document.createElement("option");
        op.value = o.v; op.textContent = o.l;
        if (o.v === val) op.selected = true;
        sel.appendChild(op);
      });
      sel.onchange = () => { feats[ft.key] = parseInt(sel.value, 10); pushFeatures(); };
      card.appendChild(label);
      card.appendChild(sel);
    }
    body.appendChild(card);
  });

  $("#menu-license").textContent = licenseLabel();
}

function activeKey() {
  let best = null;
  for (const k of state.keys) {
    if (k.days === 0) return { key: k, lifetime: true };
    if (k.expires_at > Date.now() && (!best || k.expires_at > best.expires_at)) best = k;
  }
  return best ? { key: best, lifetime: false } : null;
}

function licenseLabel() {
  const act = activeKey();
  if (!act) return "Лицензия: не активирована";
  if (act.lifetime) return "Лицензия: Lifetime ∞";
  const left = Math.max(0, Math.ceil((act.key.expires_at - Date.now()) / 86400000));
  return "Лицензия: ещё " + left + " дн.";
}

/* ================= АВТОРИЗАЦИЯ ================= */

let authAgreed = false;

function renderAuth() {
  if (document.getElementById("p-in").classList.contains("on")) return;
  go("in");
}

function go(t) {
  ["in", "reg"].forEach((x) => {
    document.getElementById("p-" + x).classList.toggle("on", x === t);
    document.getElementById("tb-" + x).classList.toggle("on", x === t);
  });
  document.getElementById("ink").classList.toggle("r", t === "reg");
  st("s-in", "");
  st("s-reg", "");
}

function ey(id, btn) {
  const i = document.getElementById(id);
  i.type = i.type === "password" ? "text" : "password";
  btn.querySelector("i").className = i.type === "password" ? "ti ti-eye" : "ti ti-eye-off";
}

function pws(inp, bid) {
  const v = inp.value;
  const b = document.getElementById(bid);
  let s = 0;
  if (v.length >= 6) s++;
  if (v.length >= 10) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  b.style.width = Math.round((s / 5) * 100) + "%";
  b.style.background = s <= 1 ? "#8a4b4b" : s <= 3 ? "#7a7a3f" : "#4c8554";
}

function fmt(el) {
  let v = el.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);
  v = v.replace(/(.{4})(?=.)/g, "$1-");
  el.value = v;
  const ok = document.getElementById("iok");
  const clean = v.replace(/-/g, "");
  if (clean.length >= 4) { ok.classList.add("show"); ok.style.opacity = 1; }
  else { ok.classList.remove("show"); ok.style.opacity = 0; }
}

function tglchk() {
  authAgreed = !authAgreed;
  document.getElementById("chk").classList.toggle("on", authAgreed);
}

function rip(btn, ev) {
  const r = btn.getBoundingClientRect();
  const s = document.createElement("span");
  s.className = "rip";
  s.style.left = (ev.clientX - r.left) + "px";
  s.style.top = (ev.clientY - r.top) + "px";
  btn.appendChild(s);
  setTimeout(() => s.remove(), 600);
}

function st(id, msg, cls) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = "st" + (cls ? " " + cls : "");
}

async function dologin(btn) {
  rip(btn, event);
  const lg = document.getElementById("i-lg").value.trim();
  const pw = document.getElementById("i-pw").value;
  const btxt = btn.querySelector(".btxt");
  if (!lg || !pw) { st("s-in", "Заполни оба поля", "err"); return; }
  btn.classList.add("ld");
  btxt.textContent = "Проверяем...";
  try {
    await api("/api/login", { method: "POST", body: { login: lg, password: pw } });
    await refreshMe();
    document.getElementById("i-lg").value = "";
    document.getElementById("i-pw").value = "";
    btn.classList.remove("ld");
    btxt.textContent = "Войти в аккаунт";
    st("s-in", "Добро пожаловать, " + state.user.login + " ✓", "ok");
    toast("Добро пожаловать, <b>" + state.user.login + "</b>");
    location.hash = "#/";
  } catch (e) {
    btn.classList.remove("ld");
    btxt.textContent = "Войти в аккаунт";
    st("s-in", e.message, "err");
  }
}

async function doreg(btn) {
  rip(btn, event);
  const lg = document.getElementById("r-lg").value.trim();
  const pw = document.getElementById("r-pw").value;
  const tg = document.getElementById("r-tg").value.trim();
  const inv = document.getElementById("r-inv").value.trim();
  const btxt = btn.querySelector(".btxt");
  if (!lg || !pw || !tg || !inv) { st("s-reg", "Заполни все поля", "err"); return; }
  if (!authAgreed) { st("s-reg", "Нужно принять условия", "err"); return; }
  btn.classList.add("ld");
  btxt.textContent = "Создаём аккаунт...";
  document.querySelectorAll("#sdots .step-dot").forEach((d, i) => { d.className = "step-dot on"; d.style.animationDelay = i * 0.15 + "s"; });
  try {
    await api("/api/register", { method: "POST", body: { login: lg, password: pw, tg, invite: inv } });
    await refreshMe();
    btn.classList.remove("ld");
    btxt.textContent = "Создать аккаунт";
    document.querySelectorAll("#sdots .step-dot").forEach((d) => d.className = "step-dot");
    st("s-reg", "Аккаунт создан ✓", "ok");
    toast("Добро пожаловать, <b>" + state.user.login + "</b>");
    location.hash = "#/";
  } catch (e) {
    btn.classList.remove("ld");
    btxt.textContent = "Создать аккаунт";
    document.querySelectorAll("#sdots .step-dot").forEach((d) => d.className = "step-dot");
    st("s-reg", e.message, "err");
  }
}

async function tgc() {
  try {
    const d = await api("/api/tg-login", { method: "POST" });
    st("s-in", "Заглушка: OAuth через " + d.url.replace("https://t.me/", "@"), "ok");
  } catch (e) {
    st("s-in", e.message, "err");
  }
}

/* ================= КАБИНЕТ ================= */

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("ru-RU") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function renderCabinet() {
  const login = state.user.login;
  $("#cab-user").textContent = login;
  $("#cab-avatar").innerHTML = '<img src="/img/avatar.gif" alt="avatar" class="cab-avatar-img">';
  const tg = state.user.tg;
  $("#cab-tg").textContent = tg ? "Telegram: @" + tg : "Telegram не привязан";

  const keys = state.keys || [];
  $("#cab-empty").classList.toggle("hidden", keys.length !== 0);
  $("#cab-count").textContent = keys.length;
  $("#cab-alive").textContent = keys.filter((k) => k.days === 0 || k.expires_at > Date.now()).length;

  const list = $("#key-list");
  list.innerHTML = "";
  keys.slice().reverse().forEach((k) => {
    const alive = k.days === 0 || k.expires_at > Date.now();
    const li = document.createElement("li");
    li.className = "key" + (alive ? " active" : " dead");

    const code = document.createElement("code");
    const realCode = k.code;
    let shown = false;

    code.className = "key-code masked";
    code.textContent = "••••••••••••••••";
    code.title = "Показать ключ";

    const eye = document.createElement("button");
    eye.type = "button";
    eye.className = "key-eye";
    eye.setAttribute("aria-label", "Показать ключ");
    eye.innerHTML = '<i class="ti ti-eye"></i>';
    eye.onclick = () => {
      shown = !shown;
      if (shown) {
        code.classList.remove("masked");
        code.textContent = realCode;
      } else {
        code.classList.add("masked");
        code.textContent = "••••••••••••••••";
      }
      eye.innerHTML = shown ? '<i class="ti ti-eye-off"></i>' : '<i class="ti ti-eye"></i>';
      eye.classList.toggle("on", shown);
    };

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "key-eye";
    copy.setAttribute("aria-label", "Скопировать ключ");
    copy.innerHTML = '<i class="ti ti-copy"></i>';
    copy.onclick = () => {
      navigator.clipboard.writeText(realCode).then(() => {
        copy.innerHTML = '<i class="ti ti-check"></i>';
        copy.classList.add("on");
        setTimeout(() => {
          copy.innerHTML = '<i class="ti ti-copy"></i>';
          copy.classList.remove("on");
        }, 1200);
      });
    };

    const hwid = document.createElement("button");
    hwid.type = "button";
    hwid.className = "key-eye";
    hwid.setAttribute("aria-label", "Сбросить HWID");
    hwid.innerHTML = '<i class="ti ti-refresh"></i>';
    hwid.onclick = () => openHwidModal();

    const info = document.createElement("span");
    let leftText = "";
    if (k.days === 0) {
      leftText = "∞";
    } else if (alive) {
      const hoursLeft = Math.max(0, Math.ceil((k.expires_at - Date.now()) / 3600000));
      leftText = hoursLeft > 720 ? "∞" : hoursLeft + "ч до конца подписки";
    }
    info.textContent = leftText;

    const badge = document.createElement("span");
    badge.className = "badge" + (alive ? " active" : "");
    const hoursLeft = alive && k.days !== 0
      ? Math.ceil((k.expires_at - Date.now()) / 3600000)
      : 0;
    badge.textContent = k.days === 0 || (alive && hoursLeft > 720)
      ? "LIFETIME"
      : alive ? "активна" : "истёк";

    const ver = document.createElement("span");
    ver.className = "ver-tag";
    ver.textContent = "v" + state.version;

    li.appendChild(code);
    li.appendChild(eye);
    li.appendChild(copy);
    li.appendChild(hwid);
    li.appendChild(info);
    li.appendChild(badge);
    li.appendChild(ver);
    list.appendChild(li);
  });
}

async function redeemKey(e) {
  e.preventDefault();
  const err = $("#cab-err");
  const ok = $("#cab-ok");
  err.classList.add("hidden");
  ok.classList.add("hidden");
  const input = $("#redeem-code");
  try {
    const d = await api("/api/keys/redeem", { method: "POST", body: { code: input.value } });
    ok.textContent = "Ключ добавлен: " + d.key.code;
    ok.classList.remove("hidden");
    input.value = "";
    await refreshMe();
    renderCabinet();
    renderMenu();
  } catch (e2) {
    err.textContent = e2.message;
    err.classList.remove("hidden");
  }
}

/* ================= МОДАЛКА ================= */

let modalPlan = null;

function openBuyModal(id) {
  modalPlan = state.plans.find((p) => p.id === id);
  if (!modalPlan) return;
  $("#modal-eyebrow").textContent = "Оформление заказа";
  $("#modal-title").textContent = "PULSE DLC — " + GAME_NAMES[modalPlan.game || "rust"];
  $("#modal-sub").textContent = modalPlan.name + " — " +
    (modalPlan.days === 0 ? "лицензия навсегда" : (modalPlan.days === 1 ? "лицензия на 1 день" : "лицензия на " + modalPlan.days + " дней"));
  $("#modal-price").textContent = modalPlan.price + " ₽";
  $("#modal-stub").textContent = "";
  $("#buy-modal").classList.remove("hidden");
}

function closeBuyModal() {
  $("#buy-modal").classList.add("hidden");
  modalPlan = null;
}

function openHwidModal() {
  $("#hwid-modal").classList.remove("hidden");
}

function closeHwidModal() {
  $("#hwid-modal").classList.add("hidden");
}

const FUNPAY_LINKS = {
  1: "https://funpay.com/lots/offer?id=74859322",
  7: "https://funpay.com/lots/offer?id=74658106",
  30: "https://funpay.com/lots/offer?id=74658129",
  0: "https://funpay.com/lots/offer?id=74859316",
};
const TG_BOT_URL = "https://t.me/pulsedlc_bot";

function proceedPayment(method) {
  if (!modalPlan) return;
  const p = modalPlan;
  closeBuyModal();
  if (method === "tg") {
    toast("Открываем <b>Telegram-бота</b> для оплаты…", "good");
    window.open(TG_BOT_URL, "_blank");
  } else {
    const link = FUNPAY_LINKS[p.days] || FUNPAY_LINKS[0];
    toast("Открываем <b>FunPay</b> — <b>" + p.name + "</b>…", "good");
    window.open(link, "_blank");
  }
}

/* ================= ИНИЦИАЛИЗАЦИЯ ================= */

async function init() {
  window.addEventListener("hashchange", route);

  document.querySelectorAll("#game-tabs .game-tab").forEach((b) => {
    b.addEventListener("click", () => switchGame(b.dataset.game));
  });

  $("#modal-close").addEventListener("click", closeBuyModal);
  $("#buy-modal").addEventListener("click", (e) => {
    if (e.target === $("#buy-modal")) closeBuyModal();
  });
  $("#hwid-close").addEventListener("click", closeHwidModal);
  $("#hwid-modal").addEventListener("click", (e) => {
    if (e.target === $("#hwid-modal")) closeHwidModal();
  });
  $("#pay-tg").addEventListener("click", () => proceedPayment("tg"));
  $("#pay-fonpay").addEventListener("click", () => proceedPayment("fonpay"));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeBuyModal();
      closeHwidModal();
    }
    if (e.key === "Insert") {
      const w = $("#menu-window");
      if (w) w.classList.toggle("hidden");
    }
  });

  renderProducts();
  route();
}

document.addEventListener("DOMContentLoaded", init);

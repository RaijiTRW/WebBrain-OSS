export const starterSiteName = "Легкий сайт";

export const starterSiteHtml = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WebBrain Starter Site</title>
    <meta
      name="description"
      content="Легкий стартовый сайт, созданный для будущего визуального редактора WebBrain."
    />
  </head>
  <body>
    <main class="page-shell">
      <nav class="site-nav" aria-label="Навигация">
        <a class="brand" href="#top">Studio</a>
        <div class="nav-links">
          <a href="#services">Услуги</a>
          <a href="#work">Процесс</a>
          <a href="#contact">Контакты</a>
        </div>
      </nav>

      <section id="top" class="hero">
        <p class="eyebrow">Сайт для бизнеса</p>
        <h1>Запустите аккуратную страницу без долгой сборки.</h1>
        <p class="hero-copy">
          Чистый HTML, CSS и JS-шаблон для первого редактора WebBrain: герой, преимущества,
          шаги работы и контактный блок.
        </p>
        <div class="hero-actions">
          <a class="button primary" href="#contact">Оставить заявку</a>
          <a class="button secondary" href="#services">Посмотреть блоки</a>
        </div>
      </section>

      <section id="services" class="cards" aria-label="Преимущества">
        <article>
          <span>01</span>
          <h2>Структура</h2>
          <p>Первый экран, оффер, CTA и понятная логика для клиента.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Визуал</h2>
          <p>Темный стиль, мягкие акценты и секции, готовые к редактированию.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Запуск</h2>
          <p>Легкий код без зависимостей, который можно сохранять и публиковать.</p>
        </article>
      </section>

      <section id="work" class="process">
        <div>
          <p class="eyebrow">Процесс</p>
          <h2>От идеи к странице за один поток.</h2>
        </div>
        <ol>
          <li>Опишите бизнес и цель.</li>
          <li>Получите черновик сайта.</li>
          <li>Отредактируйте блоки визуально.</li>
        </ol>
      </section>

      <section id="contact" class="contact">
        <h2>Готовы собрать первый сайт?</h2>
        <p>Замените текст, цвета и блоки в будущем редакторе WebBrain.</p>
        <button id="contactButton" class="button primary" type="button">Начать</button>
      </section>
    </main>
  </body>
</html>`;

type StarterSitePageTemplate = {
  name: string;
  slug: string;
  html: string;
  sort_order: number;
};

function starterPageShell(title: string, eyebrow: string, copy: string, body: string) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — WebBrain Starter Site</title>
  </head>
  <body>
    <main class="page-shell">
      <nav class="site-nav" aria-label="Навигация">
        <a class="brand" href="#top">Studio</a>
        <div class="nav-links">
          <a href="#top">Главная</a>
          <a href="#services">Услуги</a>
          <a href="#work">Процесс</a>
          <a href="#contact">Контакты</a>
        </div>
      </nav>

      <section id="top" class="hero">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p class="hero-copy">${copy}</p>
      </section>

      ${body}
    </main>
  </body>
</html>`;
}

export const starterSitePageTemplates: StarterSitePageTemplate[] = [
  {
    name: "Главная",
    slug: "home",
    html: starterSiteHtml,
    sort_order: 0
  },
  {
    name: "Услуги",
    slug: "services",
    html: starterPageShell(
      "Услуги для первого запуска",
      "Услуги",
      "От первого экрана до формы заявки: страница собирается как отдельный документ, а не как прокрутка к секции.",
      `<section id="services" class="cards" aria-label="Услуги">
        <article>
          <span>01</span>
          <h2>Структура</h2>
          <p>Собираем понятный оффер, блоки доверия и CTA под конкретную нишу.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Визуал</h2>
          <p>Подбираем темный стиль, акценты и ритм страницы без лишней перегрузки.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Заявки</h2>
          <p>Готовим путь клиента к форме, звонку или записи на услугу.</p>
        </article>
      </section>`
    ),
    sort_order: 1
  },
  {
    name: "Процесс",
    slug: "process",
    html: starterPageShell(
      "Процесс работы",
      "Процесс",
      "Каждая страница хранится отдельно, поэтому редактор сможет переключать документы сайта без прыжков по якорям.",
      `<section id="work" class="process">
        <div>
          <p class="eyebrow">Как работает</p>
          <h2>От идеи к готовой странице.</h2>
        </div>
        <ol>
          <li>Опишите нишу, стиль и цель страницы.</li>
          <li>WebBrain создаст структуру и первый визуальный черновик.</li>
          <li>Откройте страницу в редакторе и правьте блоки визуально.</li>
        </ol>
      </section>`
    ),
    sort_order: 2
  },
  {
    name: "Контакты",
    slug: "contacts",
    html: starterPageShell(
      "Контакты и заявка",
      "Контакты",
      "Финальная страница сайта для заявки, связи и короткого объяснения следующего шага.",
      `<section id="contact" class="contact">
        <h2>Готовы собрать первый сайт?</h2>
        <p>Оставьте заявку, а потом замените текст, цвета и блоки в редакторе WebBrain.</p>
        <button id="contactButton" class="button primary" type="button">Начать</button>
      </section>`
    ),
    sort_order: 3
  }
];

export const starterSiteCss = `:root {
  color-scheme: dark;
  --bg: #0d0f0f;
  --panel: #181b1c;
  --panel-soft: #202425;
  --text: #f4f5f0;
  --muted: rgba(244, 245, 240, 0.64);
  --line: rgba(244, 245, 240, 0.12);
  --lime: #b9ff47;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at 75% 12%, rgba(185, 255, 71, 0.12), transparent 30rem),
    linear-gradient(180deg, #101312 0%, var(--bg) 58%);
  color: var(--text);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

.page-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
}

.site-nav {
  position: sticky;
  top: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: rgba(18, 20, 21, 0.78);
  backdrop-filter: blur(18px);
}

.brand {
  font-size: 1.05rem;
  font-weight: 800;
}

.nav-links {
  display: flex;
  gap: 18px;
  color: var(--muted);
  font-size: 0.92rem;
}

.hero {
  min-height: 76vh;
  display: grid;
  align-content: center;
  padding: 96px 0 72px;
}

.eyebrow {
  margin: 0 0 16px;
  color: var(--lime);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  max-width: 880px;
  margin-bottom: 24px;
  font-size: clamp(3.2rem, 8vw, 7rem);
  line-height: 0.94;
  letter-spacing: -0.03em;
}

h2 {
  margin-bottom: 14px;
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 1;
  letter-spacing: -0.02em;
}

.hero-copy {
  max-width: 660px;
  color: var(--muted);
  font-size: clamp(1.05rem, 2vw, 1.32rem);
  line-height: 1.65;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 22px;
  border: 1px solid var(--line);
  border-radius: 16px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.button:hover {
  transform: translateY(-2px);
}

.button.primary {
  border-color: transparent;
  background: var(--lime);
  color: #0a0c0b;
}

.button.secondary {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--line);
}

.cards article,
.process,
.contact {
  background: rgba(24, 27, 28, 0.86);
}

.cards article {
  min-height: 260px;
  padding: 28px;
}

.cards span {
  color: var(--lime);
  font-weight: 900;
}

.cards h2 {
  margin-top: 72px;
  font-size: 2rem;
}

.cards p,
.contact p,
.process li {
  color: var(--muted);
  line-height: 1.65;
}

.process {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 32px;
  margin-top: 80px;
  padding: 48px;
  border: 1px solid var(--line);
  border-radius: 24px;
}

.process ol {
  display: grid;
  gap: 14px;
  margin: 0;
  padding-left: 22px;
}

.contact {
  margin: 80px 0 32px;
  padding: 54px;
  border: 1px solid var(--line);
  border-radius: 28px;
  text-align: center;
}

.contact p {
  max-width: 560px;
  margin: 0 auto 24px;
}

.is-clicked {
  transform: scale(0.98);
}

@media (max-width: 760px) {
  .nav-links {
    display: none;
  }

  .hero {
    min-height: 68vh;
    padding-top: 72px;
  }

  .cards,
  .process {
    grid-template-columns: 1fr;
  }

  .process,
  .contact {
    padding: 30px;
  }
}`;

export const starterSiteJs = `const contactButton = document.querySelector("#contactButton");

if (contactButton) {
  contactButton.addEventListener("click", () => {
    contactButton.classList.add("is-clicked");
    contactButton.textContent = "Черновик готов";

    window.setTimeout(() => {
      contactButton.classList.remove("is-clicked");
    }, 180);
  });
}`;

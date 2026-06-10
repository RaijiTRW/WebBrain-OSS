"use client";

import { type FormEvent, type ReactNode, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Code2,
  LayoutDashboard,
  MessageCircle,
  MousePointer2,
  Play,
  Plus,
  Rocket,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Monitor,
  Wand2
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeaderIsland } from "./HeaderIsland";
import { ThreeButtonSurface } from "./ThreeButtonSurface";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─── Data ─── */

const howItWorks = [
  {
    step: "01",
    title: "Опишите проект в чате",
    body: "Расскажите что нужно: сайт, логику, формы, интеграции. WebBrain поймёт задачу и предложит архитектуру.",
    icon: MessageCircle
  },
  {
    step: "02",
    title: "AI собирает фронт и бэкенд",
    body: "Не просто красивая страница — полноценный проект с серверной логикой, базой данных и API.",
    icon: Code2
  },
  {
    step: "03",
    title: "Деплой в один клик",
    body: "Готовый проект разворачивается на нашем хостинге. Ваш сайт работает сразу после генерации.",
    icon: Rocket
  }
];

const betaFeatures = [
  "AI-генерация полноценного сайта из описания",
  "Серверная логика и бэкенд из коробки",
  "Автоматический деплой на наш хостинг",
  "Визуальное редактирование после генерации",
  "Чат для итеративных правок",
  "Адаптивная вёрстка (мобайл, планшет, десктоп)"
];

const roadmapItems = [
  {
    phase: "01",
    tool: "AI Builder",
    title: "Ядро генерации сайта",
    status: "live" as const,
    body: "Чат превращает описание бизнеса в рабочую страницу: структура, тексты, визуальный редактор и первые backend-сценарии.",
    items: [
      "генерация сайта из промпта",
      "визуальный редактор после сборки",
      "чат для точечных правок",
      "публикация на хостинге WebBrain"
    ]
  },
  {
    phase: "02",
    tool: "Leads CRM",
    title: "Система заявок",
    status: "next" as const,
    body: "Следующий слой — чтобы сайт не просто выглядел готовым, а собирал обращения и помогал не терять клиентов.",
    items: [
      "формы и единая база заявок",
      "уведомления в Telegram",
      "простая карточка клиента",
      "статусы обработки"
    ]
  },
  {
    phase: "03",
    tool: "Connect",
    title: "Интеграции и инфраструктура",
    status: "planned" as const,
    body: "Подключения, которые превращают лендинг в часть бизнеса: домен, аналитика, платежи и внешние сервисы.",
    items: [
      "подключение домена",
      "аналитика посещений",
      "оплаты и мессенджеры",
      "SEO-база для страниц"
    ]
  },
  {
    phase: "04",
    tool: "Growth OS",
    title: "Рост и командная работа",
    status: "planned" as const,
    body: "Инструменты для проектов, которые растут: несколько страниц, роли, компоненты, оптимизация и работа команды.",
    items: [
      "мультистраничные проекты",
      "AI-улучшение конверсии",
      "командные роли",
      "библиотека компонентов"
    ]
  }
];

const faq = [
  {
    question: "Чем WebBrain отличается от Тильды?",
    answer: "Тильда — это конструктор где вы вручную собираете блоки. WebBrain генерирует полноценный проект с бэкендом из описания в чате. Вы получаете не шаблон, а рабочий сайт с серверной логикой."
  },
  {
    question: "Что значит «бэкенд из коробки»?",
    answer: "Ваш сайт — это не просто статическая страница. WebBrain создаёт серверную часть: формы отправляют данные, API работает, база данных подключена. Всё это деплоится автоматически."
  },
  {
    question: "Нужно ли знать код?",
    answer: "Нет. Вы описываете что нужно обычным языком. AI пишет код за вас. После генерации можно править визуально или через чат."
  },
  {
    question: "Что доступно в бете?",
    answer: "Генерация сайта из описания, бэкенд, автоматический деплой на наш хостинг, визуальный редактор и чат для правок. Founding members получают фиксированную цену навсегда."
  },
  {
    question: "Можно ли подключить свой домен?",
    answer: "Пока проект доступен на поддомене WebBrain. Подключение своего домена находится в дорожной карте и будет открываться поэтапно."
  }
];

const editorTools: Array<{ label: string; Icon: React.ComponentType<{ className?: string }>; hint: string }> = [
  { label: "Секция", Icon: LayoutDashboard, hint: "Выбрана секция hero" },
  { label: "Колонки", Icon: Wand2, hint: "Сетка блока активна" },
  { label: "Заголовок", Icon: MessageCircle, hint: "Редактируется H1" },
  { label: "Изображение", Icon: MousePointer2, hint: "Можно заменить фон" },
  { label: "Кнопка", Icon: ArrowRight, hint: "Настройка CTA" }
];

const devices = [
  { id: "desktop", label: "Desktop", Icon: Monitor, width: "100%" },
  { id: "tablet", label: "Tablet", Icon: Tablet, width: "76%" },
  { id: "mobile", label: "Mobile", Icon: Smartphone, width: "48%" }
] as const;

/* ─── Main Component ─── */

export function ImageFirstLanding() {
  const root = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((item) => {
          gsap.fromTo(
            item,
            { y: 48, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.95,
              ease: "power3.out",
              scrollTrigger: {
                trigger: item,
                start: "top 86%"
              }
            }
          );
        });

        gsap.fromTo(
          ".hero-stage",
          { y: 24, scale: 1.025 },
          {
            y: -42,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".hero-section",
              start: "top top",
              end: "bottom top",
              scrub: true
            }
          }
        );

        gsap.utils.toArray<HTMLElement>(".scene-media").forEach((item) => {
          gsap.fromTo(
            item,
            { y: 70, scale: 0.97, opacity: 0.72 },
            {
              y: 0,
              scale: 1,
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: item,
                start: "top 92%",
                end: "top 45%",
                scrub: true
              }
            }
          );
        });
      });

      return () => media.revert();
    },
    { scope: root }
  );

  return (
    <main ref={root} className="w-full max-w-full overflow-x-hidden bg-[#020304] text-white">
      <HeaderIsland />
      <HeroSection />
      <HowItWorksSection />
      <ProductDemoSection />
      <BetaFeaturesSection />
      <RoadmapSection />
      <FAQCTASection />
    </main>
  );
}

/* ─── Hero ─── */

function HeroSection() {
  return (
    <section className="hero-section grain relative isolate min-h-[900px] overflow-hidden px-5 pb-16 pt-32 md:min-h-screen md:px-14 md:pt-36">
      <div className="absolute inset-0 -z-20 bg-[#020304]" />
      <div className="hero-stage absolute right-[-4vw] top-[10%] -z-10 hidden w-[72vw] overflow-hidden md:block">
        <video
          className="relative z-10 aspect-[16/9] w-full object-contain opacity-95 drop-shadow-[0_52px_120px_rgba(0,0,0,0.68)] [mask-image:linear-gradient(90deg,transparent_0%,black_14%,black_100%)] motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/webbrain-asset-hero-editor.png"
        >
          <source src="/media/webbrain-hero-kling-loop.mp4" type="video/mp4" />
        </video>
        <img
          src="/media/webbrain-asset-hero-editor.png"
          alt=""
          className="relative z-10 hidden aspect-[16/9] w-full object-contain opacity-95 drop-shadow-[0_52px_120px_rgba(0,0,0,0.68)] [mask-image:linear-gradient(90deg,transparent_0%,black_14%,black_100%)] motion-reduce:block"
        />
        <span className="pointer-events-none absolute left-[32%] top-[18%] z-20 h-[56%] w-[44%] rounded-full bg-lime/[0.08] blur-3xl" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_77%_54%,rgba(200,255,94,0.12),transparent_30%),linear-gradient(90deg,#020304_0%,rgba(2,3,4,0.98)_38%,rgba(2,3,4,0.34)_66%,rgba(2,3,4,0)_100%)]" />
      <div className="absolute bottom-0 left-0 right-0 -z-10 h-[38%] bg-[linear-gradient(180deg,transparent,#020304)]" />

      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1540px] flex-col justify-center md:flex-row md:items-center md:justify-start">
        <div className="relative z-10 max-w-[760px] pt-12 md:pt-0">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/[0.04] px-4 py-2 text-sm text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
            Закрытая бета — Founding member цена навсегда
          </div>
          <h1 className="text-balance text-[clamp(2.1rem,8.5vw,4.75rem)] font-semibold leading-[1.08] tracking-normal md:text-nowrap">
            <span className="block md:whitespace-nowrap">Опишите проект —</span>
            <span className="mt-4 block md:whitespace-nowrap">получите <span className="text-lime">рабочий сайт</span></span>
          </h1>
          <p className="mt-8 max-w-[650px] text-pretty text-[1.35rem] leading-9 text-white/[0.74] md:text-[1.55rem] md:leading-10">
            AI-конструктор который создаёт не просто страницу, а полноценный проект с бэкендом и&nbsp;разворачивает его на хостинге. Без кода, без подрядчиков.
          </p>

          <div className="hero-actions-3d mt-12 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="hero-button-3d hero-button-3d-primary inline-flex h-16 items-center justify-center gap-4 overflow-visible rounded-[8px] bg-transparent px-10 text-lg font-semibold text-black"
            >
              <ThreeButtonSurface variant="lime" radius={8} depth={18} />
              <span className="relative z-10">Попасть в бету</span>
              <ArrowRight className="relative z-10 h-5 w-5" />
            </Link>
            <a
              href="#how"
              className="hero-button-3d hero-button-3d-secondary inline-flex h-16 items-center justify-center gap-4 overflow-visible rounded-[8px] bg-transparent px-10 text-lg font-semibold text-white backdrop-blur"
            >
              <ThreeButtonSurface variant="dark" radius={8} depth={16} />
              <span className="relative z-10">Как это работает</span>
              <Play className="relative z-10 h-5 w-5 fill-current" />
            </a>
          </div>
        </div>

        <Link href="/signup" className="hero-prompt-3d absolute bottom-[8%] left-[46%] right-[10%] z-20 hidden items-center gap-5 overflow-visible rounded-[28px] bg-transparent px-7 py-5 backdrop-blur-2xl lg:flex">
          <ThreeButtonSurface variant="prompt" radius={28} depth={22} />
          <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-lime/[0.35] bg-black/[0.42] text-lime">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="relative z-10 min-w-0 flex-1 text-xl leading-7 text-white/[0.88]">
            Создай сайт строительной компании с формой заявки и CRM
          </span>
          <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lime text-black shadow-[0_0_36px_rgba(200,255,94,0.34)]">
            <ArrowRight className="h-6 w-6" />
          </span>
        </Link>

        <figure className="scene-media relative z-10 mt-16 block w-full overflow-hidden rounded-[10px] shadow-[0_34px_100px_rgba(0,0,0,0.52)] md:hidden">
          <img
            src="/media/webbrain-asset-hero-editor.png"
            alt="WebBrain AI конструктор"
            className="aspect-[16/9] w-full object-cover"
          />
        </figure>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */

function HowItWorksSection() {
  return (
    <section id="how" className="px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1540px]">
        <div className="reveal mb-16">
          <h2 className="max-w-[900px] text-balance text-[clamp(2.7rem,5vw,5.8rem)] font-semibold leading-[0.98] tracking-normal">
            Три шага до <span className="text-lime">готового проекта</span>
          </h2>
          <p className="mt-7 max-w-[680px] text-pretty text-xl leading-9 text-white/[0.62] md:text-2xl md:leading-10">
            Не конструктор блоков. Не шаблон. Полноценная разработка — от идеи до рабочего сайта на хостинге.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {howItWorks.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.step}
                className="reveal group relative overflow-hidden rounded-[10px] bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-8 shadow-[0_32px_100px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.035)] md:p-10"
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lime/[0.1] text-lime">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="font-mono text-2xl text-lime/70">{item.step}</span>
                </div>
                <h3 className="text-2xl font-semibold leading-tight md:text-3xl">{item.title}</h3>
                <p className="mt-4 text-lg leading-8 text-white/[0.58]">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Product Demo ─── */

function ProductDemoSection() {
  const [mode, setMode] = useState<"chat" | "editor">("chat");
  const [selectedTool, setSelectedTool] = useState(editorTools[0].label);
  const [device, setDevice] = useState<(typeof devices)[number]["id"]>("desktop");
  const [draft, setDraft] = useState("");
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const selectedToolHint = editorTools.find((tool) => tool.label === selectedTool)?.hint ?? editorTools[0].hint;
  const activeDevice = devices.find((item) => item.id === device) ?? devices[0];

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setSentMessage(value);
    setDraft("");
    setMode("chat");
  }

  return (
    <section id="product" className="px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1540px]">
        <div className="reveal mb-12 grid gap-8 lg:grid-cols-[1fr_390px] lg:items-end">
          <div>
            <h2 className="max-w-[1160px] text-balance text-[clamp(2.7rem,5vw,5.8rem)] font-semibold leading-[0.98] tracking-normal">
              Чат задаёт направление. <span className="text-lime">Редактор даёт контроль.</span>
            </h2>
            <p className="mt-7 max-w-[780px] text-pretty text-xl leading-9 text-white/[0.62] md:text-2xl md:leading-10">
              Сначала опишите задачу словами, затем двигайте блоки, меняйте тексты и собирайте страницу визуально.
            </p>
          </div>

          <div className="flex w-fit rounded-full bg-white/[0.035] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] lg:ml-auto">
            <button
              type="button"
              aria-pressed={mode === "chat"}
              onClick={() => setMode("chat")}
              className={`h-12 rounded-full px-10 text-base font-semibold transition ${
                mode === "chat" ? "bg-white/[0.13] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-white/[0.45] hover:text-white"
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              aria-pressed={mode === "editor"}
              onClick={() => setMode("editor")}
              className={`h-12 rounded-full px-10 text-base font-semibold transition ${
                mode === "editor" ? "bg-white/[0.13] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-white/[0.45] hover:text-white"
              }`}
            >
              Editor
            </button>
          </div>
        </div>

        <div className="scene-media grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <div className="relative overflow-hidden rounded-[10px] bg-[#070b10] shadow-[0_34px_110px_rgba(0,0,0,0.54),inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="flex h-16 items-center justify-between bg-white/[0.018] px-5 text-sm text-white/[0.58] shadow-[inset_0_-1px_0_rgba(255,255,255,0.025)]">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">WebBrain</span>
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              </div>
              <div className="hidden items-center gap-5 md:flex">
                <span>Проекты</span>
                <span>Мой сайт</span>
                <span>Главная</span>
              </div>
              <Link href="/signup" className="rounded-[7px] bg-lime px-4 py-2 font-semibold text-black">
                Опубликовать
              </Link>
            </div>

            <div className="grid min-h-[610px] grid-cols-[84px_minmax(0,1fr)] md:grid-cols-[190px_minmax(0,1fr)]">
              <aside className="bg-white/[0.022] p-4 shadow-[inset_-1px_0_0_rgba(255,255,255,0.025)]">
                <div className="mb-5 hidden gap-2 text-xs font-semibold text-white/[0.78] md:flex">
                  <span className="border-b border-lime pb-2 text-white">Блоки</span>
                  <span className="pb-2 text-white/[0.42]">Страницы</span>
                  <span className="pb-2 text-white/[0.42]">Дизайн</span>
                </div>
                <div className="space-y-3">
                  {editorTools.map(({ label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={selectedTool === label}
                      onClick={() => {
                        setSelectedTool(label);
                        setMode("editor");
                      }}
                      className={`flex h-12 w-full items-center gap-3 rounded-[7px] border px-3 text-left text-sm font-medium transition ${
                        mode === "editor" && selectedTool === label
                          ? "border-lime/30 bg-lime/10 text-white"
                          : "border-white/[0.04] bg-white/[0.045] text-white/70 hover:bg-white/[0.075] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-white/[0.72]" />
                      <span className="hidden md:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="relative min-w-0 overflow-hidden bg-[#0a0f13] p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between text-sm text-white/[0.48]">
                  <span>Редактор страницы</span>
                  <div className="flex items-center gap-3">
                    {devices.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        title={label}
                        aria-label={label}
                        aria-pressed={device === id}
                        onClick={() => {
                          setDevice(id);
                          setMode("editor");
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-[6px] border transition ${
                          device === id ? "border-lime/50 bg-lime/[0.12] text-lime" : "border-white/10 text-white/[0.52] hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-[6px] bg-[#020304]">
                  <img
                    src="/media/webbrain-asset-business-strip.png"
                    alt="Редактируемая страница в WebBrain"
                    className="mx-auto h-[500px] object-cover object-center transition-all duration-500 md:h-[535px]"
                    style={{ width: activeDevice.width, objectPosition: "40% 50%" }}
                  />
                  {mode === "editor" ? (
                    <>
                      <div className="absolute left-[5%] right-[4%] top-[18%] h-[45%] border border-cyan/80 shadow-[0_0_34px_rgba(99,230,255,0.12)]" />
                      <div className="absolute left-1/2 top-[25%] flex -translate-x-1/2 animate-[contentFade_0.45s_cubic-bezier(0.22,1,0.36,1)_both] items-center gap-3 rounded-[8px] bg-[#111820]/[0.92] px-4 py-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                        <MousePointer2 className="h-4 w-4 text-cyan" />
                        <span className="text-sm font-semibold">{selectedToolHint}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[10px] bg-[#070b10] p-7 shadow-[0_34px_110px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="mb-8 flex items-center justify-between gap-4">
              <p className="text-xl font-medium text-white/[0.76]">Чат с WebBrain</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "chat" ? "bg-cyan/[0.18] text-cyan" : "bg-lime/[0.14] text-lime"}`}>
                {mode === "chat" ? "Chat" : "Editor"}
              </span>
            </div>
            <div className="space-y-5">
              <ChatBubble side="left">Сделай сайт для строительной компании: форма заявки, портфолио проектов и калькулятор стоимости.</ChatBubble>
              <ChatBubble side="right">Готово. Создал лендинг с формой, подключил бэкенд для приёма заявок и добавил калькулятор с логикой расчёта.</ChatBubble>
              <ChatBubble side="left">Добавь интеграцию с Telegram — пусть заявки приходят в бот.</ChatBubble>
              <ChatBubble side="right">Подключил Telegram-бот. Новые заявки будут приходить в чат сразу после отправки формы.</ChatBubble>
              {sentMessage ? (
                <>
                  <ChatBubble side="left">{sentMessage}</ChatBubble>
                  <ChatBubble side="right">Принял. Обновил проект и задеплоил изменения.</ChatBubble>
                </>
              ) : null}
            </div>
            <form onSubmit={submitMessage} className="mt-8 flex h-14 items-center gap-3 rounded-[9px] bg-white/[0.04] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Опишите, что нужно..."
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/[0.42]"
              />
              <button
                type="submit"
                aria-label="Отправить сообщение"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime text-black transition hover:bg-white"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ children, side }: { children: ReactNode; side: "left" | "right" }) {
  return (
    <div
      className={`max-w-[90%] rounded-[8px] px-5 py-4 text-lg leading-7 shadow-[0_18px_48px_rgba(0,0,0,0.22)] ${
        side === "right"
          ? "ml-auto bg-cyan/[0.28] text-white"
          : "bg-white/[0.085] text-white/[0.78]"
      }`}
    >
      {children}
    </div>
  );
}

/* ─── Beta Features ─── */

function BetaFeaturesSection() {
  return (
    <section className="px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1540px]">
        <div className="reveal grid gap-10 lg:grid-cols-[0.5fr_0.5fr] lg:items-center">
          <div>
            <h2 className="max-w-[580px] text-balance text-[clamp(2.25rem,3.35vw,4rem)] font-semibold leading-[1.02] tracking-normal">
              Что работает <span className="text-lime">прямо сейчас</span>
            </h2>
            <p className="mt-6 max-w-[520px] text-pretty text-xl leading-9 text-white/[0.62]">
              Бета уже доступна. Вот что вы получаете сегодня, без ожидания.
            </p>
          </div>

          <div className="scene-media space-y-4">
            {betaFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-4 rounded-[9px] bg-white/[0.032] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime/[0.15]">
                  <Check className="h-4 w-4 text-lime" />
                </span>
                <span className="text-lg text-white/[0.82]">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Roadmap ─── */

function RoadmapSection() {
  return (
    <section id="roadmap" className="px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1540px]">
        <div className="reveal mb-16">
          <h2 className="max-w-[900px] text-balance text-[clamp(2.7rem,5vw,5.8rem)] font-semibold leading-[0.98] tracking-normal">
            Что будем усиливать после первого запуска.
          </h2>
          <p className="mt-7 max-w-[680px] text-pretty text-xl leading-9 text-white/[0.62] md:text-2xl md:leading-10">
            WebBrain начинается с быстрого сайта, но дальше должен помогать с заявками, подключениями и ростом проекта. Приоритеты будем уточнять по обратной связи ранних пользователей.
          </p>
        </div>

        <div className="relative mx-auto max-w-[1080px]">
          <div className="absolute bottom-10 left-5 top-6 w-px bg-[linear-gradient(180deg,rgba(200,255,94,0.75),rgba(99,230,255,0.36),rgba(255,255,255,0.08))] md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-7 md:space-y-10">
            {roadmapItems.map((phase, index) => (
              <article
                key={phase.phase}
                className={`reveal relative grid gap-5 pl-16 md:grid-cols-[1fr_72px_1fr] md:items-center md:pl-0 ${
                  index % 2 === 0 ? "" : "md:[&_.roadmap-card]:col-start-3"
                }`}
              >
                {index % 2 !== 0 ? <div className="hidden md:block" /> : null}

                <div className="roadmap-card relative overflow-hidden rounded-[18px] border border-white/[0.075] bg-[linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.018))] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.045)] md:p-7">
                  <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-lime/[0.055] blur-3xl" />
                  <div className="relative z-10">
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-lime/20 bg-lime/[0.08] px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-lime">
                        {phase.tool}
                      </span>
                      {phase.status === "live" ? (
                        <span className="rounded-full bg-lime/[0.12] px-3 py-1 text-xs font-semibold text-lime">в работе сейчас</span>
                      ) : phase.status === "next" ? (
                        <span className="rounded-full bg-cyan/[0.1] px-3 py-1 text-xs font-semibold text-cyan">следующий слой</span>
                      ) : (
                        <span className="rounded-full bg-white/[0.055] px-3 py-1 text-xs font-semibold text-white/44">в дорожной карте</span>
                      )}
                    </div>

                    <h3 className="text-2xl font-semibold leading-tight text-white md:text-3xl">{phase.title}</h3>
                    <p className="mt-4 text-base leading-7 text-white/[0.58]">{phase.body}</p>

                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {phase.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-white/[0.66]">
                          <Check className="mt-1 h-4 w-4 shrink-0 text-lime" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="absolute left-0 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-lime/30 bg-[#07120b] font-mono text-sm font-semibold text-lime shadow-[0_0_30px_rgba(200,255,94,0.22)] md:static md:col-start-2 md:row-start-1 md:h-14 md:w-14 md:justify-self-center">
                  {phase.phase}
                </div>

                {index % 2 === 0 ? <div className="hidden md:block" /> : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ + CTA ─── */

function FAQCTASection() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section id="faq" className="px-5 pb-10 pt-24 md:px-8 md:pb-12 md:pt-36">
      <div className="mx-auto max-w-[1540px]">
        <div className="reveal max-w-[1040px]">
          <h2 className="text-balance text-[clamp(3rem,5vw,5.8rem)] font-semibold leading-[1] tracking-normal">
            Частые вопросы
          </h2>

          <div className="mt-14 space-y-3">
            {faq.map((item, index) => (
              <div key={item.question} className="rounded-[9px] bg-white/[0.032] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                <button
                  type="button"
                  aria-label={item.question}
                  aria-expanded={openFaq === index}
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="flex w-full items-center justify-between gap-6 px-5 py-7 text-left md:px-7"
                >
                  <span className="flex min-w-0 items-center gap-5 text-xl font-medium md:gap-10 md:text-3xl">
                    <span className="w-12 shrink-0 font-mono text-white/[0.36]">{String(index + 1).padStart(2, "0")}</span>
                    <span className="h-8 w-px shrink-0 bg-cyan/80" />
                    <span>{item.question}</span>
                  </span>
                  <Plus className={`h-6 w-6 shrink-0 text-cyan transition ${openFaq === index ? "rotate-45" : ""}`} />
                </button>
                {openFaq === index ? (
                  <div className="animate-[contentFade_0.35s_cubic-bezier(0.22,1,0.36,1)_both] pb-7">
                    <p className="px-5 pl-[6.5rem] text-lg leading-8 text-white/[0.58] md:max-w-3xl md:px-7">
                      {item.answer}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="final-cta-panel scene-media relative mt-8 overflow-hidden rounded-[10px] bg-[#020304] shadow-[0_44px_140px_rgba(0,0,0,0.58)] md:mt-10">
          <img
            src="/media/webbrain-asset-hero-editor.png"
            alt=""
            className="final-cta-image absolute inset-0 h-full w-full object-cover object-center opacity-[0.82]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,3,4,0.92)_0%,rgba(2,3,4,0.72)_35%,rgba(2,3,4,0.1)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,#020304)]" />

          <div className="relative z-10 flex flex-col justify-center px-8 py-14 md:px-16 md:py-16">
            <h2 className="max-w-[560px] text-balance text-[clamp(2.8rem,4.9vw,5.4rem)] font-semibold leading-[0.94]">
              Попадите в бету сегодня
            </h2>
            <p className="mt-7 max-w-[520px] text-pretty text-xl leading-9 text-white/[0.72]">
              Founding members получают фиксированную цену навсегда и влияют на развитие продукта.
            </p>
            <Link
              href="/signup"
              className="mt-10 inline-flex h-16 w-fit items-center justify-center gap-5 rounded-[8px] bg-lime px-10 text-lg font-semibold text-black shadow-[0_0_54px_rgba(200,255,94,0.3)] transition hover:bg-white"
            >
              Зарегистрироваться
              <ArrowRight className="h-6 w-6" />
            </Link>

            <div className="mt-10 grid max-w-[760px] grid-cols-2 gap-5 md:grid-cols-4">
              {[
                ["AI", "генерация из чата"],
                ["Backend", "серверная логика"],
                ["Deploy", "хостинг из коробки"],
                ["Editor", "визуальные правки"]
              ].map(([value, label]) => (
                <div key={value} className="rounded-[8px] bg-black/[0.28] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="text-2xl font-semibold md:text-3xl">{value}</p>
                  <p className="mt-2 text-sm text-white/50">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="mt-5 flex flex-col justify-between gap-5 text-sm text-white/50 md:flex-row">
          <p>WebBrain</p>
          <div className="flex gap-7">
            <a href="#how" className="transition hover:text-white">
              Как работает
            </a>
            <a href="#roadmap" className="transition hover:text-white">
              Roadmap
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
            <Link href="/signup" className="transition hover:text-white">
              Бета
            </Link>
          </div>
        </footer>
      </div>
    </section>
  );
}

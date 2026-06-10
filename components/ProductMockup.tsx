"use client";

import { useState } from "react";
import { Check, MousePointer2, Send, Sparkles } from "lucide-react";

type Mode = "chat" | "editor";

export function ProductMockup() {
  const [mode, setMode] = useState<Mode>("chat");

  return (
    <div className="glass group mx-auto grid max-w-6xl overflow-hidden rounded-card md:grid-cols-[0.92fr_1.08fr]">
      <div className="border-b border-white/10 bg-[#080D12]/86 p-4 md:border-b-0 md:border-r md:p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`h-9 rounded-full px-4 text-sm font-semibold transition ${
                mode === "chat"
                  ? "bg-white text-ink"
                  : "text-muted hover:text-white"
              }`}
            >
              Чат
            </button>
            <button
              type="button"
              onClick={() => setMode("editor")}
              className={`h-9 rounded-full px-4 text-sm font-semibold transition ${
                mode === "editor"
                  ? "bg-lime text-ink"
                  : "text-muted hover:text-white"
              }`}
            >
              Редактор
            </button>
          </div>
          <span className="hidden items-center gap-2 text-xs font-medium text-muted sm:flex">
            <span className="h-2 w-2 rounded-full bg-lime" />
            Черновик сохранен
          </span>
        </div>

        {mode === "chat" ? <ChatPanel /> : <EditorPanel />}
      </div>

      <div className="relative min-h-[480px] overflow-hidden bg-[#06090D] p-4 md:p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="relative h-full overflow-hidden rounded-card border border-white/12 bg-[#0E141B] shadow-glow">
          <div className="flex h-10 items-center justify-between border-b border-white/10 bg-white/[0.035] px-4">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ember" />
              <span className="h-2.5 w-2.5 rounded-full bg-lime" />
              <span className="h-2.5 w-2.5 rounded-full bg-cyan" />
            </div>
            <span className="text-[11px] font-medium text-muted">
              webbrain.site/preview
            </span>
          </div>

          <div className="relative min-h-[428px] overflow-hidden p-5 md:p-7">
            <div className="absolute left-0 right-0 top-0 h-24 bg-gradient-to-b from-cyan/10 to-transparent" />
            <div className="relative mx-auto max-w-xl text-center">
              <div className="mx-auto mb-5 h-14 w-14 rounded-full border border-white/15 bg-white/10" />
              <h2 className="text-balance text-4xl font-semibold leading-none tracking-normal">
                Студия, куда хочется записаться
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">
                Услуги, свободные окна и быстрый контакт в одном аккуратном сайте.
              </p>
              <button className="mt-6 h-10 rounded-full bg-white px-5 text-sm font-semibold text-ink">
                Записаться
              </button>
            </div>

            <div className="mt-9 grid grid-cols-3 gap-3">
              {["Услуги", "Мастера", "FAQ"].map((item, index) => (
                <div
                  key={item}
                  className="rounded-card border border-white/10 bg-white/[0.045] p-3"
                >
                  <div
                    className="mb-7 h-16 rounded-card bg-cover bg-center opacity-80 grayscale contrast-125"
                    style={{
                      backgroundImage: `url(/media/mockup-${index + 1}.png)`
                    }}
                  />
                  <p className="text-xs font-semibold text-white">{item}</p>
                  <div className="mt-2 h-1.5 w-16 rounded-full bg-white/12" />
                </div>
              ))}
            </div>

            <div className="absolute bottom-5 right-5 hidden rounded-card border border-cyan/25 bg-cyan/12 p-3 text-xs font-semibold text-cyan shadow-glow md:block">
              <MousePointer2 className="mb-2 h-4 w-4" />
              Блок выбран
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-card border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm leading-6 text-mist">
          Собери сайт для студии массажа: темный стиль, услуги, запись в
          WhatsApp, карта и ответы на вопросы.
        </p>
      </div>
      <div className="rounded-card border border-cyan/20 bg-cyan/[0.075] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan">
          <Sparkles className="h-4 w-4" />
          WebBrain
        </div>
        <ul className="space-y-3 text-sm leading-6 text-mist/86">
          <li className="flex gap-2">
            <Check className="mt-1 h-4 w-4 shrink-0 text-lime" />
            Собрал первый экран с CTA на запись.
          </li>
          <li className="flex gap-2">
            <Check className="mt-1 h-4 w-4 shrink-0 text-lime" />
            Добавил блок услуг, мастеров и FAQ.
          </li>
          <li className="flex gap-2">
            <Check className="mt-1 h-4 w-4 shrink-0 text-lime" />
            Подготовил мобильную версию.
          </li>
        </ul>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] py-2 pl-4 pr-2">
        <span className="min-w-0 flex-1 text-sm text-muted">
          Сделай первый экран спокойнее...
        </span>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink"
          aria-label="Отправить"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EditorPanel() {
  return (
    <div className="space-y-4">
      {[
        ["Секции", "Hero, Услуги, Мастера, FAQ"],
        ["Тон", "Спокойный, премиальный"],
        ["CTA", "Записаться"],
        ["Цвет", "Графит + cyan"]
      ].map(([label, value]) => (
        <div
          key={label}
          className="rounded-card border border-white/10 bg-white/[0.035] p-4"
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {label}
          </div>
          <div className="text-sm font-medium text-mist">{value}</div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        {["Текст", "Цвет", "Порядок", "Мобильная"].map((item) => (
          <button
            key={item}
            type="button"
            className="h-11 rounded-card border border-white/10 bg-white/[0.045] text-sm font-semibold text-mist transition hover:border-cyan/40 hover:text-white"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

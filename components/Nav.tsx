import Link from "next/link";
import { ArrowRight, BrainCircuit } from "lucide-react";
import { navItems } from "@/lib/content";

export function Nav() {
  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      <nav className="glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full px-3 pl-4">
        <Link href="/" className="flex items-center gap-2" aria-label="WebBrain">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink">
            <BrainCircuit className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-normal">WebBrain</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink transition hover:bg-lime"
          >
            Вход
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

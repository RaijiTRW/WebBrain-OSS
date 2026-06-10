import * as esbuild from "esbuild";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const cwd = process.cwd();
const tempDir = await mkdtemp(path.join(tmpdir(), "webbrain-codegen-contract-"));
const entryPath = path.join(tempDir, "entry.ts");
const outPath = path.join(tempDir, "bundle.cjs");

await writeFile(
  entryPath,
  `
    import { compileWebBrainCodegen } from "@/lib/webbrain-codegen/compiler";
    import { assertCodegenStaticContracts } from "@/lib/webbrain-codegen/contracts";

    const badFiles = [{
      path: "src/App.tsx",
      content: \`
        export default function App() {
          return (
            <main data-wb-id="page">
              <header data-wb-id="header">
                <nav data-wb-id="nav">
                  <span data-wb-id="nav-menu">Меню</span>
                  <a data-wb-id="nav-booking" href="#">Забронировать</a>
                </nav>
              </header>
              <section data-wb-id="hero" style={{width: 1800}}>
                <h1 data-wb-id="hero-title">Кофейня</h1>
              </section>
              <section data-wb-id="booking">
                <div data-wb-id="booking-title">Забронировать столик</div>
              </section>
            </main>
          );
        }
      \`
    }];

    const goodFiles = [{
      path: "src/App.tsx",
      content: \`
        export default function App() {
          return (
            <main data-wb-id="page" data-wb-pattern="booking-led-editorial" style={{width: "100%"}}>
              <header data-wb-id="header">
                <nav data-wb-id="nav">
                  <a data-wb-id="nav-menu" href="#menu">Меню</a>
                  <a data-wb-id="nav-booking" href="#booking">Забронировать</a>
                </nav>
              </header>
              <section data-wb-id="hero" style={{width: "100%", padding: 64}}>
                <h1 data-wb-id="hero-title" style={{fontSize: 56, lineHeight: 1}}>Кофейня</h1>
              </section>
              <section data-wb-id="menu" style={{width: "100%", padding: 48}}>
                <h2 data-wb-id="menu-title" style={{fontSize: 36}}>Меню</h2>
              </section>
              <section data-wb-id="booking" style={{width: "100%", padding: 48}}>
                <form data-wb-id="booking-form" data-wb-action="booking_create" style={{display: "grid", gap: 16}}>
                  <label data-wb-id="booking-name-label" style={{display: "grid", gap: 8}}>Имя<input data-wb-id="booking-name-input" name="name" style={{height: 44, padding: 12}} /></label>
                  <button data-wb-id="booking-submit" type="submit" style={{height: 48}}>Отправить</button>
                </form>
              </section>
            </main>
          );
        }
      \`
    }];

    const badCompiled = compileWebBrainCodegen(badFiles);
    let badFailed = false;
    try {
      assertCodegenStaticContracts({ files: badCompiled.files, compileResult: badCompiled });
    } catch (error) {
      badFailed = /Header navigation|href="#"|Booking|overflow/i.test(error instanceof Error ? error.message : String(error));
    }
    if (!badFailed) throw new Error("Bad codegen page passed static contracts.");

    const goodCompiled = compileWebBrainCodegen(goodFiles);
    assertCodegenStaticContracts({ files: goodCompiled.files, compileResult: goodCompiled });
  `,
  "utf8",
);

await esbuild.build({
  entryPoints: [entryPath],
  outfile: outPath,
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  logLevel: "silent",
  plugins: [
    {
      name: "webbrain-alias",
      setup(build) {
        build.onResolve({ filter: /^@\// }, (args) => ({
          path: path.join(cwd, `${args.path.slice(2)}.ts`),
        }));
      },
    },
  ],
});

const require = createRequire(import.meta.url);
require(outPath);
console.log("codegen contracts smoke passed");

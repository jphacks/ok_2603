import { readFile } from "node:fs/promises";
import ts from "typescript";

// テストとデータ検証用。公開アプリのバンドルには含めない。
export async function loadTypescript(path) {
  const sourceUrl = new URL(path, import.meta.url);
  let source = await readFile(sourceUrl, "utf8");
  // Inline local JSON imports because a data: module has no relative base URL.
  for (const match of source.matchAll(/import (\w+) from ["'](\.[^"']+\.json)["'];/g)) {
    const data = JSON.parse(await readFile(new URL(match[2], sourceUrl), "utf8"));
    source = source.replace(match[0], `const ${match[1]} = ${JSON.stringify(data)};`);
  }
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}

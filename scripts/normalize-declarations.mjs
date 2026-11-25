// Apache-2.0. Resolve emitted declaration specifiers to explicit Node ESM paths.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

export function normalizeDeclarations(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      normalizeDeclarations(file);
      continue;
    }
    if (!entry.name.endsWith('.d.ts')) continue;

    let text = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const changes = [];
    function visit(node) {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
      if (ts.isExternalModuleReference(node)) specifier = node.expression;
      if (specifier && ts.isStringLiteralLike(specifier) && /^\.\.?\//.test(specifier.text)) {
        const path = specifier.text;
        const base = resolve(dirname(file), path);
        let replacement;
        if (path.endsWith('.js') && (existsSync(base.replace(/\.js$/, '.d.ts')) || existsSync(base))) replacement = path;
        else if (existsSync(`${base}.d.ts`)) replacement = `${path}.js`;
        else if (existsSync(resolve(base, 'index.d.ts'))) replacement = `${path.replace(/\/$/, '')}/index.js`;
        else throw new Error(`Unresolved declaration reference ${path} in ${file}`);
        if (path !== replacement) changes.push([specifier.getStart(source), specifier.getEnd(), JSON.stringify(replacement)]);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    if (changes.length > 0) {
      for (const [start, end, replacement] of changes.reverse()) text = text.slice(0, start) + replacement + text.slice(end);
      writeFileSync(file, text);
    }
  }
}

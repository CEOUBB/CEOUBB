import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

// Implements: REQ-PERF-LOAD-01
test("shared preferences avoid server imports and closed classroom tools remain deferred", () => {
  const pending = [resolve("lib/user-preferences.ts")];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const path = pending.pop();
    assert.ok(path);

    if (visited.has(path)) continue;
    visited.add(path);
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest);

    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier;

      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      assert.doesNotMatch(specifier.text, /services\//);
      assert.doesNotMatch(specifier.text, /^(node:)?crypto$/);

      if (!specifier.text.startsWith(".")) continue;
      const target = resolve(dirname(path), specifier.text);
      pending.push([target, `${target}.ts`, `${target}.tsx`].find(existsSync) ?? target);
    }
  }

  for (const parser of ["moodle", "adecca"]) {
    const source = readFileSync(`lib/${parser}/parser.ts`, "utf8");
    assert.match(source, /from "\.\.\/academic-sanitizer\.ts"/);
    assert.doesNotMatch(source, /from "\.\.\/academic-content\.ts"/);
  }

  const classroom = readFileSync("app/views/classroom/ClassroomView.tsx", "utf8");
  assert.match(classroom, /\[importsMounted, setImportsMounted\] = useState\(false\)/);
  assert.match(
    classroom,
    /onToggle=\{\(event\) => \{\s*if \(event\.currentTarget\.open\) setImportsMounted\(true\);\s*\}\}/
  );
  assert.doesNotMatch(classroom, /setImportsMounted\(false\)/);
  assert.match(
    classroom,
    /importsMounted && \([\s\S]*?canTeach && <MoodleImportDialog[\s\S]*?canTeach && <AdeccaImportDialog/
  );
});

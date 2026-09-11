import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sets = await Promise.all(['trivia-cr.json', 'trivia-cr.en.json'].map(async (file) => JSON.parse(await readFile(new URL(`../src/data/${file}`, import.meta.url), 'utf8'))));
const screen = await readFile(new URL('../src/app/(aux)/trivia.tsx', import.meta.url), 'utf8');
assert.equal(sets[0].length, sets[1].length);
assert.doesNotMatch(screen, /return \(\) => playlist\.pause\(\)/);
assert.match(screen, /bg-white\/60/);
for (const questions of sets) {
  assert.ok(questions.length >= 10);
  for (const item of questions) {
    assert.equal(item.options.length, 4);
    assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length);
    assert.ok(item.question && item.fact && item.category);
  }
}
console.log(`Trivia CR validada en español e inglés: ${sets[0].length} preguntas.`);

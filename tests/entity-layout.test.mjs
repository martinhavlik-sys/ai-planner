import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('entity picker uses compact vertical rows with an internal scroll region and visible actions', () => {
  const css = read('app/theme.css');
  assert.match(css, /\.entityMultiList\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.entityMultiList\s*\{[^}]*flex-direction:\s*column/);
  assert.match(css, /\.entityMultiList\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.entityMultiList\s*\{[^}]*max-height:\s*260px/);
  assert.match(css, /\.modal \.entityMultiOption\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.modal \.entityMultiOption\s*\{[^}]*flex-direction:\s*row/);
  assert.match(css, /\.modal \.entityMultiOption\s*\{[^}]*gap:\s*6px/);
  const page = read('app/page.tsx');
  assert.match(page, /Zrušiť výber/);
  assert.match(page, /Potvrdiť výber/);
});

test('department picker is aligned to the start of the form row', () => {
  assert.match(read('app/theme.css'), /\.formGrid > label, \.formGrid > \.entityPickerField\s*\{\s*align-self:\s*start/);
});

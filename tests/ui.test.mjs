import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import * as model from '../app/model.ts';

// Optional offline component harness. Set BABEL_BUNDLE to Playwright's bundled
// babelBundle.js. It executes handlers/effects, but does not replace browser QA.
const bundle = process.env.BABEL_BUNDLE;
const babel = bundle ? createRequire(import.meta.url)(bundle) : null;
const options = { skip: !babel && 'Set BABEL_BUNDLE for offline component checks' };
function mount(file, props) {
  const cells = [], effects = [];
  let cursor = 0, pending = [], tree;
  const scroll = { scrollTop: 0 };
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial;
      return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }];
    },
    useRef() { const i = cursor++; return cells[i] ??= { current: { ...scroll, showModal() {} } }; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!effects[i] || deps.some((d, n) => !Object.is(d, effects[i][n]))) pending.push(fn);
      effects[i] = deps;
    }
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const exports = {};
  const filename = new URL(`../app/${file}`, import.meta.url).pathname;
  const code = babel.babelTransform(readFileSync(filename, 'utf8'), filename, false, [], []).code;
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === './model') return model;
    throw new Error(name);
  }, document: { activeElement: null }, window: { setInterval() {}, clearInterval() {} }, Date });
  const render = () => {
    cursor = 0; pending = []; tree = exports.default(props);
    pending.forEach(fn => fn());
    return tree;
  };
  render(); render();
  const nodes = () => {
    const result = [];
    const walk = node => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      result.push(node); walk(node.props?.children);
    };
    walk(tree); return result;
  };
  return { render, nodes, find: predicate => nodes().find(predicate) };
}

test('every calendar navigation handler resets scroll, including repeated Today and date', options, () => {
  const app = mount('calendar.tsx', { tasks: [], onOpen() {}, onEdit() {}, onAdd() {}, onMove() {} });
  const scroller = () => app.find(n => n.props.className === 'calendarScroll').props.ref.current;
  assert.equal(scroller().scrollTop, 512);
  const click = predicate => { scroller().scrollTop = 900; app.find(predicate).props.onClick(); app.render(); assert.equal(scroller().scrollTop, 512); };
  for (let i = 0; i < 2; i++) click(n => n.type === 'button' && n.props.children === 'Dnes');
  for (const label of ['Predchádzajúci mesiac', 'Ďalší mesiac', 'Predchádzajúci rozsah', 'Ďalší rozsah']) click(n => n.props['aria-label'] === label);
  for (let i = 0; i < 2; i++) click(n => n.props['aria-pressed'] === true);
  for (const value of ['3', '5', 'week', 'work']) {
    scroller().scrollTop = 900;
    app.find(n => n.type === 'select').props.onChange({ target: { value } });
    app.render(); assert.equal(scroller().scrollTop, 512);
  }
});

test('slot dialog confirms original timing or edited timing only on submit', options, () => {
  const slot = { id: 8, taskId: 42, day: '2026-09-19', startHour: 9, duration: 1 };
  let confirmed = [];
  const app = mount('slot-dialog.tsx', { slot, taskName: 'Task', onClose() {}, onConfirm: timing => confirmed.push(timing) });
  app.find(n => n.props.children === 'Rovnaký čas').props.onClick();
  assert.deepEqual(confirmed, [slot]); confirmed = [];
  app.find(n => n.props.children === 'Iný čas').props.onClick(); app.render();
  for (const [type, value] of [['date', '2026-09-21'], ['time', '14:30'], ['number', 2.25]]) {
    app.find(n => n.type === 'input' && n.props.type === type).props.onChange({ target: { value, valueAsNumber: value } }); app.render();
  }
  assert.equal(confirmed.length, 0);
  app.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(JSON.stringify(confirmed), JSON.stringify([{ day: '2026-09-21', startHour: 14.5, duration: 2.25 }]));
});

test('calendar event has exactly two actions and plus passes the original task and slot', options, () => {
  const day = model.localDate();
  const task = model.normalizeTask({ id: 42, slots: [{ id: 8, day, startHour: 9, duration: 1 }] });
  let added, edited;
  const app = mount('calendar.tsx', { tasks: [task], onOpen() {}, onEdit: value => edited = value, onAdd: (...args) => added = args, onMove() {} });
  app.find(n => n.type === 'select').props.onChange({ target: { value: '3' } }); app.render();
  const actions = app.find(n => n.props.className === 'timedActions').props.children;
  assert.equal(actions.length, 2);
  actions[0].props.onClick({ stopPropagation() {} });
  actions[1].props.onClick({ stopPropagation() {} });
  assert.equal(edited, task); assert.equal(added[0], task); assert.equal(added[1], task.slots[0]);
});

test('permissions keep every checkbox inside its clickable label', options, () => {
  const app = mount('users.tsx', { users: [], tasks: [], projects: [], onChange() {} });
  const labels = app.nodes().filter(n => n.type === 'label' && Array.isArray(n.props.children) && n.props.children[0]?.props?.type === 'checkbox');
  assert.equal(labels.length, model.permissionCatalog.length);
  const first = labels[0].props.children[0];
  first.props.onChange({ target: { checked: false } }); app.render();
  assert.equal(app.find(n => n.props.type === 'checkbox').props.checked, false);
});

test('all application TypeScript and TSX files transpile offline', options, () => {
  const dir = new URL('../app/', import.meta.url);
  for (const file of readdirSync(dir).filter(f => /\.tsx?$/.test(f))) {
    const path = new URL(file, dir).pathname;
    const result = babel.babelTransform(readFileSync(path, 'utf8'), path, false, [], []);
    assert.ok(result.code, file);
    new vm.Script(result.code, { filename: file });
  }
});

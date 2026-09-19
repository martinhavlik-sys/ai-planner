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
function mount(file, props, exportName = 'default', savedWorkspace) {
  const cells = [], effects = [];
  let cursor = 0, pending = [], tree;
  const scroll = { scrollTop: 0 };
  const fakeDocument = { activeElement: null, body: { style: { overflow: "" } } };
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial;
      return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; },
    useMemo(fn) { return fn(); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!effects[i] || deps.some((d, n) => !Object.is(d, effects[i][n]))) pending.push(fn);
      effects[i] = deps;
    }
  };
  const jsx = (type, props) => {
    // Only rendered DOM refs receive an element. Mutable gesture refs stay null.
    if (typeof type === 'string' && props?.ref && props.ref.current === null) props.ref.current = { ...scroll, showModal() { this.open = true; }, close() { this.open = false; }, setCustomValidity() {} };
    return { type, props: props || {} };
  };
  const storage = new Map(savedWorkspace ? [[model.workspaceKey, JSON.stringify(savedWorkspace)]] : []);
  const load = file => {
    const exports = {};
    const filename = new URL(`../app/${file}`, import.meta.url).pathname;
    const code = babel.babelTransform(readFileSync(filename, 'utf8'), filename, false, [], []).code;
    vm.runInNewContext(code, { exports, require: name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === './model') return model;
    if (name === './repository') return { remoteStatus: () => 'Lokálne dáta' };
    if (name.startsWith('./')) return load(`${name.slice(2)}.tsx`);
    throw new Error(name);
    }, document: fakeDocument, window: { setInterval() {}, clearInterval() {}, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } }, Date });
    return exports;
  };
  const exports = load(file);
  const render = () => {
    cursor = 0; pending = []; tree = exports[exportName](props);
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
  return { render, nodes, storage, document: fakeDocument, find: predicate => nodes().find(predicate) };
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

test('person picker toggles multiple people without duplicating IDs and clears assignments', options, () => {
  const users = [1, 2].map(id => ({ id, name: `Person ${id}`, email: '', ...model.avatarProfile({ name: `Person ${id}` }) }));
  const props = { users, ids: [], onChange: ids => { props.ids = ids; } };
  const app = mount('people.tsx', props, 'PersonPicker');
  const checks = () => app.nodes().filter(n => n.props.type === 'checkbox');
  checks()[0].props.onChange({ target: { checked: true } }); app.render();
  checks()[1].props.onChange({ target: { checked: true } }); app.render();
  assert.equal(JSON.stringify(props.ids), '[1,2]');
  checks()[1].props.onChange({ target: { checked: true } }); app.render();
  assert.equal(props.ids.length, 2);
  checks()[0].props.onChange({ target: { checked: false } }); app.render();
  assert.equal(JSON.stringify(props.ids), '[2]');
  app.find(n => n.props.children === 'Zrušiť priradenie').props.onClick(); app.render();
  assert.equal(props.ids.length, 0);
});

test('color picker starts collapsed, exposes selected swatch and restores Google blue', options, () => {
  const props = { label: 'Farba oddelenia', value: '#4285F4', onChange: color => { props.value = color; } };
  const app = mount('people.tsx', props, 'ColorPicker');
  assert.ok(!app.find(n => n.type === 'details').props.open);
  assert.ok(app.find(n => n.props.children === 'Vybrať inú farbu'));
  app.find(n => n.props['aria-label'] === 'Farba #ad1457').props.onClick(); app.render();
  assert.equal(app.find(n => n.props['aria-label'] === 'Farba #ad1457').props['aria-pressed'], true);
  app.find(n => n.props.children === 'Predvolené').props.onClick(); app.render();
  assert.equal(props.value, '#4285F4');
});

test('workspace filters and sorting combine; menu buttons and drag persist across reload', options, () => {
  const data = model.normalizeWorkspace({ tasks: [
    { id: 1, name: 'Bravo', owner: 'Martin', project: 'A', slots: [] },
    { id: 2, name: 'Alfa', owner: 'Eva', project: 'A', slots: [] },
    { id: 3, name: 'Charlie', owner: 'Eva', project: 'B', slots: [] }
  ] });
  const app = mount('page.tsx', {}, 'default', data);
  const rowNames = () => app.nodes().filter(n => n.props.className === 'taskName').map(n => n.props.children);
  app.find(n => n.type === 'select' && n.props.value === 'priority').props.onChange({ target: { value: 'name' } });
  app.find(n => n.props['aria-label'] === 'Smer triedenia').props.onChange({ target: { value: 'asc' } }); app.render();
  assert.deepEqual(rowNames(), ['Alfa', 'Bravo', 'Charlie']);
  app.find(n => n.props['aria-label'] === 'Filtrovať osoby').props.onChange({ target: { value: String(data.users.find(u => u.name === 'Eva').id) } });
  app.find(n => n.props['aria-label'] === 'Hladat ulohy').props.onChange({ target: { value: 'al' } }); app.render();
  assert.deepEqual(rowNames(), ['Alfa']);
  app.find(n => n.props.children === '▸ Doplnenia' || (Array.isArray(n.props.children) && n.props.children.includes(' Doplnenia'))).props.onClick(); app.render();
  const transfer = { setData() {} };
  app.find(n => n.props.draggable && n.props.children === 'Používatelia').props.onDragStart({ dataTransfer: transfer }); app.render();
  app.nodes().find(n => n.props.className === 'navItem' && n.props.children.props.children === 'Oddelenia').props.onDrop({ preventDefault() {} }); app.render();
  const stored = JSON.parse(app.storage.get(model.workspaceKey));
  assert.ok(stored.menuOrder.indexOf('Tim') < stored.menuOrder.indexOf('Projekty'));
  assert.deepEqual(stored.tasks.map(t => t.id), [1, 2, 3]);
  const reloaded = mount('page.tsx', {}, 'default', stored);
  assert.equal(reloaded.nodes().find(n => n.props.draggable).props.children, 'Pracovná plocha');
  assert.ok(!app.nodes().some(n => n.props.children === 'Spravovať entity'));
});

test('user name derives initials and edited initials survive subsequent name changes', options, () => {
  const app = mount('users.tsx', { users: [], tasks: [], projects: [], onChange() {} });
  const nameInput = () => app.nodes().find(n => n.type === 'input' && n.props.required && !n.props.type);
  nameInput().props.onChange({ target: { value: 'Martin Havlík' } }); app.render();
  assert.equal(app.find(n => n.props.maxLength === 3).props.value, 'MH');
  app.find(n => n.props.maxLength === 3).props.onChange({ target: { value: 'XYZ' } }); app.render();
  nameInput().props.onChange({ target: { value: 'Martin Nový' } }); app.render();
  assert.equal(app.find(n => n.props.maxLength === 3).props.value, 'XYZ');
  app.find(n => n.props.children === 'Z mena').props.onClick(); app.render();
  assert.equal(app.find(n => n.props.maxLength === 3).props.value, 'MN');
});

test('resize pointer gesture changes only duration and suppresses move/open; cancellation does not save', options, () => {
  const day = model.localDate();
  const task = model.normalizeTask({ id: 42, slots: [{ id: 8, day, startHour: 9, duration: 1 }, { id: 9, day, startHour: 13, duration: 2 }] });
  const resized = []; let opened = 0, moved = 0;
  const app = mount('calendar.tsx', { tasks: [task], onOpen() { opened++; }, onEdit() {}, onAdd() {}, onMove() { moved++; }, onResize: (...args) => resized.push(args) });
  app.find(n => n.type === 'select').props.onChange({ target: { value: '3' } }); app.render();
  const handle = () => app.nodes().find(n => n.props.className === 'resizeHandle');
  const event = y => ({ pointerId: 1, button: 0, clientY: y, preventDefault() {}, stopPropagation() {}, currentTarget: { focus() {}, setPointerCapture() {}, hasPointerCapture() { return true; }, releasePointerCapture() {} } });
  handle().props.onPointerDown(event(200));
  handle().props.onPointerMove(event(232)); app.render();
  const article = app.nodes().find(n => n.type === 'article' && n.props.className.includes('timedEvent'));
  assert.equal(article.props.draggable, false); article.props.onClick();
  handle().props.onPointerUp(event(232)); app.render();
  assert.equal(resized.length, 1); assert.equal(resized[0][0], task); assert.equal(resized[0][1], 8); assert.equal(resized[0][2], 1.5);
  assert.equal(opened, 0); assert.equal(moved, 0); assert.equal(task.slots[1].duration, 2);
  handle().props.onPointerDown(event(200)); handle().props.onPointerMove(event(264)); app.render();
  handle().props.onPointerCancel(); app.render(); assert.equal(resized.length, 1);
});

test('resize keyboard changes by quarter hours and clamps the displayed end', options, () => {
  const day = model.localDate(), task = model.normalizeTask({ id: 42, slots: [{ id: 8, day, startHour: 23, duration: .5 }] });
  const calls = [];
  const app = mount('calendar.tsx', { tasks: [task], onOpen() {}, onEdit() {}, onAdd() {}, onMove() {}, onResize: (...args) => calls.push(args) });
  app.find(n => n.type === 'select').props.onChange({ target: { value: '3' } }); app.render();
  const handle = app.find(n => n.props.className === 'resizeHandle');
  for (const key of ['ArrowDown','Home','End']) handle.props.onKeyDown({ key, preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(calls.map(c => c[2]), [.75,.25,1]);
});

test('event body retains the original move gesture and quarter-hour destination', options, () => {
  const day = model.localDate(), task = model.normalizeTask({ id: 42, slots: [{ id: 8, day, startHour: 9, duration: 1 }] });
  const moves = [];
  const app = mount('calendar.tsx', { tasks: [task], onOpen() {}, onEdit() {}, onAdd() {}, onMove: (...args) => moves.push(args), onResize() {} });
  app.find(n => n.type === 'select').props.onChange({ target: { value: '3' } }); app.render();
  const event = app.find(n => n.type === 'article');
  let data;
  event.props.onDragStart({ target: { closest() { return null; } }, dataTransfer: { setData: (...args) => { data = args; } } }); app.render();
  const destination = app.nodes().filter(n => n.props.className === 'dateColumn')[1];
  destination.props.onDrop({ preventDefault() {}, clientY: 64 * 11.26, currentTarget: { getBoundingClientRect() { return { top: 0 }; } } });
  assert.deepEqual(data, ['text/plain','42:8']);
  assert.equal(moves[0][0], task); assert.deepEqual(moves[0].slice(1), [8, model.addDays(day,1), 11.25]);
  assert.equal(task.slots[0].duration, 1);
});

test('task editor uses native modal top layer, locks body scroll and routes Escape to close', options, () => {
  let closed = 0, prevented = false;
  const app = mount('task-dialog.tsx', { children: null, onClose() { closed++; } });
  const dialog = app.find(n => n.type === 'dialog');
  assert.equal(dialog.props.ref.current.open, true);
  assert.equal(app.document.body.style.overflow, 'hidden');
  assert.equal(dialog.props['aria-labelledby'], 'task-dialog-title');
  dialog.props.onCancel({ preventDefault() { prevented = true; } });
  assert.equal(closed, 1); assert.equal(prevented, true);
});

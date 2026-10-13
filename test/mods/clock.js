import assert from 'assert';

// A document with just what the clock touches.
const made = [];
const byId = {};
const body = {
    children: [],
    appendChild(node) { node.parentNode = body; this.children.push(node); byId[node.id] = node; },
    removeChild(node) { this.children = this.children.filter((one) => one !== node); node.parentNode = null; delete byId[node.id]; }
};
const element = () => {
    const node = {
        id: '', textContent: '', parentNode: null, attributes: {}, styles: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        style: { setProperty: (name, value) => { node.styles[name] = value; } }
    };
    made.push(node);
    return node;
};

global.window = { localStorage: { 'tube.settings': '{}' }, addEventListener: () => undefined, JSON };
global.document = { body, getElementById: (id) => byId[id] || null, createElement: element, querySelector: () => null };

const timers = [];
global.setTimeout = (run, ms) => { const timer = { run, ms }; timers.push(timer); return timer; };
global.clearTimeout = (timer) => { const at = timers.indexOf(timer); if (at !== -1) timers.splice(at, 1); };

const { configWrite } = await import('../../framework/runtime/config.js');
const { start, clockText, untilNextMinute } = await import('../../mods/clock/index.js');

const results = [];
const check = (name, run) => {
    try {
        run();
        results.push(true);
        console.log(`PASS  ${name}`);
    } catch (failure) {
        results.push(false);
        console.log(`FAIL  ${name}\n      ${failure.message}`);
    }
};

const at = (h, m) => new Date(2026, 9, 10, h, m, 5);

check('it reads as 24-hour time by default, and 12-hour when asked', () => {
    assert.strictEqual(clockText(at(9, 5)), '09:05');
    assert.strictEqual(clockText(at(21, 30), '24'), '21:30');
    assert.strictEqual(clockText(at(0, 7), '12'), '12:07 AM');
    assert.strictEqual(clockText(at(12, 0), '12'), '12:00 PM');
    assert.strictEqual(clockText(at(23, 59), '12'), '11:59 PM');
});

check('it is drawn just after each minute turns, not on a short timer', () => {
    assert.strictEqual(untilNextMinute(60000 * 7), 60050);
    assert.strictEqual(untilNextMinute(60000 * 7 + 59990), 60);
});

start();

check('off by default: nothing on screen, and nothing waiting to run', () => {
    assert.strictEqual(body.children.length, 0);
    assert.strictEqual(timers.length, 0);
});

configWrite('enableClock', true);

check('turned on, it appears at once, top right, above everything, and lets the remote through', () => {
    assert.strictEqual(body.children.length, 1);
    const clock = body.children[0];
    assert.strictEqual(clock.id, 'tube-clock');
    assert.ok(/^\d\d:\d\d$/.test(clock.textContent), clock.textContent);
    assert.strictEqual(clock.styles.position, 'fixed');
    assert.ok(clock.styles.top && clock.styles.right && !clock.styles.left);
    assert.strictEqual(clock.styles['z-index'], '2147483647');
    assert.strictEqual(clock.styles['pointer-events'], 'none');
    assert.ok(/rgba\(0, 0, 0, 0\.\d+\)/.test(clock.styles['background-color']), 'not see-through');
    assert.strictEqual(timers.length, 1, 'one timer for the next minute');
});

check('each minute redraws it in place, with one timer at a time', () => {
    timers.shift().run();
    timers.shift().run();
    assert.strictEqual(body.children.length, 1);
    assert.strictEqual(made.length, 1, 'a second element was made');
    assert.strictEqual(timers.length, 1);
});

configWrite('clockFormat', '12');

check('a format change shows at once', () => {
    assert.ok(/ (AM|PM)$/.test(body.children[0].textContent), body.children[0].textContent);
    assert.strictEqual(timers.length, 1);
});

configWrite('enableClock', false);

check('turned off, it is removed and its timer stopped', () => {
    assert.strictEqual(body.children.length, 0);
    assert.strictEqual(timers.length, 0);
});

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed ? 1 : 0);

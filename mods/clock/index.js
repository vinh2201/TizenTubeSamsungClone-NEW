import { after, configRead, configChangeEmitter, stop } from '../../framework/index.js';

// A small clock in the top-right corner, above everything YouTube draws. Off until turned on in the
// settings. It is drawn once a minute, on the minute, and nothing runs while it is off.

const ID = 'tube-clock';
const KEYS = ['enableClock', 'clockFormat'];

// The look, in one place: small, and see-through enough not to cover the picture.
const STYLE = {
    position: 'fixed',
    top: '24px',
    right: '32px',
    'z-index': '2147483647',
    padding: '4px 12px',
    'border-radius': '8px',
    'background-color': 'rgba(0, 0, 0, 0.35)',
    color: 'rgba(255, 255, 255, 0.85)',
    'font-family': 'Roboto, "YouTube Sans", Arial, sans-serif',
    'font-size': '22px',
    'line-height': '28px',
    'pointer-events': 'none'
};

const pad = (number) => (number < 10 ? `0${number}` : String(number));

export const clockText = (date, format) => {
    const hours = date.getHours();
    const minutes = pad(date.getMinutes());

    if (format !== '12') return `${pad(hours)}:${minutes}`;

    const twelve = hours % 12 || 12;
    return `${twelve}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
};

// Milliseconds to the next minute, with a little to spare so the tick lands after it, not just before.
export const untilNextMinute = (now) => 60000 - (now % 60000) + 50;

const held = { element: null, shown: '' };

const elementOf = () => {
    const found = document.getElementById(ID);
    if (found) return found;

    const element = document.createElement('div');
    element.id = ID;
    element.setAttribute('aria-hidden', 'true');
    Object.keys(STYLE).forEach((name) => element.style.setProperty(name, STYLE[name], 'important'));
    return element;
};

const draw = () => {
    if (!document.body) {
        after('clock', 500, draw);
        return;
    }

    const element = elementOf();
    if (!element.parentNode) document.body.appendChild(element);
    held.element = element;

    const text = clockText(new Date(), configRead('clockFormat'));
    if (text !== held.shown) {
        element.textContent = text;
        held.shown = text;
    }

    after('clock', untilNextMinute(Date.now()), draw);
};

const hide = () => {
    stop('clock');

    const element = held.element || document.getElementById(ID);
    if (element && element.parentNode) element.parentNode.removeChild(element);

    held.element = null;
    held.shown = '';
};

const apply = () => (configRead('enableClock') ? draw() : hide());

export function start() {
    configChangeEmitter.addEventListener('configChange', (event) => {
        if (event && event.detail && KEYS.indexOf(event.detail.key) !== -1) {
            held.shown = '';
            apply();
        }
    });

    apply();
}

export { hide as stopClock };

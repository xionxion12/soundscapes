// Haptic ticks. iOS 18+ Safari fires a haptic when a <input type=checkbox switch> is
// toggled, so we click a hidden one. Elsewhere: navigator.vibrate if present, else no-op.

let label: HTMLLabelElement | null = null;

function ensure(): HTMLLabelElement | null {
  if (label) return label;
  try {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0.01;pointer-events:none;';
    label.append(input);
    document.body.append(label);
  } catch {
    label = null;
  }
  return label;
}

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function tick(): void {
  try {
    if (isIOS()) ensure()?.click();
    else if ('vibrate' in navigator) navigator.vibrate(8);
  } catch {
    /* haptics are a nicety */
  }
}

import { styleText } from 'node:util';

// Minimal chalk-compatible shim backed by Node's built-in util.styleText.
// Supports the chainable usage we actually use, e.g. color.cyan.bold('x') and color.dim('y').
// Each property returns a new chainable that applies its accumulated styles in one styleText call.

type Style = Parameters<typeof styleText>[0] extends infer T
  ? T extends readonly (infer U)[]
    ? U
    : T
  : never;

type ColorFn = ((text: string | number) => string) & { [K in Style]: ColorFn };

const STYLES = [
  'bold',
  'dim',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
] as const;

function make(styles: Style[]): ColorFn {
  const fn = ((text: string | number) =>
    styles.length ? styleText(styles, String(text)) : String(text)) as ColorFn;
  for (const s of STYLES) {
    Object.defineProperty(fn, s, {
      get: () => make([...styles, s]),
      enumerable: false,
      configurable: true,
    });
  }
  return fn;
}

export const color = make([]);

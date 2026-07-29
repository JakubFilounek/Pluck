import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Pins down the two CSS/SVG regressions that only showed up in a real extension page. */
describe('visual regression guards', () => {
  it('keeps the decorative and interactive backdrops in separate CSS namespaces', () => {
    const effects = readFileSync('src/ui/effects.css', 'utf8');
    const theme = readFileSync('src/ui/ThemeBackdrop.svelte', 'utf8');
    const dialog = readFileSync('src/ui/SettingsDialog.svelte', 'utf8');

    expect(theme).toContain('class="theme-backdrop"');
    expect(effects).toContain('.theme-backdrop');
    expect(dialog).toContain('class="dialog-backdrop"');
    expect(dialog).toContain('pointer-events: auto');
    expect(effects).not.toMatch(/(^|\n)\.backdrop\s*\{/);
  });

  it('uses dedicated resting-cat geometry instead of squashing a standing cat', () => {
    const cat = readFileSync('src/ui/Cat.svelte', 'utf8');
    const scene = readFileSync('src/ui/CatScene.svelte', 'utf8');

    expect(cat).toContain('class="rest-bob"');
    expect(cat).not.toContain('scaleY(0.5)');
    expect(cat).not.toContain('scaleX(1.2)');
    expect(scene).toContain("import { untrack } from 'svelte'");
    expect(scene).toMatch(/untrack\(\(\) => \{[\s\S]*?step\('black'\)/);
  });

  it('keeps animated theme life present outside the empty state', () => {
    const backdrop = readFileSync('src/ui/ThemeBackdrop.svelte', 'utf8');

    expect(backdrop).toContain('<CatScene width={480} />');
    expect(backdrop).toContain('<TechScene width={410} />');
    expect(backdrop).toContain('class="code-rail"');
  });

  it('keeps capsule delete controls out of document flow', () => {
    const dashboard = readFileSync('entrypoints/dashboard/App.svelte', 'utf8');

    expect(dashboard).toMatch(/\.pill-x\s*\{[\s\S]*?position:\s*absolute/);
    expect(dashboard).not.toContain('confirmingDelete');
    expect(dashboard).not.toContain('Smazat?');
  });
});

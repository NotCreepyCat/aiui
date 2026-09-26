export type FontFamily = 'inter' | 'manrope' | 'ibm-plex-sans' | 'system'
export type FontSize = 'sm' | 'md' | 'lg'

export const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string; stack: string }[] = [
  { value: 'inter', label: 'Inter', stack: `'Inter Variable', sans-serif` },
  { value: 'manrope', label: 'Manrope', stack: `'Manrope Variable', sans-serif` },
  { value: 'ibm-plex-sans', label: 'IBM Plex Sans', stack: `'IBM Plex Sans Variable', sans-serif` },
  {
    value: 'system',
    label: 'System UI',
    stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  },
]

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string; rootPx: number }[] = [
  { value: 'sm', label: 'Small', rootPx: 14 },
  { value: 'md', label: 'Default', rootPx: 16 },
  { value: 'lg', label: 'Large', rootPx: 18 },
]

export function applyFontFamily(family: FontFamily) {
  const stack = FONT_FAMILY_OPTIONS.find((f) => f.value === family)?.stack ?? FONT_FAMILY_OPTIONS[0].stack
  document.documentElement.style.setProperty('--font-sans', stack)
}

export function applyFontSize(size: FontSize) {
  const rootPx = FONT_SIZE_OPTIONS.find((f) => f.value === size)?.rootPx ?? 16
  document.documentElement.style.fontSize = `${rootPx}px`
}

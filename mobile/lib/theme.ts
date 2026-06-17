export const colors = {
  ink: '#17262d',
  ink2: '#2d4248',
  muted: '#66787d',
  subtle: '#8b989b',
  primary: '#146d72',
  primary2: '#0f555d',
  sage: '#f0f9f4',
  sky: '#e2eef6',
  cream: '#f7f1e5',
  coral: '#d77b55',
  coral2: '#9a5539',
  coralBg: 'rgba(215,123,85,0.15)',
  danger: '#b95049',
  dangerBg: 'rgba(197,68,44,0.16)',
  success: '#357b5c',
  successBg: 'rgba(31,122,90,0.18)',
  surface: 'rgba(255,255,255,0.66)',
  surfaceStrong: 'rgba(255,255,255,0.86)',
  surfaceSoft: 'rgba(255,255,255,0.46)',
  line: 'rgba(255,255,255,0.58)',
  lineDark: 'rgba(45,66,72,0.12)',
  primaryTrack: 'rgba(20,109,114,0.12)',
  white12: 'rgba(255,255,255,0.12)',
  white14: 'rgba(255,255,255,0.14)',
  white28: 'rgba(255,255,255,0.28)',
  white40: 'rgba(255,255,255,0.40)',
  white48: 'rgba(255,255,255,0.48)',
  white58: 'rgba(255,255,255,0.58)',
  white60: 'rgba(255,255,255,0.60)',
  white64: 'rgba(255,255,255,0.64)',
  white70: 'rgba(255,255,255,0.70)',
  white80: 'rgba(255,255,255,0.80)',
  white88: 'rgba(255,255,255,0.88)',
  white92: 'rgba(255,255,255,0.92)',
}

export const radii = {
  xl: 32,
  lg: 26,
  md: 20,
  sm: 14,
  pill: 999,
}

export const shadows = {
  card: {
    shadowColor: '#1a2b2f',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.14,
    shadowRadius: 44,
    elevation: 8,
  },
  soft: {
    shadowColor: '#1a2b2f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 4,
  },
}

export const gradients = {
  background: ['#f0f9f4', '#f7f1e5', '#e2eef6'] as const,
  primary: ['#146d72', '#477e80'] as const,
  coral: ['#d77b55', '#eab474'] as const,
  bubble: ['#146d72', '#2b8586'] as const,
}

export const spacing = {
  page: 20,
  card: 18,
  inputGap: 16,
}

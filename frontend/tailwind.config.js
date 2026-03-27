/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        apple: {
          blue:    '#007AFF',
          green:   '#34C759',
          red:     '#FF3B30',
          orange:  '#FF9500',
          yellow:  '#FFCC00',
          purple:  '#AF52DE',
          pink:    '#FF2D55',
          teal:    '#5AC8FA',
          indigo:  '#5856D6',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display',
               'Inter', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'ios':    '12px',
        'ios-lg': '18px',
        'ios-xl': '24px',
        'ios-2xl':'32px',
      },
      boxShadow: {
        'ios-sm': '0 2px 8px rgba(0,0,0,0.08)',
        'ios':    '0 4px 16px rgba(0,0,0,0.12)',
        'ios-lg': '0 8px 32px rgba(0,0,0,0.16)',
        'glow-blue':  '0 0 20px rgba(0,122,255,0.3)',
        'glow-green': '0 0 20px rgba(52,199,89,0.3)',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite',
        'bounce-in':  'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' },
                     to:   { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-10px)' },
                     to:   { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' },
                     '100%': { backgroundPosition: '200% 0' } },
        bounceIn:  { from: { opacity: '0', transform: 'scale(0.8)' },
                     to:   { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}

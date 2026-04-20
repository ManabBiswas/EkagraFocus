/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      boxShadow: {
        // Glow effects for buttons
        'glow-sm': '0 0 8px rgba(0, 240, 255, 0.3)',
        'glow': '0 0 16px rgba(0, 240, 255, 0.4)',
        'glow-lg': '0 0 24px rgba(0, 240, 255, 0.5)',
        'glow-purple': '0 0 16px rgba(168, 85, 247, 0.4)',
        'glow-magenta': '0 0 16px rgba(236, 72, 153, 0.4)',
        'glow-green': '0 0 16px rgba(16, 185, 129, 0.4)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 24px rgba(0, 240, 255, 0.6)' },
        },
        'pulse-glow-purple': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 16px rgba(168, 85, 247, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 24px rgba(168, 85, 247, 0.6)' },
        },
        'pulse-glow-magenta': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 16px rgba(236, 72, 153, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 24px rgba(236, 72, 153, 0.6)' },
        },
        'neon-border': {
          '0%, 100%': { borderColor: 'rgba(0, 240, 255, 0.5)' },
          '50%': { borderColor: 'rgba(0, 240, 255, 0.8)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow-purple': 'pulse-glow-purple 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow-magenta': 'pulse-glow-magenta 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'neon-border': 'neon-border 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0e2944',
        navy2: '#1b3a5c',
        teal: {
          DEFAULT: '#14b8a6',
          dark: '#0f766e',
          light: '#e6f7f5',
          lighter: '#ddf3ef',
          soft: 'rgba(20, 184, 166, 0.16)',
        },
        ink: '#0f172a',
        muted: '#64748b',
        faint: '#94a3b8',
        mutedText2: '#556270',
        white: {
          DEFAULT: '#ffffff',
          6: 'rgba(255, 255, 255, 0.06)',
          78: 'rgba(255, 255, 255, 0.78)',
        },
        surface: {
          DEFAULT: '#f8fafc',
          2: '#eef2f6',
          3: '#edf1f6',
          4: '#f1f5f9',
        },
        border: {
          DEFAULT: '#e2e8f0',
          blue: '#dce7f3',
        },
        coral: {
          DEFAULT: '#ef5a48',
          dark: '#b93a2c',
          light: '#fdeeec',
        },
        amber: {
          DEFAULT: '#f59e0b',
          dark: '#b45309',
        },
        green: '#15803d',
        violet: {
          DEFAULT: '#6d5bd0',
          light: '#ece8fa',
        },
        tier: {
          gold: '#d9a93f',
          silver: '#95a3b3',
          bronze: '#c47f4c',
          growth: '#93b9c3',
        },
        semantic: {
          thriving: '#14b8a6',
          burnoutRisk: '#f59e0b',
          developmentOpportunity: '#6d5bd0',
          criticalSupport: '#ef5a48',
          innovation: '#6d5bd0',
          alert: '#ef5a48',
        },
      },
      fontFamily: {
        sans: [
          '"DM Sans"',
          '"Noto Sans Arabic"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
        arabic: ['"Noto Sans Arabic"', '"DM Sans"', 'sans-serif'],
      },
      fontSize: {
        body: ['13px', { lineHeight: '1.45' }],
        'nav-em': ['13.5px', { lineHeight: '1.35' }],
        'nav-hr': ['13px', { lineHeight: '1.35' }],
      },



      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '11px',
        '2xl': '12px',
        '3xl': '14px',
        '4xl': '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(14,41,68,0.04)',
        raised: '0 10px 28px rgba(14,41,68,0.10)',
        floating: '0 10px 28px rgba(14,41,68,0.22)',
        primaryButton: '0 6px 14px rgba(14,41,68,0.60)',
      },
      width: {
        sidebar: '248px',
        'sidebar-hr': '256px',
        'sidebar-inner': '220px',
        'sidebar-nav-hr': '228px',
      },
      spacing: {
        sidebar: '248px',
        'sidebar-hr': '256px',
        'sidebar-nav-hr': '228px',
        topbar: '62px',
        content: '32px',
        nav: '34px',
      },
      minHeight: {
        topbar: '62px',
        nav: '34px',
      },
      flexBasis: {
        sidebar: '248px',
        'sidebar-hr': '256px',
      },



      maxWidth: {
        content: '1672px',
      },
    },
  },
  plugins: [],
} satisfies Config

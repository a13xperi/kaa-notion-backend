/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === UNIFIED DESIGN TOKENS ===
        // Matching kaa-app React portal color palette

        // Primary Accent Colors (Teal)
        accent: {
          primary: '#2C7A7B',      // Main accent (light mode)
          'primary-dark': '#38b2ac', // Main accent (dark mode)
          secondary: '#10b981',    // Secondary accent (light mode) - Emerald
          'secondary-dark': '#48bb78', // Secondary accent (dark mode)
          hover: '#059669',        // Hover state (light mode)
          'hover-dark': '#38a169', // Hover state (dark mode)
        },

        // Brand Gradient Colors (Purple-Indigo)
        brand: {
          primary: '#667eea',      // Gradient start - Purple
          secondary: '#764ba2',    // Gradient end - Indigo
          light: '#e0e7ff',        // Light brand background
          lighter: '#c3dafe',      // Lighter brand background
        },

        // Background Colors
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },

        // Text Colors
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },

        // Border Colors
        border: {
          DEFAULT: 'var(--border-color)',
        },

        // Input Colors
        input: {
          bg: 'var(--input-bg)',
          border: 'var(--input-border)',
          focus: 'var(--input-focus)',
        },

        // Semantic Colors
        success: {
          DEFAULT: '#4ade80',
          dark: '#22c55e',
          light: '#bbf7d0',
        },
        warning: {
          DEFAULT: '#fbbf24',
          dark: '#f59e0b',
          light: '#fef3c7',
        },
        error: {
          DEFAULT: '#dc2626',
          dark: '#b91c1c',
          light: '#fecaca',
        },
        info: {
          DEFAULT: '#60a5fa',
          dark: '#2196F3',
          light: '#dbeafe',
        },

        // Portal-specific Gradients (for different portal types)
        portal: {
          client: {
            start: '#667eea',
            end: '#764ba2',
          },
          team: {
            start: '#f093fb',
            end: '#f5576c',
          },
          demo: {
            start: '#ffecd2',
            end: '#fcb69f',
          },
        },

        // Gray Scale (matching React app)
        gray: {
          50: '#f8f9fa',
          100: '#f7fafc',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#4a5568',
          800: '#2d3748',
          900: '#1a202c',
        },
      },

      // Font Family (matching React app)
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
        display: ['Noir Pro', 'sans-serif'],
        mono: [
          'source-code-pro',
          'Menlo',
          'Monaco',
          'Consolas',
          'Courier New',
          'monospace',
        ],
      },

      // Box Shadow (matching React app variables)
      boxShadow: {
        light: '0 2px 4px var(--shadow-light)',
        medium: '0 4px 8px var(--shadow-medium)',
        lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 40px rgba(0, 0, 0, 0.15)',
      },

      // Border Radius (matching React app)
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },

      // Background Image (gradients matching React app)
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-team': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-demo': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'gradient-light': 'linear-gradient(135deg, #e0e7ff 0%, #c3dafe 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
      },

      // Spacing scale (matching React app patterns)
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },

      // Animation
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'float': 'floatIcon 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatIcon: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

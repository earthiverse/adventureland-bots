import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */

export default {
  content: ['./src/**/*.{vue,js,ts}'],
  daisyui: {
    themes: ['cmyk']
  },
  theme: {
    extend: {}
  },
  plugins: [daisyui]
}

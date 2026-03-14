/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    safelist: [
        // Dark mode bg colors used across the app
        'dark:bg-zinc-950',
        'dark:bg-zinc-900',
        'dark:bg-zinc-800',
        'dark:bg-black',
        'dark:bg-white/5',
        'dark:bg-white/10',
        'dark:bg-blue-900/30',
        // Dark mode text
        'dark:text-white',
        'dark:text-slate-300',
        'dark:text-slate-400',
        'dark:text-slate-500',
        'dark:text-white/40',
        'dark:text-white/60',
        // Dark mode borders
        'dark:border-white/10',
        'dark:border-white/20',
        'dark:border-zinc-700',
        'dark:border-zinc-800',
        // Dark mode hover
        'dark:hover:bg-white/5',
        'dark:hover:bg-white/10',
        'dark:hover:text-white',
        'dark:hover:border-white/20',
        // Dark mode placeholder
        'dark:placeholder-zinc-600',
    ],
    plugins: [],
}

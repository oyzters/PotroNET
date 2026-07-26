# PotroNET — Agent Rules

## No Emojis
**NEVER** use emoji characters in any frontend source code — JSX, TypeScript, CSS, or UI text strings.
Use lucide-react icons as the ONLY icon system. For status indicators use colored dots, badges, or icon components.
The ONLY exception: emoji-picker-react in MessagesPage.tsx (user chat feature). Do not modify it.

## Tech Stack
- React 19, Vite, TypeScript
- Tailwind CSS v4 (vars in src/index.css)
- Framer Motion v12
- GSAP + ScrollTrigger
- Lucide React for ALL icons

## Design System
- Color space: oklch
- Font: Inter Variable (wght, wdth axes)
- Liquid Glass: .liquid-glass class from index.css
- Neumorphism tokens: --nm-shadow, --nm-shadow-inset, --nm-shadow-sm
- Mobile-first: primary target iPhone 390px


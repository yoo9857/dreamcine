import { animate } from 'framer-motion/dom/mini'

export function animateWordEntrance(root: HTMLElement): () => void {
  const controls = Array.from(
    root.querySelectorAll<HTMLElement>('[data-pull-word]'),
  ).flatMap((word, index) => {
    const current = getComputedStyle(word)
    if (Number(current.opacity) >= 1) return []
    word.style.opacity = current.opacity
    word.style.transform = current.transform
    word.style.animation = 'none'
    return [
      animate(
        word,
        { opacity: 1, transform: 'translateY(0px)' },
        { duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] },
      ),
    ]
  })
  return () => {
    controls.forEach((control) => {
      control.stop()
    })
  }
}

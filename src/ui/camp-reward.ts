/** Fly a small reward trail inside the modal top layer toward its updated wallet. */
export function flyCampReward(root: HTMLElement, source: DOMRect): void {
  const dialog = root.querySelector('dialog.camp-facility')
  const wallet = dialog?.querySelector('.camp-wallet')
  if (!(dialog instanceof HTMLElement) || !(wallet instanceof HTMLElement)) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const target = wallet.getBoundingClientRect()
  const bounds = dialog.getBoundingClientRect()
  for (let index = 0; index < 7; index++) {
    const spark = document.createElement('span')
    spark.className = 'camp-reward-spark'
    spark.setAttribute('aria-hidden', 'true')
    spark.textContent = '✦'
    spark.style.left = `${source.x + source.width / 2 - bounds.x}px`
    spark.style.top = `${source.y + source.height / 2 - bounds.y}px`
    dialog.append(spark)
    const x = target.x + target.width / 2 - source.x - source.width / 2
    const y = target.y + target.height / 2 - source.y - source.height / 2
    const animation = spark.animate(
      [
        { transform: 'translate(-50%, -50%) scale(.5)', opacity: 0 },
        {
          transform: `translate(${x * 0.25 + (index - 3) * 12}px, ${y * 0.45 - 35}px) scale(1.2)`,
          opacity: 1,
          offset: 0.4,
        },
        { transform: `translate(${x}px, ${y}px) scale(.3)`, opacity: 0 },
      ],
      { duration: 650, delay: index * 45, easing: 'ease-in-out' },
    )
    animation.onfinish = () => {
      spark.remove()
      if (index === 6)
        wallet.animate([{ filter: 'brightness(1.35)' }, { filter: 'brightness(1)' }], {
          duration: 280,
        })
    }
    animation.oncancel = () => spark.remove()
  }
}

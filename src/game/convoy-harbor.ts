import type { ConvoyLayoutSpec, ConvoyReach } from '../types/convoy.js'

// Berths are A-D (departure docks) and o (junctions or passing bays).
// Bends without a berth remain part of one continuous voyage.
const CHANNELS = [
  '#############################',
  '#############################',
  '##C##o..o...##o.....o......##',
  '##.#####.##.########.#####.##',
  '##.#####.##.########.#####.##',
  '##.##...o##...A##....##....##',
  '##.##.##.########.#####.#####',
  '##.##.##.########.#####.#####',
  '##...o..o...##o..o##o##....##',
  '###########.#####.##.#####.##',
  '###########.#####.##.#####.##',
  '##...o...##....##.##.##...o##',
  '##.##.##.#####.##.##.##.##.##',
  '##.##.##.#####.##.##.##.##.##',
  '##.##o##o...##o...##o...##o##',
  '##.#####.##.##.#####.########',
  '##.#####.##.##.#####.########',
  '##o...##.##.##o##....##....##',
  '##.##.##.##.#####.#####.##.##',
  '##.##.##.##.#####.#####.##.##',
  '##B##....##......o......##D##',
  '#############################',
  '#############################',
]

/** Compress the authored winding channels into voyages between real berths, not every bend. */
export function convoyHarbor(): ConvoyLayoutSpec {
  const width = CHANNELS[0]!.length,
    height = CHANNELS.length,
    cells = CHANNELS.join('')
  const ports = [...'ABCD'].map((letter) => cells.indexOf(letter))
  for (let i = 0; i < cells.length; i++) if (cells[i] === 'o') ports.push(i)
  /** Read public orthogonal water without crossing row boundaries or banks. */
  const adjoining = (index: number): number[] =>
    [index - 1, index + 1, index - width, index + width].filter(
      (other) =>
        other >= 0 &&
        other < cells.length &&
        Math.abs((other % width) - (index % width)) +
          Math.abs(Math.floor(other / width) - Math.floor(index / width)) ===
          1 &&
        cells[other] !== '#',
    )
  const reaches: ConvoyReach[] = []
  for (const from of ports)
    for (const next of adjoining(from)) {
      const path = [from, next]
      while (!ports.includes(path.at(-1)!)) {
        const options = adjoining(path.at(-1)!).filter((other) => other !== path.at(-2))
        if (options.length !== 1 || path.includes(options[0]!))
          throw new Error('Unmarked harbor junction')
        path.push(options[0]!)
      }
      reaches.push({ from, to: path.at(-1)!, path })
    }
  return {
    width,
    height,
    ports,
    reaches,
    lanes: [],
    boats: [
      [0, 1, 1],
      [1, 0, 2],
      [2, 3, 1],
      [3, 2, 2],
    ],
  }
}

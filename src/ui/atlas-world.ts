import { ATLAS_REGIONS, ATLAS_REGION_CONNECTIONS } from '../game/atlas-regions.js'
import { storyAtlasIndex, storyAtlasUnlocked } from '../game/story-atlas.js'
import { message } from '../i18n.js'
import { worldSceneName } from './world-copy.js'
import { escapeHtml } from './presentation.js'
import type { AtlasRegionId } from '../types/atlas.js'
import type { Language } from '../types/localization.js'
import type { StoryViewState } from '../types/story.js'

/** Regional names remain independent of individual scene titles. */
export function atlasRegionName(language: Language, region: AtlasRegionId): string {
  return region === 'woodland'
    ? message(language, 'story.atlas-woodland')
    : message(language, 'story.atlas-reedbank')
}

/** World regions occupy fixed footprints; only discovered geography breaks through the fog. */
export function atlasWorld(state: StoryViewState): string {
  const regions = ATLAS_REGIONS.filter((region) =>
    storyAtlasUnlocked(state.progress, state.run, storyAtlasIndex(region.entrance)),
  )
  const routes = ATLAS_REGION_CONNECTIONS.filter(
    (link) => regions.some((r) => r.id === link.from) && regions.some((r) => r.id === link.to),
  ).map((link) => {
    const from = regions.find((r) => r.id === link.from)!,
      to = regions.find((r) => r.id === link.to)!
    return {
      id: `${link.from}:${link.to}`,
      path: `M${from.x * 8} ${from.y * 4.6} Q${link.via.x * 8} ${link.via.y * 4.6} ${to.x * 8} ${to.y * 4.6}`,
    }
  })
  const reveal = regions
    .map(
      (region) =>
        `<ellipse cx="${region.x * 8}" cy="${region.y * 4.6}" rx="${region.width * 4}" ry="${region.height * 2.3}" fill="black"/>`,
    )
    .join('')
  const corridors = routes
    .map(
      (route) =>
        `<path data-world-reveal="${route.id}" d="${route.path}" fill="none" stroke="black" stroke-width="52" stroke-linecap="round"/>`,
    )
    .join('')
  const roads = routes
    .map(
      (route) =>
        `<g class="atlas-route is-open" data-world-connection="${route.id}"><path class="atlas-route-bed" d="${route.path}"/><path class="atlas-route-line" d="${route.path}"/></g>`,
    )
    .join('')
  const markers = regions
    .map((region) => {
      const name = escapeHtml(atlasRegionName(state.language, region.id))
      return `<button class="atlas-node atlas-region-node" style="--x:${region.x}%;--y:${region.y}%" data-map-name="${name}" data-story-action="map-region" data-scene="${storyAtlasIndex(region.entrance)}"><img src="${import.meta.env.BASE_URL}assets/story/${region.id === 'woodland' ? 'tree' : 'lantern'}.png" alt="" draggable="false"><strong>${name}</strong></button>`
    })
    .join('')

  return `<div class="atlas-chart atlas-world-overview"><svg class="atlas-terrain" viewBox="0 0 800 460" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="world-fog-edge" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter><mask id="world-fog-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="460"><rect width="800" height="460" fill="white"/><g filter="url(#world-fog-edge)">${reveal}${corridors}</g></mask></defs>${continuousWorldTerrain()}${roads}<rect data-world-fog="true" width="800" height="460" fill="#bbc9c5" mask="url(#world-fog-mask)"/><g fill="none" stroke="#91a7a0" stroke-width=".5" opacity=".25"><path d="M0 115H800M0 230H800M0 345H800M200 0V460M400 0V460M600 0V460"/></g></svg><span class="atlas-unknown-label">${message(state.language, 'story.atlas-unsurveyed')}</span><div class="atlas-marker-layer">${markers}</div><span class="atlas-compass" aria-hidden="true">N<br>✧</span></div>`
}

/** The new river region shows its real camp and return pass, leaving future chapter sites unnamed. */
export function atlasReedbank(state: StoryViewState): string {
  const destinations = [
    ...(state.progress.facts?.includes('ferry-channel-cleared')
      ? [{ scene: 'old-ferry' as const, x: 30, y: 40 }]
      : []),
    { scene: 'reed-camp' as const, x: 56, y: 53 },
    { scene: 'blockade-pass' as const, x: 85, y: 82 },
  ]
  const markers = destinations
    .map((place) => {
      const index = storyAtlasIndex(place.scene)
      const name = escapeHtml(
        place.scene !== 'blockade-pass'
          ? worldSceneName(state.language, place.scene)
          : atlasRegionName(state.language, 'woodland'),
      )
      const open = storyAtlasUnlocked(state.progress, state.run, index)
      return `<button class="atlas-node" style="--x:${place.x}%;--y:${place.y}%" data-map-name="${name}" data-story-action="${place.scene !== 'blockade-pass' ? 'map-scene' : 'map-region'}" data-scene="${index}" ${open ? '' : 'disabled'}><img src="${import.meta.env.BASE_URL}assets/story/lantern.png" alt="" draggable="false"><strong>${name}</strong></button>`
    })
    .join('')

  return `<div class="atlas-chart atlas-river-region">${riverTerrain(!!state.progress.facts?.includes('ferry-channel-cleared'))}<span class="atlas-unknown-label">${message(state.language, 'story.atlas-unsurveyed')}</span><div class="atlas-marker-layer">${markers}</div><span class="atlas-compass" aria-hidden="true">N<br>✧</span></div>`
}

/** Reuse the same river geography in the world overview and its detailed regional chart. */
function riverTerrain(ferryOpen = false): string {
  const ferryRoad = ferryOpen
    ? '<g class="atlas-route is-open" data-atlas-route="reed-camp:old-ferry" data-route-state="open" data-one-way="false"><path class="atlas-route-bed" d="M448 243.8Q360 260 240 184"/><path class="atlas-route-line" d="M448 243.8Q360 260 240 184"/></g>'
    : ''

  return `<svg class="atlas-terrain" viewBox="0 0 800 460" preserveAspectRatio="none" aria-hidden="true"><rect width="800" height="460" fill="#dce1cd"/><path d="M0 10Q290 160 380 40T800 110V0H0Z" fill="#c7d3c4"/><path d="M130-30Q570 170 290 280T450 510" fill="none" stroke="#9bbdbd" stroke-width="90"/><path d="M130-30Q570 170 290 280T450 510" fill="none" stroke="#c5d9d5" stroke-width="45"/><path d="M448 244Q580 310 680 377" fill="none" stroke="#849875" stroke-width="3" stroke-dasharray="8 5"/>${ferryRoad}<path d="m440 235-80 0m0-9v18" stroke="#9f8563" stroke-width="6"/></svg>`
}

/** One continuous geography sits underneath discovery fog; region charts are never pasted as islands. */
function continuousWorldTerrain(): string {
  return `<g data-world-geography="continuous"><rect width="800" height="460" fill="#dce2c7"/><path d="M0 0H800V85Q650 55 570 100T320 100T0 160Z" fill="#cad6bf"/><path d="M0 350Q170 310 285 380T600 390T800 360V460H0Z" fill="#d0dab8"/><path d="M210 0Q350 70 330 160T384 262Q405 298 467 303T553 352Q570 405 690 460" fill="none" stroke="#9fbec1" stroke-width="16"/><path d="M210 0Q350 70 330 160T384 262Q405 298 467 303T553 352Q570 405 690 460" fill="none" stroke="#c1d6d5" stroke-width="8"/><g fill="#b1bea4" stroke="#94a58d" stroke-width="2"><path d="m350 216 24-44 27 45-24-12Z"/><path d="m414 259 23-48 29 52-29-17Z"/><path d="m459 273 18-35 22 41-21-12Z"/></g><g fill="#93ad8b" opacity=".8"><path d="m480 327 8-18 8 18h-5v7h-6v-7Z"/><path d="m501 341 8-18 8 18h-5v7h-6v-7Z"/><path d="m568 334 9-20 9 20h-6v7h-6v-7Z"/><path d="m582 360 8-18 8 18h-5v7h-6v-7Z"/><path d="m601 343 8-18 8 18h-5v7h-6v-7Z"/></g></g>`
}

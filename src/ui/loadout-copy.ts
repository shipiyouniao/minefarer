import { message } from '../i18n.js'
import type { Language } from '../types/localization.js'
import type { Equipment } from '../types/variants.js'

/** Equipment prose is separate from cost badges; pipe-delimited effects are authored rows. */
export function loadoutCopy(
  language: Language,
  item: Equipment,
): { lore: string; effects: readonly string[] } {
  switch (item) {
    case 'probe':
      return {
        lore: message(language, 'loadout.lore.probe'),
        effects: message(language, 'loadout.effects.probe').split('|'),
      }
    case 'scanner':
      return {
        lore: message(language, 'loadout.lore.scanner'),
        effects: message(language, 'loadout.effects.scanner').split('|'),
      }
    case 'guard':
      return {
        lore: message(language, 'loadout.lore.guard'),
        effects: message(language, 'loadout.effects.guard').split('|'),
      }
    case 'medical-kit':
      return {
        lore: message(language, 'loadout.lore.medical-kit'),
        effects: message(language, 'loadout.effects.medical-kit').split('|'),
      }
    case 'steel-blade':
      return {
        lore: message(language, 'loadout.lore.steel-blade'),
        effects: message(language, 'loadout.effects.steel-blade').split('|'),
      }
    case 'plated-vest':
      return {
        lore: message(language, 'loadout.lore.plated-vest'),
        effects: message(language, 'loadout.effects.plated-vest').split('|'),
      }
    case 'focus-lens':
      return {
        lore: message(language, 'loadout.lore.focus-lens'),
        effects: message(language, 'loadout.effects.focus-lens').split('|'),
      }
    case 'clearing-hook':
      return {
        lore: message(language, 'loadout.lore.clearing-hook'),
        effects: message(language, 'loadout.effects.clearing-hook').split('|'),
      }
    case 'field-boots':
      return {
        lore: message(language, 'loadout.lore.field-boots'),
        effects: message(language, 'loadout.effects.field-boots').split('|'),
      }
    case 'field-radio':
      return {
        lore: message(language, 'loadout.lore.field-radio'),
        effects: message(language, 'loadout.effects.field-radio').split('|'),
      }
    case 'sonar':
      return {
        lore: message(language, 'loadout.lore.sonar'),
        effects: message(language, 'loadout.effects.sonar').split('|'),
      }
  }
}

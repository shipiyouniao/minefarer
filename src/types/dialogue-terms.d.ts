/** Semantic emphasis is shared by all dialogue presenters and locales. */
export type DialogueTermKind = 'person' | 'place' | 'item' | 'warning'
export interface DialogueTerm {
  readonly text: string
  readonly kind: DialogueTermKind
}
export interface DialoguePart {
  readonly text: string
  readonly kind: DialogueTermKind | null
}

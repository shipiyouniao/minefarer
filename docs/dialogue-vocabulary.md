# Shared dialogue vocabulary

All three dialogue owners (opening StoryPerformance, later SignalPerformance and boss prologues) use DialogueReveal. Its text and invisible sizing copy use the same semantic spans. Finishing a line, reduced motion and ordinary typing retain identical emphasis; accessible labels contain the original plain text. No dialogue string is interpreted as HTML.

| Kind              | Visual treatment          | Authoring source                               |
| ----------------- | ------------------------- | ---------------------------------------------- |
| Person            | Bold plum text            | Shared translated character names              |
| Place             | Blue-green underline      | Shared scene names and localized place aliases |
| Item or mechanism | Ochre dotted underline    | Localized object vocabulary                    |
| Warning           | Bold red double underline | Localized warning phrases                      |

`src/ui/dialogue-terms.ts` is the shared vocabulary resolver and DOM renderer; `src/types/dialogue-terms.d.ts` defines the finite semantic kinds. Styles live in `src/dialogue-bar.css`. Longest matching names take priority and Latin names require word boundaries. The three `dialogue.*` vocabulary messages contain pipe-separated aliases, with matching semantic meanings in all three locales. Add new character names to the person catalog and new place/object/warning aliases when writing scenes. Do not embed colors, HTML or Markdown in scripts, and do not highlight whole conversations indiscriminately.

Existing dialogue receives these treatments automatically through the shared reveal component. Extend the registry for newly introduced terms; test full text, character prefixes, skip, reduced motion and literal HTML characters. Sound timing follows visible graphemes, not markup characters.

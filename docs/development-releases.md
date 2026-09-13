# Development previews and milestone releases

Feature pull requests target `develop` and require review. Promote `develop` to `main` through a reviewed milestone PR when an agreed milestone, such as Chapter Two, is complete. PR #82 was the final direct feature delivery to main before this policy.

- Stable: https://shipiyouniao.github.io/minefarer/
- Development: https://shipiyouniao.github.io/minefarer/dev/

The Pages workflow builds the latest main and develop revisions independently and assembles both into one artifact. Both resolved checkouts run the full check suite and legacy-compiler behavior tests before packaging; a branch update during the earlier validation job cannot bypass these gates. Either branch publication preserves both sites. Publication runs share one concurrency group, while PR validation remains independent. Both root and development asset paths are verified in CI. Repository Pages environment rules must permit `develop` as a deployment source.

The development application prefixes browser storage keys with `minefarer.dev:`. It does not read, copy or migrate the stable save. Test progress starts independently. Both sites keep their own progress despite sharing an origin. Clearing one game through its own UI does not clear the other.

## Chapter design requirements

Each chapter needs distinct inference mechanics, with new interactions beyond Chapter One. Combining mechanics is welcome when they affect one another. Every side story needs its own special gameplay or minigame; it may span several stages and include its own bosses and a lasting narrative outcome. It need not be forced into every release.

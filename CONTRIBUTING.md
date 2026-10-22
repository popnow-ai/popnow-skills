# Contributing

Thanks for helping improve PopNow Skills.

- **Bugs and ideas:** open an issue with the skill name, the command you ran, the exit code and the PopNow `request_id` if there was one. Never paste an API key.
- **Pull requests:** keep each skill self-contained and the scripts dependency-free (Python 3.8+ standard library only).
- **One helper, eleven copies:** edit `skills/popnow-api/scripts/popnow.py`, then run `python3 tools/sync_scripts.py` so every other skill that ships it gets the same file. `popnow-skill-finder` has its own `find_skills.py`.
- **Make-things skills** (launch film, narrated explainer, HyperFrames assets, landing page, social covers, brand kit): Node.js scripts use only built-in `node:` modules (Node.js 22+; Playwright is an optional fallback, never required), Python scripts only the standard library. Run each skill's self-test after a change (listed in its README; `POPNOW_BROWSER_TESTS=1` adds the ones that drive Chrome). Keep `SKILL.md` under 250 lines and details in `references/`.
- **Third-party material:** only bundle code, fonts or media under OSI or font-specific open licenses (MIT, Apache-2.0, ISC, SIL OFL), keep the license file next to it and add it to `THIRD_PARTY_NOTICES.md`. Do not bundle GSAP or any file whose license is not open; document how to install it instead.
- **Installer:** `setup` must stay POSIX `sh` (test with `sh` and `dash`) and must never use the network.
- **Tests:** `python3 -m unittest discover -s tests` must pass. The tests are offline; do not add tests that call the live API or spend credits.
- **API accuracy:** request and response fields must match the published spec at https://popnow.ai/docs/openapi.yaml. Do not invent endpoints or fields.
- **Cost safety:** anything that spends credits must quote first and require an explicit confirmation from the user.
- **Model tables:** regenerate `references/models.md` with `tools/build_model_refs.py` from a live `popnow.py models --json` export instead of editing by hand.
- **Language:** code, comments and docs are in English.

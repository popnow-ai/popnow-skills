# Contributing

Thanks for helping improve PopNow Skills.

- **Bugs and ideas:** open an issue with the skill name, the command you ran, the exit code and the PopNow `request_id` if there was one. Never paste an API key.
- **Pull requests:** keep each skill self-contained and the scripts dependency-free (Python 3.8+ standard library only).
- **One helper, five copies:** edit `skills/popnow-api/scripts/popnow.py`, then run `python3 tools/sync_scripts.py` so every skill ships the same file.
- **Tests:** `python3 -m unittest discover -s tests` must pass. The tests are offline; do not add tests that call the live API or spend credits.
- **API accuracy:** request and response fields must match the published spec at https://popnow.ai/docs/openapi.yaml. Do not invent endpoints or fields.
- **Cost safety:** anything that spends credits must quote first and require an explicit confirmation from the user.
- **Model tables:** regenerate `references/models.md` with `tools/build_model_refs.py` from a live `popnow.py models --json` export instead of editing by hand.
- **Language:** code, comments and docs are in English.

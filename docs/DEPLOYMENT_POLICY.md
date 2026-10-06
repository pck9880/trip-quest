# TRIP QUEST deployment policy

## Production lock
- `main` is the production source.
- Production must not be updated or merged unless the owner explicitly requests a production deployment.
- Current production baseline: v1.1.2 rollback commit `7285b75c14d06b50a54bee13c1218b09f3feaac1`.

## Test workflow
- All ongoing development is committed to `develop`.
- Pushes to `develop` run tests and publish the isolated staging snapshot to `gh-pages-test`.
- Each commit is a rollback point. Never rewrite `develop` history for routine work.
- Before a major visual or functional change, record the current `develop` SHA in the change/PR description.

## Promotion
- Only after explicit owner approval, promote the tested `develop` state to `main`.
- Production and test histories remain recoverable in Git.

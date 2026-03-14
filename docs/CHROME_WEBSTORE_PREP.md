# Chrome Web Store Preparation Checklist

## 1) Manifest and code

- [ ] Extension name and description finalized.
- [ ] Icon files exist (`16/32/48/128`) and are configured in `manifest.json`.
- [ ] Host permissions are minimal and justified.
- [ ] No remote code loading (no runtime CDN script injection).
- [ ] Version is bumped for release.

## 2) Privacy and compliance

- [ ] Privacy disclosure is prepared (see `docs/PRIVACY.md`).
- [ ] Data use in cloud mode is explicitly described in store listing.
- [ ] Permission usage is explained in listing text.

## 3) Store assets

- [ ] At least one clear screenshot of the extension UI.
- [ ] Short description and detailed description are prepared.
- [ ] Category/language and support contact are set.

## 4) Packaging and upload

- [ ] Zip the extension root (exclude `.git`, local temp files).
- [ ] Upload package in Chrome Developer Dashboard.
- [ ] Complete Privacy tab and submission questionnaire.
- [ ] Submit and address reviewer feedback.

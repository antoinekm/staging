---
"staging": patch
---

Fix environment variables not being properly recognized and improve options merging priority. Environment variables can now be set with or without the `STAGING_` prefix, and passwords are correctly detected from both environment variables and direct configuration.

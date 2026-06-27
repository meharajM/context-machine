# Google Drive Live Validation Runbook

## Scope

As of 2026-06-27, Google Drive sync is implemented and covered by automated create/update tests in [src/__tests__/sync.test.ts](/Users/meharaj/context-machine/src/__tests__/sync.test.ts). The remaining gap is the live credentialed smoke path in [scripts/gdrive-live-smoke.ts](/Users/meharaj/context-machine/scripts/gdrive-live-smoke.ts).

Use this runbook to validate real credentials, real folder access, upload verification, and cleanup.

## What the smoke script does

`npm run smoke:gdrive` is already the safe live path for this repo. It:

1. reads `CONTEXT_ENGINE_GDRIVE_FOLDER_ID`
2. reads `CONTEXT_ENGINE_GDRIVE_CREDENTIALS`
3. creates a temporary local root under the OS temp directory
4. creates a unique project name: `gdrive-smoke-<timestamp>`
5. appends a unique marker: `gdrive-smoke-marker-<timestamp>`
6. runs `gDriveSync`
7. looks up `<project>-context.md` in the target Drive folder
8. downloads the uploaded file and verifies the marker
9. deletes the uploaded Drive file
10. deletes the temporary local root

Because it uses a fresh temp root and unique names, it is the preferred live check before release.

## Credential preflight

Use a dedicated Drive folder for this smoke. Do not point this at a production folder that users depend on.

```bash
cd /Users/meharaj/context-machine
npm install
npm run build
```

Export the required variables:

```bash
export CONTEXT_ENGINE_GDRIVE_FOLDER_ID="your-folder-id"
export CONTEXT_ENGINE_GDRIVE_CREDENTIALS="~/.contextengine/.gdrive-credentials.json"
```

Confirm the variables are present and the credential file is readable:

```bash
test -n "$CONTEXT_ENGINE_GDRIVE_FOLDER_ID"
test -f "${CONTEXT_ENGINE_GDRIVE_CREDENTIALS/#\~/$HOME}"
node -e 'const fs=require("fs"); const os=require("os"); const p=(process.env.CONTEXT_ENGINE_GDRIVE_CREDENTIALS||"").replace(/^~/, os.homedir()); const j=JSON.parse(fs.readFileSync(p,"utf8")); console.log(j.client_email || j.client_id || "credential-json-loaded");'
```

If that command prints a `client_email`, share the target Drive folder with that principal before continuing. The repo uses the `drive.file` scope in [src/sync.ts](/Users/meharaj/context-machine/src/sync.ts), so the credentialed principal must be able to create, read, update, and delete files in the target folder.

## Safe smoke procedure

Capture the full console log:

```bash
LOG_PATH="${TMPDIR:-/tmp}/contextengine-gdrive-smoke.$(date +%Y%m%d-%H%M%S).log"
npm run smoke:gdrive 2>&1 | tee "$LOG_PATH"
echo "$LOG_PATH"
```

Do not replace this with a hand-written script. This repo already has the exact live smoke path that matches the implementation.

## Expected success output

On a clean successful run, expect these three success signals in the log:

```text
Drive sync result: created=gdrive-smoke-<timestamp> updated=- skipped=-
Verified uploaded Google Drive file: gdrive-smoke-<timestamp>-context.md
Removed smoke file from Google Drive: gdrive-smoke-<timestamp>-context.md
```

Expected result characteristics:

- exit code `0`
- `created` contains exactly one smoke project
- `updated` is `-`
- `skipped` is `-`
- the verified file name matches the removed file name

Because the smoke script always creates a new temp root and a new timestamped project, `updated` or `skipped` is not a normal success result for this path.

## Pass / fail criteria

Mark the run `pass` only if all of the following are true:

- `npm run smoke:gdrive` exits `0`
- the log includes the `Drive sync result` line
- the log includes `Verified uploaded Google Drive file`
- the log includes `Removed smoke file from Google Drive`
- no `gdrive-smoke-*-context.md` file remains in the target folder after the run

Mark the run `fail` if any of the following happen:

- non-zero exit code
- missing env var or unreadable credential file
- upload succeeded but lookup failed
- lookup succeeded but downloaded file does not contain the smoke marker
- delete failed and left a smoke file behind
- result shows `updated` or `skipped` for the smoke project

## Cleanup

The script already removes both the uploaded Drive file and the local temp root in a `finally` block. After the run:

1. verify the target Drive folder has no remaining `gdrive-smoke-*-context.md` file
2. keep the saved console log
3. if a smoke file remains, delete it manually from Drive and record that cleanup step in the evidence

## Common failure modes

| Symptom | Likely cause | What to capture |
|---|---|---|
| `Set CONTEXT_ENGINE_GDRIVE_FOLDER_ID and CONTEXT_ENGINE_GDRIVE_CREDENTIALS before running npm run smoke:gdrive.` | One or both required env vars were missing in the shell that launched the script. | Full terminal output and `echo` of the two env vars with the credential value redacted down to its path. |
| `gdriveFolderId and gdriveCredentials are required for gdrive sync.` | The script reached the sync layer without complete config. This usually means env setup drift or a modified invocation path. | Full terminal output and the exact command that was run. |
| JSON parse error or `ENOENT` while loading credentials | `CONTEXT_ENGINE_GDRIVE_CREDENTIALS` points at a missing or invalid JSON file. | Terminal output and the credential path used. |
| 403 or permission-denied response from Drive | The credentialed principal does not have write access to the target folder, or the API is not enabled for that credential. | Terminal output, printed credential principal, and folder-sharing settings. |
| 404 or folder-not-found response | Wrong `CONTEXT_ENGINE_GDRIVE_FOLDER_ID`. | Terminal output and the folder id used. |
| `Uploaded Google Drive file was not found: ...` | Upload did not land in the expected folder, or lookup permissions differ from create permissions. | Terminal output and a screenshot of the target folder contents. |
| `Uploaded Google Drive file did not contain the expected smoke marker.` | Wrong file was read back, upload contents were altered, or the lookup matched an unexpected file. | Terminal output and the downloaded file contents if available. |
| `Removed smoke file...` is missing but verify succeeded | Delete failed after readback. The smoke left residue in Drive. | Terminal output and screenshot of the leftover file before manual deletion. |

## Evidence that proves success

Minimum acceptable evidence:

- the saved log file path
- the full `npm run smoke:gdrive` console output
- the printed credential principal or confirmation that the JSON loaded
- the target folder id used
- the three success lines from the log

Stronger evidence:

- screenshot of the target Drive folder before the run
- screenshot of the target Drive folder after the run showing no leftover smoke file

## Suggested operator order

1. Run the credential preflight.
2. Run `npm run smoke:gdrive`.
3. Confirm the three success lines and exit code `0`.
4. Confirm no smoke file remains in Drive.
5. Save the log as the evidence artifact for the release checklist.

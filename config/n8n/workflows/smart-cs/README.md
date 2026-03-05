# n8n Smart CS Data Templates

This directory contains import-ready n8n workflow templates for the 5 data domains:

1. Knowledge Base Data
2. Conversation Data
3. Business Data
4. Operations Data
5. Website Content Data

## Files

- `01-knowledge-base-sync.json`
- `02-conversation-trace-sync.json`
- `03-business-proxy-router.json`
- `04-ops-kpi-daily-rollup.json`
- `05-website-content-pr-gate.json`
- `manifest.yaml`
- `.env.smart-cs.example`

## One-Command Install

```bash
bash /root/codes/ljwx-workflow-templates/scripts/install-smart-cs-data-templates.sh \
  --repo "$PWD"
```

## Import Mode

- Import JSON files into n8n UI (`Workflows -> Import from file`).
- Bind credentials and environment variables according to `manifest.yaml` and `.env.smart-cs.example`.
- Keep workflows inactive until endpoint and token checks pass.

## Naming Convention

- Prefix: `LJWX SmartCS -`
- Trigger model:
  - Cron for periodic sync/rollup flows.
  - Webhook for Dify/OpenClaw/event driven flows.

## Deployment Notes

- Source of truth stays in Git.
- Runtime changes in n8n must be exported back to Git workflow JSON.
- Production changes require PR review and gate pass.

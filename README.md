# Flock Tekmetric Webhook Relay

This repository contains a ready-to-deploy Google Apps Script that receives incoming webhooks from Tekmetric and forwards curated notifications to a Flock channel.

## Contents
- [`apps-script/tekmetricWebhook.gs`](apps-script/tekmetricWebhook.gs): Web App entry point and helper functions for validating requests and posting formatted messages to Flock.
- This `README`: Setup and configuration guidance.

## Prerequisites
1. **Tekmetric** administrator access to create an outgoing webhook.
2. **Flock** incoming webhook URL for the channel (or bot) you want to notify.
3. **Google** account with permission to create and deploy an Apps Script Web App.

## Setup
1. In Google Drive, click **New → More → Google Apps Script** and replace the default code with [`apps-script/tekmetricWebhook.gs`](apps-script/tekmetricWebhook.gs).
2. Open **Project Settings → Script properties** and add:
   - `FLOCK_WEBHOOK_URL`: the Flock incoming webhook URL.
   - `TEKMETRIC_SHARED_SECRET` (optional): a shared token you will also append as a `token` query parameter in Tekmetric.
   - `ALLOWED_EVENT_TYPES` (optional): comma-separated allowlist (e.g., `repairOrder.created,repairOrder.updated`). Events not on the list are acknowledged and ignored.
3. Click **Deploy → New deployment → Web app**. Choose *Execute as Me* and *Who has access: Anyone with the link* (Tekmetric must reach it without Google authentication). Copy the deployment URL.

## Connect Tekmetric
1. In Tekmetric, create an outgoing webhook and paste your Web App URL. If you configured `TEKMETRIC_SHARED_SECRET`, append `?token=YOUR_SECRET` to the URL.
2. Select the events you want Tekmetric to emit (match them with your `ALLOWED_EVENT_TYPES` list if used).
3. Save the webhook, then trigger a test event from Tekmetric to confirm the Apps Script receives payloads.

## How it works
- Tekmetric sends a JSON payload to your Apps Script Web App.
- The script optionally validates the `token` query parameter against `TEKMETRIC_SHARED_SECRET`.
- Events not in `ALLOWED_EVENT_TYPES` are ignored to reduce noise.
- A concise message is constructed (including event type, repair order number, customer, vehicle, and total if present) and posted to Flock via `FLOCK_WEBHOOK_URL`.

## Customizing notifications
- Adjust `formatFlockText` in `apps-script/tekmetricWebhook.gs` to change message wording or add/remove fields.
- Enrich the `buildAttachment` helper to include structured details (e.g., statuses, technician assignments) if your Flock destination supports attachments.
- Add additional routing (e.g., different Flock webhooks per shop) by branching on `payload.data.shopId` or other Tekmetric fields.

## Troubleshooting
- If Flock messages are not arriving, check **Executions** in Apps Script for errors, verify the webhook URL in **Script properties**, and ensure Tekmetric can reach the deployed Web App URL (no corporate firewall blocks).
- To rotate credentials, update the script properties and redeploy a new version of the Web App.

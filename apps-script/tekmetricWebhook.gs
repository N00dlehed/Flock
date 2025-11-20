/**
 * Tekmetric -> Flock webhook relay for Google Apps Script Web Apps.
 *
 * Configure script properties:
 * - FLOCK_WEBHOOK_URL: Incoming webhook URL for your Flock destination.
 * - TEKMETRIC_SHARED_SECRET (optional): Token expected in the `token` query parameter.
 * - ALLOWED_EVENT_TYPES (optional): Comma-separated allowlist of event types to forward.
 */
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var flockWebhook = props.getProperty('FLOCK_WEBHOOK_URL');
  if (!flockWebhook) {
    return createTextResponse('Missing FLOCK_WEBHOOK_URL in Script properties.');
  }

  if (!e || !e.postData || !e.postData.contents) {
    return createTextResponse('No payload received.');
  }

  var sharedSecret = props.getProperty('TEKMETRIC_SHARED_SECRET');
  if (sharedSecret && (!e.parameter || e.parameter.token !== sharedSecret)) {
    return createTextResponse('Unauthorized: token mismatch.');
  }

  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return createTextResponse('Invalid JSON payload: ' + err);
  }

  var allowedEvents = readAllowList(props.getProperty('ALLOWED_EVENT_TYPES'));
  var eventType = payload.eventType || payload.type || 'unknown';
  if (allowedEvents && allowedEvents.indexOf(eventType) === -1) {
    return createTextResponse('Ignored event type: ' + eventType);
  }

  var message = formatFlockText(payload, eventType);
  var attachment = buildAttachment(payload, eventType);

  try {
    sendToFlock(flockWebhook, message, attachment);
  } catch (notifyErr) {
    return createTextResponse('Failed to notify Flock: ' + notifyErr);
  }

  return createTextResponse('OK');
}

/**
 * Build a concise text message for Flock.
 */
function formatFlockText(payload, eventType) {
  var data = payload.data || {};
  var parts = [
    'Tekmetric event: ' + eventType
  ];

  if (data.repairOrderNumber) {
    parts.push('RO #' + data.repairOrderNumber);
  }

  if (data.customerName) {
    parts.push('Customer: ' + data.customerName);
  }

  if (data.vehicle) {
    parts.push('Vehicle: ' + data.vehicle);
  }

  if (data.totalAmount) {
    parts.push('Total: $' + data.totalAmount);
  }

  return parts.join(' | ');
}

/**
 * Build an optional attachment for richer context in Flock.
 */
function buildAttachment(payload, eventType) {
  var data = payload.data || {};
  var descriptionParts = [];

  if (data.serviceWriter) {
    descriptionParts.push('Writer: ' + data.serviceWriter);
  }
  if (data.technician) {
    descriptionParts.push('Tech: ' + data.technician);
  }
  if (data.status) {
    descriptionParts.push('Status: ' + data.status);
  }
  if (data.shopName) {
    descriptionParts.push('Shop: ' + data.shopName);
  }

  return {
    title: 'Tekmetric ' + eventType,
    description: descriptionParts.join(' | '),
    url: data.link || ''
  };
}

/**
 * Send the formatted notification to Flock.
 */
function sendToFlock(webhookUrl, text, attachment) {
  var payload = {
    text: text,
    attachments: attachment && attachment.description ? [attachment] : []
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(webhookUrl, options);
}

function readAllowList(raw) {
  if (!raw) {
    return null;
  }
  return raw.split(',').map(function(item) {
    return item.trim();
  }).filter(function(item) {
    return item.length > 0;
  });
}

function createTextResponse(message) {
  return ContentService
    .createTextOutput(message)
    .setMimeType(ContentService.MimeType.TEXT);
}

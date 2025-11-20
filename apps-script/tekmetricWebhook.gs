/**
 * Google Apps Script webhook listener for Tekmetric events to Flock.
 *
 * Required Script Properties:
 * - FLOCK_BOT_TOKEN: Bot token used for Flock channel management APIs.
 * - FLOCK_WEBHOOK_URL: Incoming webhook URL for the destination channel.
 */
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var botToken = props.getProperty('FLOCK_BOT_TOKEN');
  var webhookUrl = props.getProperty('FLOCK_WEBHOOK_URL');

  if (!botToken || !webhookUrl) {
    return createTextResponse('Missing FLOCK_BOT_TOKEN or FLOCK_WEBHOOK_URL.');
  }

  if (!e || !e.postData || !e.postData.contents) {
    return createTextResponse('No payload received.');
  }

  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return createTextResponse('Invalid JSON payload: ' + err);
  }

  console.log('Incoming payload:', payload);

  if (!payload || payload.eventType !== 'authorized') {
    return createTextResponse('OK');
  }

  var roId = payload.repairOrderId;
  var assignedTechIds = payload.assignedTechnicians || [];
  var customerName = (payload.customer && payload.customer.firstName) || 'customer';

  var normalized = {
    roId: roId,
    assignedTechIds: assignedTechIds,
    customerName: customerName
  };
  console.log('Normalized payload:', normalized);

  var channelId = createFlockChannel(botToken, roId, customerName, assignedTechIds);
  addTechsToChannel(botToken, channelId, assignedTechIds);
  sendAuthorizedMessage(webhookUrl, channelId, roId, assignedTechIds);

  return createTextResponse('OK');
}

function createFlockChannel(botToken, roId, customerName, techIds) {
  var channelName = 'ro-' + roId + '-authorized';
  var response = UrlFetchApp.fetch('https://api.flock.com/v1/channels.create', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      token: botToken,
      name: channelName
    }
  });

  var data = JSON.parse(response.getContentText());
  var channelId = data && data.channel && data.channel.id;
  console.log('New channelId:', channelId);
  return channelId;
}

function addTechsToChannel(botToken, channelId, techIds) {
  var results = [];
  for (var i = 0; i < techIds.length; i++) {
    var techId = techIds[i];
    var response = UrlFetchApp.fetch('https://api.flock.com/v1/channels.addMembers', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: {
        token: botToken,
        channel_id: channelId,
        user_ids: techId
      }
    });
    results.push({ techId: techId, status: response.getResponseCode() });
  }
  console.log('Tech assignment results:', results);
  return results;
}

function sendAuthorizedMessage(webhookUrl, channelId, roId, techIds) {
  var mentions = techIds.map(function(id) {
    return '@' + id;
  });
  var text = 'RO ' + roId + ' has been authorized.\nAssigned techs: ' + (mentions.length ? mentions.join(' ') : 'none');

  UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      text: text
    })
  });
}

function createTextResponse(message) {
  return ContentService.createTextOutput(message).setMimeType(ContentService.MimeType.TEXT);
}

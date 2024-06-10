import { existsSync, readFileSync, writeFileSync } from 'fs';
const path = './messageId.json';

// Ensure the file exists
if (!existsSync(path)) {
  writeFileSync(path, JSON.stringify({ messageId: null }), 'utf-8');
}

// Load the message ID from the JSON file
let messageIdData = JSON.parse(readFileSync(path, 'utf-8'));

// Save the message ID to the JSON file
function saveMessageId(messageId) {
  messageIdData.messageId = messageId;
  writeFileSync(path, JSON.stringify(messageIdData, null, 2), 'utf-8');
}

function getMessageId() {
  return messageIdData.messageId;
}

export { saveMessageId, getMessageId };

import { existsSync, readFileSync, writeFileSync } from 'fs';
const path = './userCoins.json';

// Ensure the file exists
if (!existsSync(path)) {
  writeFileSync(path, JSON.stringify({}), 'utf-8');
}

// Load the userCoins data from the JSON file
let userCoins = JSON.parse(readFileSync(path, 'utf-8'));

// Save the userCoins data to the JSON file
function saveUserCoins() {
  writeFileSync(path, JSON.stringify(userCoins, null, 2), 'utf-8');
}

// Function to grant coins
export function grantCoin(userId) {
  if (userCoins[userId]) {
    userCoins[userId] += 1;
  } else {
    userCoins[userId] = 1;
  }
  saveUserCoins();
}

// Function to redeem a coin
export function redeemCoin(userId, callback) {
  if (userCoins[userId] && userCoins[userId] > 0) {
    userCoins[userId] -= 1;
    saveUserCoins();
    callback(true);
  } else {
    callback(false);
  }
}

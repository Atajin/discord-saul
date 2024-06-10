import 'dotenv/config';
import { capitalize, InstallGlobalCommands } from './utils.js';

const CLEAR_TIMEOUT_COMMAND = {
  name: 'cleartimeout',
  description: 'Clears any timeout',
  type: 1,
};

// Grant coin command
const GRANT_COIN_COMMAND = {
  name: 'grantcoin',
  description: 'Grants a redemption coin to a specified user',
  type: 1, // Slash command
  options: [
    {
      type: 6, // USER type
      name: 'user',
      description: 'The user to grant a coin to',
      required: true,
    },
  ],
};


const ALL_COMMANDS = [CLEAR_TIMEOUT_COMMAND, GRANT_COIN_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
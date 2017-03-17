/*
This file is part of Talkie -- text-to-speech browser extension button.
<https://github.com/joelpurra/talkie>

Copyright (c) 2016, 2017 Joel Purra <https://joelpurra.com/>

Talkie is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Talkie is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Talkie.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
    promiseTry,
} from "../shared/promise";

import {
    log,
    logError,
} from "../shared/log";

export default class ShortcutKeyManager {
    constructor(commandHandler) {
        this.commandHandler = commandHandler;
    }

    handler(command) {
        return promiseTry(
            () => {
                log("Start", "handler", command);

                // NOTE: straight mapping from command to action.
                return this.commandHandler.handle(command)
                    .then((result) => {
                        log("Done", "handler", command, result);

                        return undefined;
                    })
                    .catch((error) => {
                        logError("Error", "handler", command, error);

                        throw error;
                    });
            });
    }
}
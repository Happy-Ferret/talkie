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
    log,
} from "../shared/log";

import {
    messagesLocale,
} from "../shared/configuration";

import {
    promiseTry,
} from "../shared/promise";

import {
    canTalkieRunInTab,
    isCurrentPageInternalToTalkie,
} from "../shared/tabs";

import {
    detectPageLanguage,
} from "./language";

export default class TalkieBackground {
    constructor(rootChain, talkieSpeaker, speakingStatus) {
        this.rootChain = rootChain;
        this.talkieSpeaker = talkieSpeaker;
        this.speakingStatus = speakingStatus;

        this.notAbleToSpeakTextFromThisSpecialTab = {
            text: chrome.i18n.getMessage("notAbleToSpeakTextFromThisSpecialTab"),
            effectiveLanguage: messagesLocale,
        };
    }

    speakSelectionOnPage() {
        return promiseTry(
            () => Promise.all([
                canTalkieRunInTab(),
                isCurrentPageInternalToTalkie(),
            ])
                .then(([canRun, isInternalPage]) => {
                        // NOTE: can't perform (most) actions if it's not a "normal" tab.
                    if (!canRun) {
                        log("iconClickAction", "Did not detect a normal tab, skipping.");

                            // NOTE: don't "warn" about internal pages opening.
                        if (isInternalPage) {
                            log("iconClickAction", "Detected internal page, skipping warning.");

                            return undefined;
                        }

                        const text = this.notAbleToSpeakTextFromThisSpecialTab.text;
                        const lang = this.notAbleToSpeakTextFromThisSpecialTab.effectiveLanguage;

                        return this.talkieSpeaker.speakTextInLanguage(text, lang);
                    }

                    return this.talkieSpeaker.speakUserSelection();
                })
        );
    }

    startStopSpeakSelectionOnPage() {
        return promiseTry(
            () => this.speakingStatus.isSpeaking()
                .then((wasSpeaking) => this.talkieSpeaker.stopSpeaking()
                    .then(() => {
                        if (!wasSpeaking) {
                            // NOTE: keeping the root chain separate from this chain.
                            this.rootChain.link(() => this.speakSelectionOnPage());
                        }

                        return undefined;
                    }))
        );
    }

    stopSpeakingAction() {
        return promiseTry(
            () => this.talkieSpeaker.stopSpeaking()
        );
    }

    startSpeakingTextInVoiceAction(text, voice) {
        return promiseTry(
            () => this.talkieSpeaker.stopSpeaking()
                .then(() => {
                    // NOTE: keeping the root chain separate from this chain.
                    this.rootChain.link(() => this.talkieSpeaker.speakTextInVoice(text, voice));

                    return undefined;
                })
        );
    }

    startSpeakingCustomTextDetectLanguage(text) {
        return promiseTry(
            () => canTalkieRunInTab()
                .then((canRun) => {
                    if (canRun) {
                        return detectPageLanguage();
                    }

                    log("startSpeakingCustomTextDetectLanguage", "Did not detect a normal tab, skipping page language detection.");

                    return null;
                })
                .then((detectedPageLanguage) => {
                    const selections = [
                        {
                            text: text,
                            htmlTagLanguage: null,
                            parentElementsLanguages: [],
                        },
                    ];

                    return this.talkieSpeaker.detectLanguagesAndSpeakAllSelections(selections, detectedPageLanguage);
                })
        );
    }

    onTabRemovedHandler(tabId) {
        return this.speakingStatus.isSpeakingTabId(tabId)
            .then((isTabSpeaking) => {
                if (isTabSpeaking) {
                    return this.talkieSpeaker.stopSpeaking()
                        .then(() => this.speakingStatus.setTabIsDoneSpeaking(tabId));
                }

                return undefined;
            });
    }

    onTabUpdatedHandler(tabId, changeInfo) {
        return this.speakingStatus.isSpeakingTabId(tabId)
            .then((isTabSpeaking) => {
                // NOTE: changeInfo only has properties which have changed.
                // https://developer.chrome.com/extensions/tabs#event-onUpdated
                if (isTabSpeaking && changeInfo.url) {
                    return this.talkieSpeaker.stopSpeaking()
                        .then(() => this.speakingStatus.setTabIsDoneSpeaking(tabId));
                }

                return undefined;
            });
    }

    onExtensionSuspendHandler() {
        return promiseTry(
            () => {
                log("Start", "onExtensionSuspendHandler");

                return this.speakingStatus.isSpeaking()
                    .then((talkieIsSpeaking) => {
                        // Clear all text if Talkie was speaking.
                        if (talkieIsSpeaking) {
                            return this.talkieSpeaker.stopSpeaking();
                        }

                        return undefined;
                    })
                    .then(() => {
                        log("Done", "onExtensionSuspendHandler");

                        return undefined;
                    });
            }
        );
    }
}

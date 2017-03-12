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
    getMappedVoices,
} from "../shared/voices";

import {
    getBackgroundPage,
} from "../shared/tabs";

import {
    getStoredValue,
    setStoredValue,
} from "../shared/storage";

import {
    eventToPromise,
    startFrontend,
    stopFrontend,
} from "../frontend/shared-frontend";

import Tabrow from "./tabrow";

import DualLogger from "../frontend/dual-log";

const dualLogger = new DualLogger("options.js");

const initializeTabrow = () => promiseTry(
    () => {
        const optionsTabrow = new Tabrow("options-tabrow");
        optionsTabrow.initialize();
    }
);

const speak = (text, voice) => promiseTry(
    () => {
        return getBackgroundPage()
            .then((background) => background.stopSpeakFromFrontend()
                .then(() => background.startSpeakFromFrontend(text, voice))
            );
    }
);

const loadVoicesAndLanguages = () => promiseTry(
    () => {
        return getMappedVoices()
            .then((allVoices) => {
                // NOTE: assuming the voices are available once the background has loaded.
                // TODO: verify.
                const allVoicesByLanguage = allVoices.reduce((obj, voice) => { obj[voice.lang] = (obj[voice.lang] || []).concat(voice); return obj; }, {});
                const allLanguages = Object.keys(allVoicesByLanguage);
                allLanguages.sort();
                dualLogger.dualLog("loadVoicesAndLanguages", "allVoicesByLanguage", allVoicesByLanguage);

                const allVoicesByLanguageGroup = allVoices.reduce((obj, voice) => { const group = voice.lang.substr(0, 2); obj[group] = (obj[group] || {}); obj[group][voice.lang] = allVoicesByLanguage[voice.lang]; return obj; }, {});
                const allLanguagesGroups = Object.keys(allVoicesByLanguageGroup);
                allLanguagesGroups.sort();
                dualLogger.dualLog("loadVoicesAndLanguages", "allLanguagesGroups", allLanguagesGroups);

                const allVoicesByVoiceName = allVoices.reduce((obj, voice) => { obj[voice.name] = (obj[voice.name] || []).concat(voice); return obj; }, {});
                const allVoiceNames = Object.keys(allVoicesByVoiceName);
                allVoiceNames.sort();
                dualLogger.dualLog("loadVoicesAndLanguages", "allVoicesByLanguageGroup", allVoicesByLanguageGroup);

                const voicesLanguagesListElement = document.getElementById("voices-languages-list");
                const voicesVoicesListElement = document.getElementById("voices-voices-list");
                const voicesSampleTextElement = document.getElementById("voices-sample-text");
                const voicesAvailableLanguagesCount = document.getElementById("voices-available-languages-count");
                const voicesAvailableVoicesCount = document.getElementById("voices-available-voices-count");

                voicesAvailableLanguagesCount.textContent = ` (${allLanguages.length})`;

                const displayVoicesInSelectElement = (selectedVoices) => {
                    Array.from(voicesVoicesListElement.children).forEach((child) => child.remove());

                    selectedVoices.forEach((voice) => {
                        const option = document.createElement("option");
                        option.talkie = {};
                        option.talkie.voiceName = voice.name;
                        option.talkie.voices = [voice];
                        option.textContent = voice.name;

                        voicesVoicesListElement.appendChild(option);
                    });

                    voicesAvailableVoicesCount.textContent = ` (${selectedVoices.length})`;
                };

                displayVoicesInSelectElement(allVoices);

                const speakSelectedVoiceAndText = (selectElement, textElement) => promiseTry(
                    () => {
                        const selectedOption = Array.from(selectElement.querySelectorAll("option")).filter((option) => option.selected === true)[0] || null;

                        const sampleText = textElement.value.trim();

                        if (sampleText.length === 0) {
                            return;
                        }

                        if (selectedOption && selectedOption && selectedOption.talkie && typeof Array.isArray(selectedOption.talkie.voices)) {
                            const voice = selectedOption.talkie.voices[0];

                            return speak(sampleText, voice);
                        }

                        return undefined;
                    }
                );

                const voiceListElementOnChangeHandler = (event) => promiseTry(
                    () => {
                        const selectElement = event.target;

                        return speakSelectedVoiceAndText(selectElement, voicesSampleTextElement);
                    }
                );

                Array.from(voicesLanguagesListElement.children).forEach((child) => child.remove());

                {
                    const allLanguageOption = document.createElement("option");
                    allLanguageOption.talkie = {};
                    allLanguageOption.talkie.language = null;
                    allLanguageOption.talkie.voices = allVoices;

                    allLanguageOption.textContent = chrome.i18n.getMessage("frontend_voicesShowAllVoices");
                    allLanguageOption.selected = true;

                    voicesLanguagesListElement.appendChild(allLanguageOption);
                }

                allLanguagesGroups.forEach((languageGroup) => {
                    const languagesPerGroupKeys = Object.keys(allVoicesByLanguageGroup[languageGroup]);
                    languagesPerGroupKeys.sort();

                    const optgroup = document.createElement("optgroup");

                    if (languagesPerGroupKeys.length > 1) {
                        optgroup.label = `${languageGroup} (${languagesPerGroupKeys.length})`;
                    } else {
                        optgroup.label = languageGroup;
                    }

                    languagesPerGroupKeys.forEach((language) => {
                        const option = document.createElement("option");
                        option.talkie = {};
                        option.talkie.language = language;
                        option.talkie.voices = allVoicesByLanguage[language];

                        if (allVoicesByLanguage[language].length > 1) {
                            option.textContent = `${language} (${allVoicesByLanguage[language].length})`;
                        } else {
                            option.textContent = language;
                        }

                        optgroup.appendChild(option);
                    });

                    voicesLanguagesListElement.appendChild(optgroup);
                });

                const languageListElementOnChangeHandler = (event) => promiseTry(
                    () => {
                        const selectElement = event.target;
                        const selectedOption = Array.from(selectElement.querySelectorAll("option")).filter((option) => option.selected === true)[0] || null;

                        if (selectedOption && selectedOption && selectedOption.talkie && Array.isArray(selectedOption.talkie.voices)) {
                            const voicesForLanguage = selectedOption.talkie.voices;

                            displayVoicesInSelectElement(voicesForLanguage);

                            if (voicesVoicesListElement.children.length > 0) {
                                voicesVoicesListElement.children[0].selected = true;

                                return speakSelectedVoiceAndText(voicesVoicesListElement, voicesSampleTextElement);
                            }
                        } else {
                            displayVoicesInSelectElement(allVoices);
                        }
                    }
                );

                voicesLanguagesListElement.addEventListener("change", eventToPromise.bind(null, languageListElementOnChangeHandler));
                voicesVoicesListElement.addEventListener("change", eventToPromise.bind(null, voiceListElementOnChangeHandler));

                voicesSampleTextElement.addEventListener("focus", () => {
                    voicesSampleTextElement.select();
                });

                return undefined;
            });
    }
);

const loadOptionAndStartListeners = () => promiseTry(
    () => {
        const hideDonationsId = "options-popup-donate-buttons-hide";

        return Promise.resolve()
            .then(() => getStoredValue(hideDonationsId))
            .then((hideDonations) => {
                hideDonations = hideDonations === true;

                const hideDonationsElement = document.getElementById(hideDonationsId);
                hideDonationsElement.checked = hideDonations === true;

                hideDonationsElement.addEventListener("click", () => {
                    return setStoredValue(hideDonationsId, hideDonationsElement.checked === true);
                });

                return undefined;
            });
    }
);

const speakLegalese = () => promiseTry(
    () => {
        const legaleseTextElement = document.getElementById("license-gpl-legalese");

        const legaleseClickHandler = () => promiseTry(
            () => {
                const legaleseText = legaleseTextElement.textContent;
                const legaleseVoice = {
                    name: "Zarvox",
                    lang: "en-US",
                };

                return speak(legaleseText, legaleseVoice);
            }
        );

        legaleseTextElement.addEventListener("click", eventToPromise.bind(null, legaleseClickHandler));
    }
);

const start = () => promiseTry(
    () => {
        dualLogger.dualLog("Start", "start");

        return Promise.resolve()
            .then(() => startFrontend())
            .then(() => initializeTabrow())
            .then(() => loadVoicesAndLanguages())
            .then(() => loadOptionAndStartListeners())
            .then(() => speakLegalese())
            .then(() => {
                dualLogger.dualLog("Done", "start");

                return undefined;
            })
            .catch((error) => {
                dualLogger.dualLogError("Error", "Start", error);
            });
    }
);

const stop = () => promiseTry(
    () => {
        dualLogger.dualLog("Start", "stop");

        return Promise.resolve()
            .then(() => stopFrontend())
            .then(() => {
                dualLogger.dualLog("Done", "stop");

                return undefined;
            })
            .catch((error) => {
                dualLogger.dualLogError("Stop", "Stop", error);
            });
    }
);

document.addEventListener("DOMContentLoaded", eventToPromise.bind(null, start));
window.addEventListener("unload", eventToPromise.bind(null, stop));

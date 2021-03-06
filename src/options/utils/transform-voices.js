/*
This file is part of Talkie -- text-to-speech browser extension button.
<https://joelpurra.com/projects/talkie/>

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

export const getLanguagesFromVoices = (voices) => {
    const languagesAsKeys = voices.reduce(
        (obj, voice) => {
            obj[voice.lang] = (obj[voice.lang] || 0) + 1;

            return obj;
        },
        {}
    );

    const languages = Object.keys(languagesAsKeys);

    languages.sort();

    return languages;
};

export const getLanguageGroupsFromVoices = (voices) => {
    const languageGroupsAsKeys = voices.reduce(
        (obj, voice) => {
            const group = voice.lang.substr(0, 2);
            obj[group] = (obj[group] || 0) + 1;

            return obj;
        },
        {}
      );

    const languageGroups = Object.keys(languageGroupsAsKeys);

    languageGroups.sort();

    return languageGroups;
};

export const getVoicesByLanguageFromVoices = (voices) => {
    const voicesByLanguage = voices.reduce(
        (obj, voice) => {
            obj[voice.lang] = (obj[voice.lang] || []).concat(Object.assign({}, voice));

            return obj;
        },
        {}
      );

    return voicesByLanguage;
};

export const getVoicesByLanguageGroupFromVoices = (voices) => {
    const voicesByLanguageGroup = voices.reduce(
        (obj, voice) => {
            const group = voice.lang.substr(0, 2);
            obj[group] = (obj[group] || []).concat(Object.assign({}, voice));

            return obj;
        },
        {}
      );

    return voicesByLanguageGroup;
};

export const getVoicesByLanguagesByLanguageGroupFromVoices = (voices) => {
    const voicesByLanguage = getVoicesByLanguageFromVoices(voices);

    const languagesByLanguageGroup = voices.reduce(
        (obj, voice) => {
            const group = voice.lang.substr(0, 2);
            obj[group] = (obj[group] || {});
            obj[group][voice.lang] = voicesByLanguage[voice.lang];

            return obj;
        },
        {}
    );

    return languagesByLanguageGroup;
};

export const getLanguagesByLanguageGroupFromVoices = (voices) => {
    const voicesByLanguagesByLanguageGroup = getVoicesByLanguagesByLanguageGroupFromVoices(voices);

    const languageGroups = Object.keys(voicesByLanguagesByLanguageGroup);

    const languagesByLanguageGroup = languageGroups.reduce(
        (obj, group) => {
            const languages = Object.keys(voicesByLanguagesByLanguageGroup[group]);

            obj[group] = languages;

            return obj;
        },
        {}
    );

    Object.keys(languagesByLanguageGroup)
        .forEach((languageGroup) => languagesByLanguageGroup[languageGroup].sort());

    return languagesByLanguageGroup;
};

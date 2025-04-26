// ==UserScript==
// @name           Ziggo GO - Skip Ads
// @name:nl        Ziggo GO - Reclame overslaan
// @namespace      http://tampermonkey.net/
// @version        1.0.0
// @description    Automatically skip ads on Ziggo GO by skipping directly to the end of each ad break.
// @description:nl Spoel automatisch de reclames door op Ziggo GO naar het einde van de reclame.
// @author         JxxIT
// @license        MIT
// @match          *://*.ziggogo.tv/*
// @icon           https://www.google.com/s2/favicons?sz=64&domain=ziggogo.tv
// @grant          none
// ==/UserScript==

(function () {
    'use strict';

    let video = null;
    let adBreaks = [];
    let currentSegment = -1;

    /**
     * Debugging helper to log information to the console.
     */
    function logDebugInfo(message, data) {
        console.groupCollapsed(`DEBUG: ${message}`);
        if (data) console.log(data);
        console.groupEnd();
    }

    /**
     * Vind het segment waarin de huidige tijd zit of het dichtstbijzijnde toekomstige segment.
     */
    function findCurrentSegment() {
        if (!video || adBreaks.length === 0) return;

        const currentTime = video.currentTime * 1000; // Convert to milliseconds
        const previousSegment = currentSegment;

        // Zoek het huidige of eerstvolgende segment
        currentSegment = adBreaks.findIndex(
            (ad) => currentTime >= ad.startTime && currentTime < ad.endTime
        );

        if (currentSegment === -1) {
            currentSegment = adBreaks.findIndex((ad) => currentTime < ad.startTime);
        }

        logDebugInfo("Segment gecontroleerd", {
            currentTime,
            previousSegment,
            currentSegment,
        });
    }

    /**
     * Controleer en spoel door als de gebruiker zich in een advertentieblok bevindt.
     */
    function handleAdSkipping() {
        if (currentSegment < 0 || currentSegment >= adBreaks.length) return;

        const ad = adBreaks[currentSegment];
        const adStart = ad.startTime / 1000; // Convert to seconds
        const adEnd = ad.endTime / 1000;

        if (video.currentTime >= adStart && video.currentTime < adEnd) {
            logDebugInfo(`Advertentie gedetecteerd. Doorspoelen naar ${adEnd}`, { adStart, adEnd });
            video.currentTime = adEnd;
        }
    }

    /**
     * Voeg tijdsupdate- en interactie-evenementen toe om spring- en afspeeltijden te controleren.
     */
    function attachListeners() {
        if (!video.adBypassAttached) {
            video.adBypassAttached = true;

            video.addEventListener("timeupdate", () => {
                findCurrentSegment(); // Controleer in welk segment we zitten
                handleAdSkipping(); // Spoel door indien nodig
            });

            video.addEventListener("seeked", () => {
                logDebugInfo("Gebruiker heeft video gesprongen. Herberekenen segment.");
                findCurrentSegment();
                handleAdSkipping();
            });
        }
    }

    /**
     * Verwerk nieuwe advertentieblokken en stel de video in.
     */
    function handleVideo(newAdBreaks) {
        video = document.querySelector("video");

        if (!video) {
            logDebugInfo("Geen video-element gevonden!");
            return;
        }

        adBreaks = newAdBreaks;
        logDebugInfo("Advertentieblokken ontvangen", adBreaks);

        findCurrentSegment(); // Bereken het juiste segment
        handleAdSkipping(); // Controleer direct de huidige tijd
        attachListeners(); // Voeg eventlisteners toe
    }

    // Override console.info om advertentie-updates te onderscheppen
    const originalConsoleInfo = console.info;
    console.info = function (...args) {
        if (args[2] === "event::adBreaksUpdateEvent") {
            logDebugInfo("Advertentie-update ontvangen", args[3]);
            handleVideo(args[3]?.adBreaks || []);
        } else {
            originalConsoleInfo.apply(console, args);
        }
    };
})();

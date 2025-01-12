// ==UserScript==
// @name         Ziggo GO - Skip Ads
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Automatically skip ads on Ziggo GO by skipping directly to the end of each ad break.
// @author       JxxIT
// @match        *://*.ziggogo.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ziggogo.tv
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let video = null;
    let adBreaks = [];
    let currentSegment = -1;

    function findCurrentSegment() {
        if (!video || adBreaks.length === 0) return;

        const currentTime = video.currentTime * 1000; // Convert to milliseconds

        // Find the current or next segment
        currentSegment = adBreaks.findIndex(
            (ad) => currentTime >= ad.startTime && currentTime < ad.endTime
        );

        if (currentSegment === -1) {
            currentSegment = adBreaks.findIndex((ad) => currentTime < ad.startTime);
        }
    }

    function handleAdSkipping() {
        if (currentSegment < 0 || currentSegment >= adBreaks.length || adBreaks.length >= 10) return;

        const ad = adBreaks[currentSegment];
        const adStart = ad.startTime / 1000; // Convert to seconds
        const adEnd = ad.endTime / 1000;

        if (video.currentTime >= adStart && video.currentTime < adEnd) {
            video.currentTime = adEnd;
        }
    }

    function attachListeners() {
        if (!video.adBypassAttached) {
            video.adBypassAttached = true;

            video.addEventListener("timeupdate", () => {
                findCurrentSegment();
                handleAdSkipping();
            });

            video.addEventListener("seeked", () => {
                findCurrentSegment();
                handleAdSkipping();
            });
        }
    }

    function handleVideo(newAdBreaks) {
        video = document.querySelector("video");

        if (!video) {
            return;
        }

        adBreaks = newAdBreaks;

        if (adBreaks[0].endTime == adBreaks.startTime[1]) {
            return; // Sometimes, Ziggo mistakenly marks the entire video as an ad.
        }

        findCurrentSegment();
        handleAdSkipping();
        attachListeners();
    }

    // Override console.info to intercept ad updates
    const originalConsoleInfo = console.info;
    console.info = function (...args) {
        if (args[2] === "event::adBreaksUpdateEvent") {
            handleVideo(args[3]?.adBreaks || []);
        } else {
            originalConsoleInfo.apply(console, args);
        }
    };
})();

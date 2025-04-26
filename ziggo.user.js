// ==UserScript==
// @name           Ziggo GO - Skip Ads
// @name:nl        Ziggo GO - Reclame overslaan
// @namespace      http://tampermonkey.net/
// @version        1.0.2
// @description    Automatically skip ads on Ziggo GO by skipping directly to the end of each ad break.
// @description:nl Spoel automatisch de reclames door op Ziggo GO naar het einde van de reclame.
// @author         JxxIT
// @license        MIT
// @match          *://*.ziggogo.tv/*
// @icon           https://www.google.com/s2/favicons?sz=64&domain=ziggogo.tv
// @grant          none
// ==/UserScript==

(function () {
  "use strict";

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
   * Find the segment in which the current time is or the nearest future segment.
   */
  function findCurrentSegment() {
    if (!video || adBreaks.length === 0) return;

    const currentTime = video.currentTime * 1000; // Convert to milliseconds
    const previousSegment = currentSegment;

    // Find the current or next segment
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
   * Check and skip if the user is in an advertising block.
   */
  function handleAdSkipping() {
    if (
      currentSegment < 0 ||
      currentSegment >= adBreaks.length
    )
      return;

    const ad = adBreaks[currentSegment];
    const adStart = ad.startTime / 1000; // Convert to seconds
    const adEnd = ad.endTime / 1000;

    if (video.currentTime >= adStart && video.currentTime < adEnd) {
      logDebugInfo(`Advertentie gedetecteerd. Doorspoelen naar ${adEnd}`, {
        adStart,
        adEnd,
      });
      video.currentTime = adEnd;
    }
  }

  /**
   * Add time update and interaction events to check jumping and playing times.
   */
  function attachListeners() {
    if (!video.adBypassAttached) {
      video.adBypassAttached = true;

      video.addEventListener("timeupdate", () => {
        findCurrentSegment(); // Check which segment we are in
        handleAdSkipping(); // Skip if necessary
      });

      video.addEventListener("seeked", () => {
        logDebugInfo("Gebruiker heeft video gesprongen. Herberekenen segment.");
        findCurrentSegment();
        handleAdSkipping();
      });
    }
  }

  /**
   * Process new advertising blocks and set the video.
   */
  function handleVideo(newAdBreaks) {
    video = document.querySelector("video");

    if (!video) {
      logDebugInfo("Geen video-element gevonden!");
      return;
    }

    adBreaks = newAdBreaks;
    if (adBreaks[0].endTime == adBreaks[1].startTime) {
      return; // Sometimes, Ziggo mistakenly marks the entire video as an ad.
    }

    logDebugInfo("Advertentieblokken ontvangen", adBreaks);

    findCurrentSegment(); // Calculate the right segment
    handleAdSkipping(); // Check the current time immediately
    attachListeners(); // Adding Eventlistans
  }

  // Override console.info to intercept advertising updates
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

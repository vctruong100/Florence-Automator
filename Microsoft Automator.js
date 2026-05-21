
// ==UserScript==
// @name Microsoft Automator
// @namespace vinh.msteams.automator
// @version 1.0.0
// @description Attendance tracker for Microsoft Teams meetings
// @match https://teams.microsoft.com/*
// @match https://teams.cloud.microsoft/*
// @run-at document-idle
// @grant none
// ==/UserScript==

(function () {

    // ─── Attendance State ───────────────────────────────────────────────
    let attendanceState = {
        isRunning: false,
        intervalId: null,
        allParticipants: [],          // { name: string, firstSeen: number, pageOrder: number }
        seenNames: new Set(),
        sortMode: 'page',             // 'page' | 'alpha'
        scanCount: 0,
        isScrollScanning: false       // true while a scroll-and-scan pass is in progress
    };

    // ─── GUI / Config Constants ─────────────────────────────────────────
    const MSTEAMS_GUI_ID = 'msteams-gui';
    const MSTEAMS_ROOT_ID = 'msteams-root';
    const MSTEAMS_DATA_ATTR = 'data-msteams-instance';
    let msteamsInitialized = false;
    let msteamsInitDebounceTimer = null;
    let msteamsReparentObserver = null;
    let msteamsNavListenersRegistered = false;
    let msteamsKeybindListenerRegistered = false;

    let guiVisible = localStorage.getItem('msteams-gui-visible') === 'true';
    let guiScale = parseFloat(localStorage.getItem('msteams-gui-scale')) || 1;

    let logMessages = [];

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    let logBoxPendingUpdate = false;
    function addLogMessage(message, type = 'log') {
        const timestamp = new Date().toLocaleTimeString();
        logMessages.push({ timestamp, message, type });
        if (!logBoxPendingUpdate) {
            logBoxPendingUpdate = true;
            requestAnimationFrame(function () {
                logBoxPendingUpdate = false;
                updateLogBox();
            });
        }
    }

    console.log = function (...args) {
        originalLog.apply(console, args);
        addLogMessage(args.join(' '), 'log');
    };

    console.error = function (...args) {
        originalError.apply(console, args);
        addLogMessage(args.join(' '), 'error');
    };

    console.warn = function (...args) {
        originalWarn.apply(console, args);
        addLogMessage(args.join(' '), 'warn');
    };

    // ─── Config Selectors & Labels ──────────────────────────────────────
    const CFG_SELECTORS = {
        configButtonId: 'msteams-gui-config-btn',
        configTooltipAttr: 'title',
        configModalId: 'msteams-gui-config-modal',
        configModalContainer: 'body',
        keyCaptureFieldId: 'msteams-config-key-capture',
        saveBtnId: 'msteams-config-save-btn',
        cancelBtnId: 'msteams-config-cancel-btn'
    };

    const CFG_LABELS = {
        configButtonAria: 'Configuration',
        configTooltip: 'Open Configuration',
        modalTitle: 'Configuration',
        keybindLabel: 'Visibility keybind',
        keybindPlaceholder: 'Press a key\u2026',
        save: 'Save',
        cancel: 'Cancel',
        saved: 'Keybind saved',
        invalidKey: 'This key is not allowed. Choose a different key.',
        captureOn: 'Press a key to set the visibility keybind',
        captureOff: 'Key capture stopped'
    };

    const CFG_STORAGE = {
        key: 'msteams_main_gui_visibility_keybind',
        keyDisplay: 'msteams_main_gui_visibility_keybind_label',
        hideLogs: 'msteams_hide_logs',
        buttonLayout: 'msteams_button_layout'
    };

    const CFG_KEYS = {
        defaultCode: 'F2',
        disallowed: ['F5', 'F11', 'F12', 'Backspace'],
        ignoreWhenEditableSelectors: 'input, textarea, [contenteditable=""], [contenteditable="true"], [role="textbox"]'
    };

    const CFG_TIMEOUTS = {
        waitModalMs: 8000,
        debounceMs: 200
    };

    // ─── Button Definitions ─────────────────────────────────────────────
    const BUTTON_DEFS = [
        { id: 'check-attendance-btn', label: 'Check Attendance', handler: function () { checkAttendanceInit(); } }
    ];

    var cfgState = {
        currentCode: 'F2',
        currentLabel: 'F2',
        globalKeybindHandler: null,
        keybindSuspended: false,
        debounceTimer: null,
        modalOpen: false,
        capturedCode: null,
        capturedLabel: null,
        modalEscHandler: null,
        modalKeyCaptureHandler: null,
        focusReturnElement: null
    };

    // ─── Attendance: Scan for Participants ──────────────────────────────
    function scanParticipants() {
        var elements = document.querySelectorAll('[data-tid^="participantsInCall-"]');
        var newCount = 0;
        elements.forEach(function (el) {
            var tid = el.getAttribute('data-tid');
            if (!tid) return;
            var name = tid.replace('participantsInCall-', '').trim();
            if (!name) return;
            if (!attendanceState.seenNames.has(name.toLowerCase())) {
                attendanceState.seenNames.add(name.toLowerCase());
                attendanceState.allParticipants.push({
                    name: name,
                    firstSeen: Date.now(),
                    pageOrder: attendanceState.allParticipants.length
                });
                newCount++;
                addLogMessage('scanParticipants: new participant found: ' + name, 'log');
            }
        });
        attendanceState.scanCount++;
        if (newCount > 0) {
            addLogMessage('scanParticipants: scan #' + attendanceState.scanCount + ' found ' + newCount + ' new participant(s), total: ' + attendanceState.allParticipants.length, 'log');
            saveAttendanceToStorage();
        }
        return newCount;
    }

    // ─── Attendance: Scroll-and-Scan ────────────────────────────────────
    function getActiveScrollWrapper() {
        var drillIn = document.querySelector('[data-tid="calling-roster-in-call-drill-in-wrapper"]');
        if (drillIn) {
            var drillWrapper = drillIn.querySelector('[data-tid="scrollable-wrapper"]');
            if (drillWrapper) return drillWrapper;
        }
        return document.querySelector('[data-tid="scrollable-wrapper"]');
    }

    function scrollAndScanAll(callback) {
        var scrollWrapper = getActiveScrollWrapper();
        if (!scrollWrapper) {
            var n = scanParticipants();
            if (callback) callback(n);
            return;
        }

        if (attendanceState.isScrollScanning) {
            if (callback) callback(0);
            return;
        }
        attendanceState.isScrollScanning = true;

        var originalScrollTop = scrollWrapper.scrollTop;
        var stepSize = Math.max(Math.floor((scrollWrapper.clientHeight || 300) * 0.75), 150);
        var SETTLE_MS = 450;
        var totalNew = 0;

        scrollWrapper.scrollTop = 0;

        function step() {
            if (!attendanceState.isRunning) {
                scrollWrapper.scrollTop = originalScrollTop;
                attendanceState.isScrollScanning = false;
                if (callback) callback(totalNew);
                return;
            }

            totalNew += scanParticipants();

            var maxScroll = scrollWrapper.scrollHeight - scrollWrapper.clientHeight;
            if (maxScroll <= 0 || scrollWrapper.scrollTop >= maxScroll - 5) {
                scrollWrapper.scrollTop = originalScrollTop;
                attendanceState.isScrollScanning = false;
                if (callback) callback(totalNew);
                return;
            }

            scrollWrapper.scrollTop = Math.min(scrollWrapper.scrollTop + stepSize, maxScroll);
            setTimeout(step, SETTLE_MS);
        }

        setTimeout(step, SETTLE_MS);
    }

    function getSortedParticipants() {
        var list = attendanceState.allParticipants.slice();
        if (attendanceState.sortMode === 'alpha') {
            list.sort(function (a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
        } else {
            list.sort(function (a, b) {
                return a.pageOrder - b.pageOrder;
            });
        }
        return list;
    }

    // ─── Attendance: Name Similarity ─────────────────────────────────────
    function jaroWinkler(s1, s2) {
        s1 = s1.toLowerCase().trim();
        s2 = s2.toLowerCase().trim();
        if (s1 === s2) return 1;
        var len1 = s1.length, len2 = s2.length;
        if (len1 === 0 || len2 === 0) return 0;
        var matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
        var s1Matches = new Array(len1).fill(false);
        var s2Matches = new Array(len2).fill(false);
        var matches = 0;
        for (var i = 0; i < len1; i++) {
            var start = Math.max(0, i - matchDist);
            var end = Math.min(i + matchDist + 1, len2);
            for (var j = start; j < end; j++) {
                if (s2Matches[j] || s1[i] !== s2[j]) continue;
                s1Matches[i] = true;
                s2Matches[j] = true;
                matches++;
                break;
            }
        }
        if (matches === 0) return 0;
        var k = 0, transpositions = 0;
        for (var i = 0; i < len1; i++) {
            if (!s1Matches[i]) continue;
            while (!s2Matches[k]) k++;
            if (s1[i] !== s2[k]) transpositions++;
            k++;
        }
        var jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
        var prefix = 0;
        for (var i = 0; i < Math.min(Math.min(len1, len2), 4); i++) {
            if (s1[i] === s2[i]) prefix++;
            else break;
        }
        return jaro + prefix * 0.1 * (1 - jaro);
    }

    var MANUAL_ADD_SIMILARITY_THRESHOLD = 0.88;

    // ─── Attendance: Manual Add Modal ────────────────────────────────────
    function showManualAddModal() {
        var existing = document.getElementById('msteams-manual-add-modal');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var overlay = document.createElement('div');
        overlay.id = 'msteams-manual-add-modal';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 25000; display: flex; align-items: center; justify-content: center; pointer-events: none;';

        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 0; width: 460px; max-width: 94%; box-shadow: 0 15px 35px rgba(0,0,0,0.4); display: flex; flex-direction: column; max-height: 90vh; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; pointer-events: auto;';

        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); border-radius: 12px 12px 0 0; cursor: move; flex-shrink: 0;';

        var title = document.createElement('h3');
        title.textContent = 'Add Names Manually';
        title.style.cssText = 'margin: 0; color: white; font-size: 16px; font-weight: 600;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2715';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;';
        closeBtn.onmouseover = function () { closeBtn.style.background = 'rgba(255,67,54,0.8)'; };
        closeBtn.onmouseout = function () { closeBtn.style.background = 'rgba(255,255,255,0.2)'; };
        closeBtn.onclick = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };

        header.appendChild(title);
        header.appendChild(closeBtn);

        var body = document.createElement('div');
        body.style.cssText = 'padding: 16px; flex: 1; overflow-y: auto;';

        var instructions = document.createElement('p');
        instructions.textContent = 'Paste or type one name per line. Duplicates will be detected automatically.';
        instructions.style.cssText = 'color: rgba(255,255,255,0.75); font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;';

        var textarea = document.createElement('textarea');
        textarea.placeholder = 'Maria Sanchez\nSaori Taniguchi\nDennice Rojas\n...';
        textarea.style.cssText = 'width: 100%; height: 200px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; font-size: 13px; padding: 10px; box-sizing: border-box; resize: vertical; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; outline: none; line-height: 1.6;';
        textarea.onfocus = function () { textarea.style.borderColor = 'rgba(255,255,255,0.7)'; };
        textarea.onblur = function () { textarea.style.borderColor = 'rgba(255,255,255,0.3)'; };

        body.appendChild(instructions);
        body.appendChild(textarea);

        var footer = document.createElement('div');
        footer.style.cssText = 'padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.1); border-radius: 0 0 12px 12px; display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0;';

        var cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;';
        cancelBtn.onmouseover = function () { cancelBtn.style.background = 'rgba(255,255,255,0.25)'; };
        cancelBtn.onmouseout = function () { cancelBtn.style.background = 'rgba(255,255,255,0.15)'; };
        cancelBtn.onclick = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };

        var confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm';
        confirmBtn.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;';
        confirmBtn.onmouseover = function () { confirmBtn.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)'; };
        confirmBtn.onmouseout = function () { confirmBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'; };
        confirmBtn.onclick = function () { processManualNames(textarea.value, overlay); };

        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);

        container.appendChild(header);
        container.appendChild(body);
        container.appendChild(footer);
        overlay.appendChild(container);

        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        overlay.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);

        document.body.appendChild(overlay);
        setTimeout(function () { textarea.focus(); }, 50);

        var escHandler = function (e) {
            if (e.key === 'Escape' && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                document.removeEventListener('keydown', escHandler, true);
            }
        };
        document.addEventListener('keydown', escHandler, true);
    }

    function processManualNames(rawInput, inputOverlay) {
        var lines = rawInput.split('\n');
        var inputNames = [];
        for (var i = 0; i < lines.length; i++) {
            var n = lines[i].trim();
            if (n) inputNames.push(n);
        }
        if (inputNames.length === 0) {
            addLogMessage('processManualNames: no names entered', 'warn');
            return;
        }

        var duplicates = [];
        var toAdd = [];
        var seenInInput = [];

        for (var i = 0; i < inputNames.length; i++) {
            var name = inputNames[i];
            var nameLower = name.toLowerCase();
            var isDuplicate = false;
            var matchedWith = null;

            for (var j = 0; j < attendanceState.allParticipants.length; j++) {
                var sim = jaroWinkler(nameLower, attendanceState.allParticipants[j].name.toLowerCase());
                if (sim >= MANUAL_ADD_SIMILARITY_THRESHOLD) {
                    isDuplicate = true;
                    matchedWith = attendanceState.allParticipants[j].name;
                    break;
                }
            }

            if (!isDuplicate) {
                for (var k = 0; k < seenInInput.length; k++) {
                    var sim2 = jaroWinkler(nameLower, seenInInput[k].toLowerCase());
                    if (sim2 >= MANUAL_ADD_SIMILARITY_THRESHOLD) {
                        isDuplicate = true;
                        matchedWith = seenInInput[k] + ' (same input list)';
                        break;
                    }
                }
            }

            if (isDuplicate) {
                duplicates.push({ input: name, matchedWith: matchedWith });
                addLogMessage('processManualNames: duplicate skipped: "' + name + '" matches "' + matchedWith + '"', 'warn');
            } else {
                toAdd.push(name);
                seenInInput.push(name);
            }
        }

        for (var i = 0; i < toAdd.length; i++) {
            var newName = toAdd[i];
            if (!attendanceState.seenNames.has(newName.toLowerCase())) {
                attendanceState.seenNames.add(newName.toLowerCase());
                attendanceState.allParticipants.push({
                    name: newName,
                    firstSeen: Date.now(),
                    pageOrder: attendanceState.allParticipants.length
                });
            }
        }

        if (toAdd.length > 0) {
            refreshAttendanceList();
            updateAttendanceCount();
            saveAttendanceToStorage();
        }
        addLogMessage('processManualNames: added ' + toAdd.length + ' names, skipped ' + duplicates.length + ' duplicates', 'log');

        if (inputOverlay && inputOverlay.parentNode) inputOverlay.parentNode.removeChild(inputOverlay);
        showManualAddResults(toAdd, duplicates);
    }

    function showManualAddResults(added, duplicates) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 25000; display: flex; align-items: center; justify-content: center; pointer-events: none;';

        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 0; width: 460px; max-width: 94%; box-shadow: 0 15px 35px rgba(0,0,0,0.4); display: flex; flex-direction: column; max-height: 85vh; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; pointer-events: auto;';

        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); border-radius: 12px 12px 0 0; cursor: move; flex-shrink: 0;';

        var title = document.createElement('h3');
        title.textContent = 'Add Names \u2014 Results';
        title.style.cssText = 'margin: 0; color: white; font-size: 16px; font-weight: 600;';

        var closeBtn2 = document.createElement('button');
        closeBtn2.textContent = '\u2715';
        closeBtn2.style.cssText = 'background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;';
        closeBtn2.onmouseover = function () { closeBtn2.style.background = 'rgba(255,67,54,0.8)'; };
        closeBtn2.onmouseout = function () { closeBtn2.style.background = 'rgba(255,255,255,0.2)'; };
        closeBtn2.onclick = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };

        header.appendChild(title);
        header.appendChild(closeBtn2);

        var body2 = document.createElement('div');
        body2.style.cssText = 'padding: 16px; flex: 1; overflow-y: auto;';

        var addedSummary = document.createElement('div');
        addedSummary.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(40,167,69,0.25); border: 1px solid rgba(40,167,69,0.5); border-radius: 8px; margin-bottom: 12px;';
        var addedIcon = document.createElement('span');
        addedIcon.textContent = added.length > 0 ? '\u2713' : '\u2014';
        addedIcon.style.cssText = 'color: #6bcf7f; font-size: 16px; font-weight: 700; flex-shrink: 0;';
        var addedText = document.createElement('span');
        addedText.textContent = added.length + ' name' + (added.length !== 1 ? 's' : '') + ' added to attendance.';
        addedText.style.cssText = 'color: white; font-size: 13px;';
        addedSummary.appendChild(addedIcon);
        addedSummary.appendChild(addedText);
        body2.appendChild(addedSummary);

        if (duplicates.length > 0) {
            var dupHeader = document.createElement('div');
            dupHeader.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-bottom: 8px;';
            var dupIcon = document.createElement('span');
            dupIcon.textContent = '\u26A0';
            dupIcon.style.cssText = 'color: #ffd93d; font-size: 14px;';
            var dupTitle = document.createElement('span');
            dupTitle.textContent = duplicates.length + ' duplicate' + (duplicates.length !== 1 ? 's' : '') + ' skipped:';
            dupTitle.style.cssText = 'color: #ffd93d; font-size: 13px; font-weight: 600;';
            dupHeader.appendChild(dupIcon);
            dupHeader.appendChild(dupTitle);
            body2.appendChild(dupHeader);

            var dupList = document.createElement('div');
            dupList.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
            for (var i = 0; i < duplicates.length; i++) {
                var dupRow = document.createElement('div');
                dupRow.style.cssText = 'padding: 7px 10px; background: rgba(255,217,61,0.1); border: 1px solid rgba(255,217,61,0.3); border-radius: 6px; font-size: 12px; display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px;';
                var dupInput = document.createElement('span');
                dupInput.textContent = '\u201C' + duplicates[i].input + '\u201D';
                dupInput.style.cssText = 'color: white; font-weight: 500;';
                var dupArrow = document.createElement('span');
                dupArrow.textContent = '\u2192 matches';
                dupArrow.style.cssText = 'color: rgba(255,255,255,0.5);';
                var dupMatch = document.createElement('span');
                dupMatch.textContent = '\u201C' + duplicates[i].matchedWith + '\u201D';
                dupMatch.style.cssText = 'color: #ffd93d; font-weight: 500;';
                dupRow.appendChild(dupInput);
                dupRow.appendChild(dupArrow);
                dupRow.appendChild(dupMatch);
                dupList.appendChild(dupRow);
            }
            body2.appendChild(dupList);
        }

        var footer2 = document.createElement('div');
        footer2.style.cssText = 'padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.1); border-radius: 0 0 12px 12px; display: flex; justify-content: flex-end; flex-shrink: 0;';

        var okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.style.cssText = 'background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 7px 20px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;';
        okBtn.onmouseover = function () { okBtn.style.background = 'rgba(255,255,255,0.3)'; };
        okBtn.onmouseout = function () { okBtn.style.background = 'rgba(255,255,255,0.2)'; };
        okBtn.onclick = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };

        footer2.appendChild(okBtn);
        container.appendChild(header);
        container.appendChild(body2);
        container.appendChild(footer2);
        overlay.appendChild(container);

        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        overlay.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);

        document.body.appendChild(overlay);
        okBtn.focus();
    }

    // ─── Attendance: XLSX Export (OOXML ZIP) ────────────────────────────
    function xlsxCrc32(data) {
        var table = [];
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) { c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
            table[n] = c;
        }
        var crc = 0xFFFFFFFF;
        for (var i = 0; i < data.length; i++) { crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8); }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function xlsxBuildZip(files) {
        function w16(b, p, v) { b[p] = v & 0xFF; b[p + 1] = (v >>> 8) & 0xFF; }
        function w32(b, p, v) { b[p] = v & 0xFF; b[p + 1] = (v >>> 8) & 0xFF; b[p + 2] = (v >>> 16) & 0xFF; b[p + 3] = (v >>> 24) & 0xFF; }
        var totalLocal = 0, totalCentral = 0;
        for (var i = 0; i < files.length; i++) {
            totalLocal += 30 + files[i].nameBytes.length + files[i].data.length;
            totalCentral += 46 + files[i].nameBytes.length;
        }
        var buf = new Uint8Array(totalLocal + totalCentral + 22);
        var pos = 0, offsets = [];
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            offsets.push(pos);
            w32(buf, pos, 0x04034b50); pos += 4;
            w16(buf, pos, 20); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w32(buf, pos, f.crc); pos += 4;
            w32(buf, pos, f.data.length); pos += 4;
            w32(buf, pos, f.data.length); pos += 4;
            w16(buf, pos, f.nameBytes.length); pos += 2;
            w16(buf, pos, 0); pos += 2;
            buf.set(f.nameBytes, pos); pos += f.nameBytes.length;
            buf.set(f.data, pos); pos += f.data.length;
        }
        var cdStart = pos;
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            w32(buf, pos, 0x02014b50); pos += 4;
            w16(buf, pos, 20); pos += 2;
            w16(buf, pos, 20); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w32(buf, pos, f.crc); pos += 4;
            w32(buf, pos, f.data.length); pos += 4;
            w32(buf, pos, f.data.length); pos += 4;
            w16(buf, pos, f.nameBytes.length); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w16(buf, pos, 0); pos += 2;
            w32(buf, pos, 0); pos += 4;
            w32(buf, pos, offsets[i]); pos += 4;
            buf.set(f.nameBytes, pos); pos += f.nameBytes.length;
        }
        var cdEnd = pos;
        w32(buf, pos, 0x06054b50); pos += 4;
        w16(buf, pos, 0); pos += 2;
        w16(buf, pos, 0); pos += 2;
        w16(buf, pos, files.length); pos += 2;
        w16(buf, pos, files.length); pos += 2;
        w32(buf, pos, cdEnd - cdStart); pos += 4;
        w32(buf, pos, cdStart); pos += 4;
        w16(buf, pos, 0);
        return buf;
    }

    function generateXLSX(participants) {
        var enc = new TextEncoder();
        var strings = ['#', 'Name'];
        for (var i = 0; i < participants.length; i++) { strings.push(participants[i].name); }
        function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

        var ssXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + strings.length + '" uniqueCount="' + strings.length + '">';
        for (var i = 0; i < strings.length; i++) { ssXml += '<si><t>' + esc(strings[i]) + '</t></si>'; }
        ssXml += '</sst>';

        var sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="2" width="35" customWidth="1"/></cols>' +
            '<sheetData>' +
            '<row r="1"><c r="A1" t="s" s="1"><v>0</v></c><c r="B1" t="s" s="1"><v>1</v></c></row>';
        for (var i = 0; i < participants.length; i++) {
            var r = i + 2;
            sheetXml += '<row r="' + r + '"><c r="A' + r + '"><v>' + (i + 1) + '</v></c><c r="B' + r + '" t="s"><v>' + (i + 2) + '</v></c></row>';
        }
        sheetXml += '</sheetData></worksheet>';

        var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
            '</Types>';

        var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
            '</Relationships>';

        var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<sheets><sheet name="Attendance" sheetId="1" r:id="rId1"/></sheets>' +
            '</workbook>';

        var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
            '</Relationships>';

        var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
            '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
            '<fill><patternFill patternType="solid"><fgColor rgb="FF667EEA"/></patternFill></fill></fills>' +
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
            '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
            '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
            '</styleSheet>';

        var fileList = [
            { name: '[Content_Types].xml', content: contentTypes },
            { name: '_rels/.rels', content: rels },
            { name: 'xl/workbook.xml', content: workbook },
            { name: 'xl/_rels/workbook.xml.rels', content: wbRels },
            { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
            { name: 'xl/styles.xml', content: styles },
            { name: 'xl/sharedStrings.xml', content: ssXml }
        ];
        var zipEntries = [];
        for (var i = 0; i < fileList.length; i++) {
            var nb = enc.encode(fileList[i].name);
            var db = enc.encode(fileList[i].content);
            zipEntries.push({ nameBytes: nb, data: db, crc: xlsxCrc32(db) });
        }
        return xlsxBuildZip(zipEntries);
    }

    function exportAttendanceToXLSX() {
        var sorted = getSortedParticipants();
        if (sorted.length === 0) {
            addLogMessage('exportAttendanceToXLSX: no participants to export', 'warn');
            return;
        }
        var xlsxData = generateXLSX(sorted);
        var blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var now = new Date();
        var dateStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + '-' +
            String(now.getMinutes()).padStart(2, '0');
        a.href = url;
        a.download = 'Attendance_' + dateStr + '.xlsx';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        addLogMessage('exportAttendanceToXLSX: exported ' + sorted.length + ' participants', 'log');
    }

    // ─── Attendance: Check Attendance Init ──────────────────────────────
    function checkAttendanceInit() {
        addLogMessage('checkAttendanceInit: starting attendance check', 'log');
        attendanceState.isRunning = true;
        var hadSaved = loadAttendanceFromStorage();
        if (!hadSaved) {
            attendanceState.allParticipants = [];
            attendanceState.seenNames = new Set();
        }
        attendanceState.scanCount = 0;
        attendanceState.sortMode = 'page';

        scanParticipants();
        showAttendancePanel();

        if (attendanceState.intervalId) {
            clearInterval(attendanceState.intervalId);
        }
        attendanceState.intervalId = setInterval(function () {
            if (!attendanceState.isRunning) return;
            scrollAndScanAll(function (newCount) {
                if (newCount > 0) {
                    refreshAttendanceList();
                    updateAttendanceCount();
                } else {
                    var infoEl = document.getElementById('attendance-scan-info');
                    if (infoEl) infoEl.textContent = 'Scans: ' + attendanceState.scanCount;
                }
            });
        }, 5000);
        addLogMessage('checkAttendanceInit: auto-scan with scroll started (every 5s)', 'log');
    }

    function stopAttendance() {
        addLogMessage('stopAttendance: stopping attendance check', 'log');
        attendanceState.isRunning = false;
        if (attendanceState.intervalId) {
            clearInterval(attendanceState.intervalId);
            attendanceState.intervalId = null;
        }
    }

    // ─── Attendance: Persistence ───────────────────────────────────────
    var ATTENDANCE_STORAGE_KEY = 'msteams-attendance-participants';

    function saveAttendanceToStorage() {
        try {
            localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceState.allParticipants));
        } catch (e) {
            addLogMessage('saveAttendanceToStorage: failed: ' + e, 'error');
        }
    }

    function loadAttendanceFromStorage() {
        try {
            var raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
            if (!raw) return false;
            var saved = JSON.parse(raw);
            if (!Array.isArray(saved) || saved.length === 0) return false;
            attendanceState.allParticipants = saved;
            attendanceState.seenNames = new Set();
            for (var i = 0; i < saved.length; i++) {
                attendanceState.seenNames.add(saved[i].name.toLowerCase());
            }
            addLogMessage('loadAttendanceFromStorage: restored ' + saved.length + ' participant(s)', 'log');
            return true;
        } catch (e) {
            addLogMessage('loadAttendanceFromStorage: failed: ' + e, 'error');
            return false;
        }
    }

    function clearAttendance() {
        attendanceState.allParticipants = [];
        attendanceState.seenNames = new Set();
        attendanceState.scanCount = 0;
        localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
        refreshAttendanceList();
        updateAttendanceCount();
        refreshComparisonPanel();
        addLogMessage('clearAttendance: attendance list cleared', 'log');
    }

    function showClearAllWarning() {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 25000; display: flex; align-items: center; justify-content: center; pointer-events: none;';

        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 12px; padding: 0; width: 380px; max-width: 94%; box-shadow: 0 15px 35px rgba(0,0,0,0.4); display: flex; flex-direction: column; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; pointer-events: auto;';

        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); border-radius: 12px 12px 0 0; cursor: move; flex-shrink: 0;';

        var title = document.createElement('h3');
        title.textContent = 'Clear All Attendance';
        title.style.cssText = 'margin: 0; color: white; font-size: 15px; font-weight: 600;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2715';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;';
        closeBtn.onmouseover = function () { closeBtn.style.background = 'rgba(255,255,255,0.35)'; };
        closeBtn.onmouseout = function () { closeBtn.style.background = 'rgba(255,255,255,0.2)'; };
        closeBtn.onclick = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };

        header.appendChild(title);
        header.appendChild(closeBtn);

        var body = document.createElement('div');
        body.style.cssText = 'padding: 20px 16px;';

        var msg = document.createElement('p');
        msg.textContent = 'This will permanently clear the entire attendance list, including saved data. This cannot be undone.';
        msg.style.cssText = 'color: rgba(255,255,255,0.9); margin: 0; font-size: 13px; line-height: 1.6;';
        body.appendChild(msg);

        var warnFooter = document.createElement('div');
        warnFooter.style.cssText = 'padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.1); border-radius: 0 0 12px 12px; display: flex; justify-content: flex-end; gap: 8px;';

        var noBtn = document.createElement('button');
        noBtn.textContent = 'No, Keep List';
        noBtn.style.cssText = 'background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;';
        noBtn.onmouseover = function () { noBtn.style.background = 'rgba(255,255,255,0.25)'; };
        noBtn.onmouseout = function () { noBtn.style.background = 'rgba(255,255,255,0.15)'; };
        noBtn.onclick = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };

        var yesBtn = document.createElement('button');
        yesBtn.textContent = 'Yes, Clear All';
        yesBtn.style.cssText = 'background: rgba(180,20,30,0.9); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;';
        yesBtn.onmouseover = function () { yesBtn.style.background = 'rgba(180,20,30,1)'; };
        yesBtn.onmouseout = function () { yesBtn.style.background = 'rgba(180,20,30,0.9)'; };
        yesBtn.onclick = function () {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            clearAttendance();
        };

        warnFooter.appendChild(noBtn);
        warnFooter.appendChild(yesBtn);
        container.appendChild(header);
        container.appendChild(body);
        container.appendChild(warnFooter);
        overlay.appendChild(container);

        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        overlay.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);

        document.body.appendChild(overlay);
        noBtn.focus();

        var escHandler = function (e) {
            if (e.key === 'Escape' && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                document.removeEventListener('keydown', escHandler, true);
            }
        };
        document.addEventListener('keydown', escHandler, true);
    }

    // ─── Attendance: Comparison State + Panels ───────────────────────────────
    var comparisonState = {
        inputNames: [],
        active: false,
        searchQuery: '',
        rawInput: ''
    };

    function normalizeForComparison(name) {
        return name.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function buildInputPanel() {
        var wrapper = document.getElementById('msteams-attendance-wrapper');
        if (!wrapper || document.getElementById('msteams-input-panel')) return;
        var panel = document.createElement('div');
        panel.id = 'msteams-input-panel';
        panel.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; width: 280px; flex-shrink: 0; display: flex; flex-direction: column; max-height: 85vh; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; pointer-events: auto; box-shadow: 0 15px 35px rgba(0,0,0,0.3);';
        var ipHeader = document.createElement('div');
        ipHeader.style.cssText = 'display: flex; align-items: center; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); border-radius: 12px 12px 0 0; flex-shrink: 0;';
        var ipTitle = document.createElement('h3');
        ipTitle.textContent = 'Roster Input';
        ipTitle.style.cssText = 'margin: 0; color: white; font-size: 15px; font-weight: 600; letter-spacing: 0.2px;';
        ipHeader.appendChild(ipTitle);
        var ipBody = document.createElement('div');
        ipBody.style.cssText = 'padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; overflow: hidden;';
        var ipInstructions = document.createElement('p');
        ipInstructions.textContent = 'Paste your roster below, one name per line, then press Confirm to compare against live attendance.';
        ipInstructions.style.cssText = 'color: rgba(255,255,255,0.6); font-size: 11px; margin: 0; line-height: 1.5;';
        var textarea = document.createElement('textarea');
        textarea.id = 'msteams-roster-textarea';
        textarea.placeholder = 'Maria Sanchez\nSaori Taniguchi\n...';
        textarea.style.cssText = 'flex: 1; min-height: 180px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.25); border-radius: 8px; color: white; font-size: 12px; padding: 10px; box-sizing: border-box; resize: vertical; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; outline: none; line-height: 1.6;';
        textarea.onfocus = function () { textarea.style.borderColor = 'rgba(255,255,255,0.65)'; };
        textarea.onblur = function () { textarea.style.borderColor = 'rgba(255,255,255,0.25)'; };
        if (comparisonState.rawInput) { textarea.value = comparisonState.rawInput; }
        ipBody.appendChild(ipInstructions);
        ipBody.appendChild(textarea);
        var ipFooter = document.createElement('div');
        ipFooter.style.cssText = 'padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.1); border-radius: 0 0 12px 12px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;';
        var inputCount = document.createElement('span');
        inputCount.id = 'msteams-roster-count';
        inputCount.style.cssText = 'color: rgba(255,255,255,0.4); font-size: 11px;';
        if (comparisonState.rawInput) {
            var priorLines = comparisonState.rawInput.split('\n').filter(function (l) { return l.trim(); });
            inputCount.textContent = priorLines.length + ' name(s)';
        }
        textarea.addEventListener('input', function () {
            var ls = textarea.value.split('\n').filter(function (l) { return l.trim(); });
            inputCount.textContent = ls.length ? ls.length + ' name(s)' : '';
        });
        var confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm';
        confirmBtn.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;';
        confirmBtn.onmouseover = function () { confirmBtn.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)'; };
        confirmBtn.onmouseout = function () { confirmBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'; };
        confirmBtn.onclick = function () { processComparisonInput(textarea.value); };
        ipFooter.appendChild(inputCount);
        ipFooter.appendChild(confirmBtn);
        panel.appendChild(ipHeader);
        panel.appendChild(ipBody);
        panel.appendChild(ipFooter);
        wrapper.appendChild(panel);
    }

    function processComparisonInput(rawInput) {
        var lines = rawInput.split('\n');
        var seen = new Set();
        var inputNames = [];
        for (var i = 0; i < lines.length; i++) {
            var raw = lines[i].trim();
            if (!raw) continue;
            var norm = normalizeForComparison(raw);
            if (!seen.has(norm)) { seen.add(norm); inputNames.push({ display: raw, normalized: norm }); }
        }
        comparisonState.inputNames = inputNames;
        comparisonState.active = true;
        comparisonState.rawInput = rawInput;
        comparisonState.searchQuery = '';
        var searchEl = document.getElementById('msteams-comparison-search');
        if (searchEl) searchEl.value = '';
        var countEl = document.getElementById('msteams-roster-count');
        if (countEl) countEl.textContent = inputNames.length + ' name(s)';
        addLogMessage('processComparisonInput: ' + inputNames.length + ' unique name(s)', 'log');
        buildComparisonPanel();
        refreshComparisonPanel();
    }

    function buildComparisonPanel() {
        var wrapper = document.getElementById('msteams-attendance-wrapper');
        if (!wrapper) return;
        var existing = document.getElementById('msteams-comparison-panel');
        if (existing) { existing.style.display = 'flex'; return; }
        var panel = document.createElement('div');
        panel.id = 'msteams-comparison-panel';
        panel.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; width: 320px; flex-shrink: 0; display: flex; flex-direction: column; max-height: 85vh; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; pointer-events: auto; box-shadow: 0 15px 35px rgba(0,0,0,0.3);';
        var cpHeader = document.createElement('div');
        cpHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); border-radius: 12px 12px 0 0; flex-shrink: 0;';
        var cpTitle = document.createElement('h3');
        cpTitle.textContent = 'Roster Comparison';
        cpTitle.style.cssText = 'margin: 0; color: white; font-size: 15px; font-weight: 600; letter-spacing: 0.2px; white-space: nowrap;';
        var statsLabel = document.createElement('span');
        statsLabel.id = 'msteams-comparison-stats';
        statsLabel.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 11px; margin-left: 8px; flex-shrink: 0;';
        cpHeader.appendChild(cpTitle);
        cpHeader.appendChild(statsLabel);
        var searchBar = document.createElement('div');
        searchBar.style.cssText = 'padding: 8px 16px; background: rgba(0,0,0,0.1); flex-shrink: 0;';
        var searchInput = document.createElement('input');
        searchInput.id = 'msteams-comparison-search';
        searchInput.type = 'text';
        searchInput.placeholder = 'Search names…';
        searchInput.style.cssText = 'width: 100%; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; font-size: 12px; padding: 6px 10px; box-sizing: border-box; outline: none; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;';
        searchInput.onfocus = function () { searchInput.style.borderColor = 'rgba(255,255,255,0.55)'; };
        searchInput.onblur = function () { searchInput.style.borderColor = 'rgba(255,255,255,0.2)'; };
        searchInput.addEventListener('input', function () {
            comparisonState.searchQuery = searchInput.value.toLowerCase().trim();
            refreshComparisonPanel();
        });
        searchBar.appendChild(searchInput);
        var cpList = document.createElement('div');
        cpList.id = 'msteams-comparison-list';
        cpList.style.cssText = 'flex: 1; overflow-y: auto; padding: 8px 14px;';
        panel.appendChild(cpHeader);
        panel.appendChild(searchBar);
        panel.appendChild(cpList);
        wrapper.appendChild(panel);
    }

    function refreshComparisonPanel() {
        var listEl = document.getElementById('msteams-comparison-list');
        if (!listEl || !comparisonState.active) return;
        var attendanceNormSet = new Set();
        for (var i = 0; i < attendanceState.allParticipants.length; i++) {
            attendanceNormSet.add(normalizeForComparison(attendanceState.allParticipants[i].name));
        }
        var inputNormSet = new Set();
        for (var i = 0; i < comparisonState.inputNames.length; i++) {
            inputNormSet.add(comparisonState.inputNames[i].normalized);
        }
        var seenAO = new Set();
        var attendanceOnly = [];
        for (var i = 0; i < attendanceState.allParticipants.length; i++) {
            var n = normalizeForComparison(attendanceState.allParticipants[i].name);
            if (!inputNormSet.has(n) && !seenAO.has(n)) {
                seenAO.add(n);
                attendanceOnly.push({ display: attendanceState.allParticipants[i].name, normalized: n });
            }
        }
        var matchCount = 0;
        for (var i = 0; i < comparisonState.inputNames.length; i++) {
            if (attendanceNormSet.has(comparisonState.inputNames[i].normalized)) matchCount++;
        }
        var statsEl = document.getElementById('msteams-comparison-stats');
        if (statsEl) statsEl.textContent = matchCount + '⁄' + comparisonState.inputNames.length + ' present';
        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
        var query = comparisonState.searchQuery || '';
        var hasVisible = false;
        if (comparisonState.inputNames.length > 0) {
            var lbl1 = document.createElement('div');
            lbl1.textContent = 'Roster (' + comparisonState.inputNames.length + ')';
            lbl1.style.cssText = 'color: rgba(255,255,255,0.42); font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 4px 2px 6px;';
            listEl.appendChild(lbl1);
        }
        for (var i = 0; i < comparisonState.inputNames.length; i++) {
            var item = comparisonState.inputNames[i];
            var present = attendanceNormSet.has(item.normalized);
            if (query && item.display.toLowerCase().indexOf(query) === -1) continue;
            hasVisible = true;
            var row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 6px; background: rgba(255,255,255,0.05); margin-bottom: 2px;';
            row.onmouseover = function () { this.style.background = 'rgba(255,255,255,0.11)'; };
            row.onmouseout = function () { this.style.background = 'rgba(255,255,255,0.05)'; };
            var icon = document.createElement('span');
            icon.textContent = present ? '' : '';
            icon.style.cssText = 'font-size: 12px; flex-shrink: 0; width: 16px; text-align: center; color: ' + (present ? '#6bcf7f' : 'rgba(255,255,255,0.28)') + ';';
            var nameSpan = document.createElement('span');
            nameSpan.textContent = item.display;
            nameSpan.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: text; font-size: 12px; font-weight: ' + (present ? '500' : '400') + '; color: ' + (present ? 'white' : 'rgba(255,255,255,0.42)') + ';';
            row.appendChild(icon);
            row.appendChild(nameSpan);
            listEl.appendChild(row);
        }
        if (attendanceOnly.length > 0) {
            var sep = document.createElement('div');
            sep.style.cssText = 'border-top: 1px solid rgba(255,255,255,0.13); margin: 8px 0 4px;';
            listEl.appendChild(sep);
            var lbl2 = document.createElement('div');
            lbl2.textContent = 'Attendance Only (' + attendanceOnly.length + ')';
            lbl2.style.cssText = 'color: rgba(255,165,70,0.7); font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 0 2px 6px;';
            listEl.appendChild(lbl2);
            for (var i = 0; i < attendanceOnly.length; i++) {
                var item2 = attendanceOnly[i];
                if (query && item2.display.toLowerCase().indexOf(query) === -1) continue;
                hasVisible = true;
                var row2 = document.createElement('div');
                row2.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 6px; background: rgba(255,140,35,0.08); border-left: 2px solid rgba(255,140,35,0.3); margin-bottom: 2px;';
                row2.onmouseover = function () { this.style.background = 'rgba(255,140,35,0.15)'; };
                row2.onmouseout = function () { this.style.background = 'rgba(255,140,35,0.08)'; };
                var icon2 = document.createElement('span');
                icon2.textContent = '';
                icon2.style.cssText = 'font-size: 7px; flex-shrink: 0; width: 16px; text-align: center; color: rgba(255,140,35,0.55);';
                var nameSpan2 = document.createElement('span');
                nameSpan2.textContent = item2.display;
                nameSpan2.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: text; font-size: 12px; font-weight: 400; color: rgba(255,190,120,0.85);';
                row2.appendChild(icon2);
                row2.appendChild(nameSpan2);
                listEl.appendChild(row2);
            }
        }
        if (query && !hasVisible) {
            var noRes = document.createElement('div');
            noRes.textContent = 'No names match “' + query + '”';
            noRes.style.cssText = 'color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; padding: 28px 0; font-style: italic;';
            listEl.appendChild(noRes);
        } else if (!query && comparisonState.inputNames.length === 0 && attendanceOnly.length === 0) {
            var emptyNote = document.createElement('div');
            emptyNote.textContent = 'No names to compare yet.';
            emptyNote.style.cssText = 'color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; padding: 28px 0; font-style: italic;';
            listEl.appendChild(emptyNote);
        }
    }

    // ─── Attendance: Panel UI ─────────────────────────────────────────
    function showAttendancePanel() {
        addLogMessage('showAttendancePanel: creating attendance panel', 'log');

        var existingWrapper = document.getElementById('msteams-attendance-wrapper');
        if (existingWrapper && existingWrapper.parentNode) {
            existingWrapper.parentNode.removeChild(existingWrapper);
        }

        var wrapper = document.createElement('div');
        wrapper.id = 'msteams-attendance-wrapper';
        wrapper.style.cssText = 'position: fixed; display: flex; flex-direction: row; align-items: flex-start; gap: 8px; z-index: 20000; pointer-events: none;';

        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 0; width: 500px; flex-shrink: 0; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); display: flex; flex-direction: column; max-height: 85vh; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'attendance-panel-title');

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.1); border-radius: 12px 12px 0 0; flex-shrink: 0; cursor: move;';

        var title = document.createElement('h3');
        title.id = 'attendance-panel-title';
        title.textContent = 'Meeting Attendance';
        title.style.cssText = 'margin: 0; color: white; font-size: 16px; font-weight: 600; letter-spacing: 0.2px;';

        var closeButton = document.createElement('button');
        closeButton.textContent = '\u2715';
        closeButton.setAttribute('aria-label', 'Close attendance panel');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function () { closeButton.style.background = 'rgba(255, 67, 54, 0.8)'; };
        closeButton.onmouseout = function () { closeButton.style.background = 'rgba(255, 255, 255, 0.2)'; };
        closeButton.onclick = function () {
            addLogMessage('showAttendancePanel: hidden by user (scanning continues)', 'log');
            var wr = document.getElementById('msteams-attendance-wrapper');
            if (wr) wr.style.display = 'none';
        };

        var titleRow = document.createElement('div');
        titleRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        titleRow.appendChild(title);
        var f4Badge = document.createElement('span');
        f4Badge.textContent = 'F4';
        f4Badge.title = 'Press F4 to hide or show this panel';
        f4Badge.style.cssText = 'background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 600; padding: 2px 5px; border-radius: 3px; font-family: monospace; user-select: none; cursor: default; flex-shrink: 0;';
        titleRow.appendChild(f4Badge);
        header.appendChild(titleRow);
        header.appendChild(closeButton);

        // Toolbar (count + sort + export)
        var toolbar = document.createElement('div');
        toolbar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: rgba(0, 0, 0, 0.15); flex-shrink: 0; gap: 8px; flex-wrap: wrap;';

        var countLabel = document.createElement('span');
        countLabel.id = 'attendance-count-label';
        countLabel.textContent = 'Participants: ' + attendanceState.allParticipants.length;
        countLabel.style.cssText = 'color: #a8d8ff; font-size: 13px; font-weight: 600;';

        var scanIndicator = document.createElement('span');
        scanIndicator.id = 'attendance-scan-indicator';
        scanIndicator.textContent = '\u25CF Scanning';
        scanIndicator.style.cssText = 'color: #6bcf7f; font-size: 11px; font-weight: 500; animation: msteamsPulse 2s infinite;';

        var styleTag = document.createElement('style');
        styleTag.textContent = '@keyframes msteamsPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }';
        document.head.appendChild(styleTag);

        var leftToolbar = document.createElement('div');
        leftToolbar.style.cssText = 'display: flex; align-items: center; gap: 10px;';
        leftToolbar.appendChild(countLabel);
        leftToolbar.appendChild(scanIndicator);

        var rightToolbar = document.createElement('div');
        rightToolbar.style.cssText = 'display: flex; align-items: center; gap: 6px;';

        // Sort button
        var sortBtn = document.createElement('button');
        sortBtn.id = 'attendance-sort-btn';
        sortBtn.textContent = 'Sort: Page Order';
        sortBtn.style.cssText = 'background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 500; transition: all 0.3s ease; white-space: nowrap;';
        sortBtn.onmouseover = function () { sortBtn.style.background = 'rgba(255, 255, 255, 0.25)'; };
        sortBtn.onmouseout = function () { sortBtn.style.background = 'rgba(255, 255, 255, 0.15)'; };
        sortBtn.onclick = function () {
            if (attendanceState.sortMode === 'page') {
                attendanceState.sortMode = 'alpha';
                sortBtn.textContent = 'Sort: A\u2013Z';
                addLogMessage('showAttendancePanel: sort changed to alphabetical', 'log');
            } else {
                attendanceState.sortMode = 'page';
                sortBtn.textContent = 'Sort: Page Order';
                addLogMessage('showAttendancePanel: sort changed to page order', 'log');
            }
            refreshAttendanceList();
        };

        // Add Names button
        var addNamesBtn = document.createElement('button');
        addNamesBtn.textContent = '+ Add Names';
        addNamesBtn.style.cssText = 'background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 500; transition: all 0.3s ease; white-space: nowrap;';
        addNamesBtn.onmouseover = function () { addNamesBtn.style.background = 'rgba(255,255,255,0.25)'; };
        addNamesBtn.onmouseout = function () { addNamesBtn.style.background = 'rgba(255,255,255,0.15)'; };
        addNamesBtn.onclick = function () { showManualAddModal(); };

        // Copy button
        var copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.style.cssText = 'background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 500; transition: all 0.3s ease;';
        copyBtn.onmouseover = function () { copyBtn.style.background = 'rgba(255, 255, 255, 0.25)'; };
        copyBtn.onmouseout = function () { copyBtn.style.background = 'rgba(255, 255, 255, 0.15)'; };
        copyBtn.onclick = function () {
            var sorted = getSortedParticipants();
            var text = sorted.map(function (p, i) { return (i + 1) + '. ' + p.name; }).join('\n');
            navigator.clipboard.writeText(text).then(function () {
                copyBtn.textContent = 'Copied!';
                addLogMessage('showAttendancePanel: copied ' + sorted.length + ' names to clipboard', 'log');
                setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
            }).catch(function () {
                addLogMessage('showAttendancePanel: clipboard copy failed', 'error');
            });
        };

        // Export button
        var exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export .xlsx';
        exportBtn.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 1px solid rgba(255, 255, 255, 0.3); color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.3s ease;';
        exportBtn.onmouseover = function () { exportBtn.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)'; };
        exportBtn.onmouseout = function () { exportBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'; };
        exportBtn.onclick = function () {
            exportAttendanceToXLSX();
        };

        rightToolbar.appendChild(sortBtn);
        rightToolbar.appendChild(addNamesBtn);
        rightToolbar.appendChild(copyBtn);
        rightToolbar.appendChild(exportBtn);

        toolbar.appendChild(leftToolbar);
        toolbar.appendChild(rightToolbar);

        // Participant list
        var listContainer = document.createElement('div');
        listContainer.id = 'attendance-list-container';
        listContainer.style.cssText = 'flex: 1; overflow-y: auto; padding: 8px 16px; min-height: 200px; max-height: 50vh;';

        var list = document.createElement('div');
        list.id = 'attendance-list';
        list.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

        var sorted = getSortedParticipants();
        for (var i = 0; i < sorted.length; i++) {
            list.appendChild(createParticipantRow(sorted[i], i));
        }

        if (sorted.length === 0) {
            var emptyMsg = document.createElement('div');
            emptyMsg.id = 'attendance-empty-msg';
            emptyMsg.textContent = 'No participants found yet. Auto-scrolling and scanning every 5s\u2026';
            emptyMsg.style.cssText = 'color: rgba(255, 255, 255, 0.5); font-size: 13px; text-align: center; padding: 40px 0; font-style: italic;';
            list.appendChild(emptyMsg);
        }

        listContainer.appendChild(list);

        // Footer
        var footer = document.createElement('div');
        footer.style.cssText = 'padding: 10px 16px; border-top: 1px solid rgba(255, 255, 255, 0.15); background: rgba(0, 0, 0, 0.1); border-radius: 0 0 12px 12px; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;';

        var scanInfo = document.createElement('span');
        scanInfo.id = 'attendance-scan-info';
        scanInfo.textContent = 'Scans: ' + attendanceState.scanCount;
        scanInfo.style.cssText = 'color: rgba(255, 255, 255, 0.4); font-size: 11px;';

        var stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop Scanning';
        stopBtn.style.cssText = 'background: rgba(220, 53, 69, 0.6); border: 1px solid rgba(220, 53, 69, 0.8); color: white; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.3s ease;';
        stopBtn.onmouseover = function () { stopBtn.style.background = 'rgba(220, 53, 69, 0.9)'; };
        stopBtn.onmouseout = function () { stopBtn.style.background = 'rgba(220, 53, 69, 0.6)'; };
        stopBtn.onclick = function () {
            if (attendanceState.isRunning) {
                stopAttendance();
                stopBtn.textContent = 'Resume Scanning';
                stopBtn.style.background = 'rgba(40, 167, 69, 0.6)';
                stopBtn.style.borderColor = 'rgba(40, 167, 69, 0.8)';
                stopBtn.onmouseover = function () { stopBtn.style.background = 'rgba(40, 167, 69, 0.9)'; };
                stopBtn.onmouseout = function () { stopBtn.style.background = 'rgba(40, 167, 69, 0.6)'; };
                var indicator = document.getElementById('attendance-scan-indicator');
                if (indicator) { indicator.textContent = '\u25CB Paused'; indicator.style.color = '#ffd93d'; indicator.style.animation = 'none'; }
                addLogMessage('showAttendancePanel: scanning paused by user', 'warn');
            } else {
                attendanceState.isRunning = true;
                attendanceState.intervalId = setInterval(function () {
                    if (!attendanceState.isRunning) return;
                    scrollAndScanAll(function (newCount) {
                        if (newCount > 0) {
                            refreshAttendanceList();
                            updateAttendanceCount();
                        }
                        var infoEl = document.getElementById('attendance-scan-info');
                        if (infoEl) infoEl.textContent = 'Scans: ' + attendanceState.scanCount;
                    });
                }, 5000);
                stopBtn.textContent = 'Stop Scanning';
                stopBtn.style.background = 'rgba(220, 53, 69, 0.6)';
                stopBtn.style.borderColor = 'rgba(220, 53, 69, 0.8)';
                stopBtn.onmouseover = function () { stopBtn.style.background = 'rgba(220, 53, 69, 0.9)'; };
                stopBtn.onmouseout = function () { stopBtn.style.background = 'rgba(220, 53, 69, 0.6)'; };
                var indicator = document.getElementById('attendance-scan-indicator');
                if (indicator) { indicator.textContent = '\u25CF Scanning'; indicator.style.color = '#6bcf7f'; indicator.style.animation = 'msteamsPulse 2s infinite'; }
                addLogMessage('showAttendancePanel: scanning resumed by user', 'log');
            }
        };

        var clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.style.cssText = 'background: rgba(120,20,20,0.5); border: 1px solid rgba(220,53,69,0.6); color: rgba(255,180,180,1); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.3s ease;';
        clearAllBtn.onmouseover = function () { clearAllBtn.style.background = 'rgba(180,20,30,0.85)'; clearAllBtn.style.color = 'white'; };
        clearAllBtn.onmouseout = function () { clearAllBtn.style.background = 'rgba(120,20,20,0.5)'; clearAllBtn.style.color = 'rgba(255,180,180,1)'; };
        clearAllBtn.onclick = function () { showClearAllWarning(); };

        var footerRight = document.createElement('div');
        footerRight.style.cssText = 'display: flex; align-items: center; gap: 6px;';
        footerRight.appendChild(stopBtn);
        footerRight.appendChild(clearAllBtn);

        footer.appendChild(scanInfo);
        footer.appendChild(footerRight);

        // Assemble
        container.appendChild(header);
        container.appendChild(toolbar);
        container.appendChild(listContainer);
        container.appendChild(footer);

        wrapper.appendChild(container);

        wrapper.style.top = '50%';
        wrapper.style.left = '50%';
        wrapper.style.transform = 'translate(-50%, -50%)';
        wrapper.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(wrapper, header);

        document.body.appendChild(wrapper);
        buildInputPanel();
        if (comparisonState.active) { buildComparisonPanel(); refreshComparisonPanel(); }
        addLogMessage('showAttendancePanel: panel displayed with ' + sorted.length + ' participants', 'log');

        var escHandler = function (e) {
            if (e.key === 'Escape') {
                addLogMessage('showAttendancePanel: hidden via Escape (scanning continues)', 'log');
                var wr = document.getElementById('msteams-attendance-wrapper');
                if (wr) wr.style.display = 'none';
            }
        };
        document.addEventListener('keydown', escHandler, true);
    }

    function createParticipantRow(participant, index) {
        var row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 6px; background: rgba(255, 255, 255, 0.06); transition: background 0.15s ease;';
        row.onmouseover = function () { row.style.background = 'rgba(255, 255, 255, 0.12)'; };
        row.onmouseout = function () { row.style.background = 'rgba(255, 255, 255, 0.06)'; };

        var numLabel = document.createElement('span');
        numLabel.textContent = String(index + 1);
        numLabel.style.cssText = 'color: rgba(255, 255, 255, 0.4); font-size: 11px; min-width: 28px; text-align: right; font-weight: 600; flex-shrink: 0; font-family: Consolas, monospace;';

        var nameLabel = document.createElement('span');
        nameLabel.textContent = participant.name;
        nameLabel.style.cssText = 'color: white; font-size: 13px; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: text;';

        row.appendChild(numLabel);
        row.appendChild(nameLabel);
        return row;
    }

    function refreshAttendanceList() {
        var list = document.getElementById('attendance-list');
        if (!list) return;
        while (list.firstChild) { list.removeChild(list.firstChild); }
        var sorted = getSortedParticipants();
        for (var i = 0; i < sorted.length; i++) {
            list.appendChild(createParticipantRow(sorted[i], i));
        }
        if (sorted.length === 0) {
            var emptyMsg = document.createElement('div');
            emptyMsg.id = 'attendance-empty-msg';
            emptyMsg.textContent = 'No participants found yet. Auto-scrolling and scanning every 5s\u2026';
            emptyMsg.style.cssText = 'color: rgba(255, 255, 255, 0.5); font-size: 13px; text-align: center; padding: 40px 0; font-style: italic;';
            list.appendChild(emptyMsg);
        }
        refreshComparisonPanel();
    }

    function updateAttendanceCount() {
        var countEl = document.getElementById('attendance-count-label');
        if (countEl) { countEl.textContent = 'Participants: ' + attendanceState.allParticipants.length; }
        var scanEl = document.getElementById('attendance-scan-info');
        if (scanEl) { scanEl.textContent = 'Scans: ' + attendanceState.scanCount; }
    }

    // ─── Generic: makeDraggable ─────────────────────────────────────────
    function makeDraggable(container, handle) {
        let isDraggingModal = false;
        let offsetX = 0;
        let offsetY = 0;
        let currentScale = 1;

        handle.style.cursor = 'move';

        handle.addEventListener('mousedown', function (e) {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            isDraggingModal = true;

            const transform = container.style.transform;
            if (transform && transform.includes('scale')) {
                const match = transform.match(/scale\(([\d.]+)\)/);
                if (match) {
                    currentScale = parseFloat(match[1]);
                }
            } else {
                currentScale = 1;
            }

            const rect = container.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDraggingModal) return;

            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            const rect = container.getBoundingClientRect();
            const visualWidth = rect.width;
            const visualHeight = rect.height;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (newX < 0) {
                newX = 0;
            } else if (newX + visualWidth > viewportWidth) {
                newX = viewportWidth - visualWidth;
            }

            if (newY < 0) {
                newY = 0;
            } else if (newY + visualHeight > viewportHeight) {
                newY = viewportHeight - visualHeight;
            }

            container.style.left = newX + 'px';
            container.style.top = newY + 'px';
            container.style.right = 'auto';

            if (currentScale !== 1) {
                container.style.transform = 'scale(' + currentScale + ')';
                container.style.transformOrigin = 'top left';
            } else {
                container.style.transform = 'none';
            }
        });

        document.addEventListener('mouseup', function () {
            isDraggingModal = false;
        });
    }

    // ─── Generic: showWarning ───────────────────────────────────────────
    function showWarning(message) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 30000; display: flex; align-items: center; justify-content: center;';

        const container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 12px; padding: 24px; width: 400px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';

        const title = document.createElement('h3');
        title.textContent = 'Warning';
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';

        const closeButton = document.createElement('button');
        closeButton.textContent = '\u2715';
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = () => closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
        closeButton.onmouseout = () => closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        closeButton.onclick = () => document.body.removeChild(modal);

        header.appendChild(title);
        header.appendChild(closeButton);

        const messageDiv = document.createElement('p');
        messageDiv.textContent = message;
        messageDiv.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px; line-height: 1.5;';

        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; margin-top: 20px; width: 100%;';
        okButton.onmouseover = () => okButton.style.background = 'rgba(255, 255, 255, 0.3)';
        okButton.onmouseout = () => okButton.style.background = 'rgba(255, 255, 255, 0.2)';
        okButton.onclick = () => document.body.removeChild(modal);

        container.appendChild(header);
        container.appendChild(messageDiv);
        container.appendChild(okButton);
        modal.appendChild(container);

        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);

        document.body.appendChild(modal);
    }

    // ─── Config: Key Handling ───────────────────────────────────────────
    function canonicalizeKeyEvent(e) {
        var code = '';
        var label = '';
        if (e.code && e.code !== 'Unidentified' && e.code !== '') {
            code = e.code;
        } else if (e.key) {
            code = e.key;
        }
        if (/^F\d{1,2}$/.test(code)) {
            label = code;
        } else if (/^(Key)([A-Z])$/.test(code)) {
            label = code.replace(/^Key/, '');
        } else if (/^(Digit)(\d)$/.test(code)) {
            label = code.replace(/^Digit/, '');
        } else if (/^(Numpad)(\d)$/.test(code)) {
            label = 'Numpad ' + code.replace(/^Numpad/, '');
        } else if (/^Arrow/.test(code)) {
            label = code.replace(/^Arrow/, '') + ' Arrow';
        } else if (code === 'Backquote') { label = '`'; }
        else if (code === 'Minus') { label = '-'; }
        else if (code === 'Equal') { label = '='; }
        else if (code === 'BracketLeft') { label = '['; }
        else if (code === 'BracketRight') { label = ']'; }
        else if (code === 'Backslash') { label = '\\'; }
        else if (code === 'Semicolon') { label = ';'; }
        else if (code === 'Quote') { label = "'"; }
        else if (code === 'Comma') { label = ','; }
        else if (code === 'Period') { label = '.'; }
        else if (code === 'Slash') { label = '/'; }
        else if (code === 'Space') { label = 'Space'; }
        else if (code === 'Tab') { label = 'Tab'; }
        else if (code === 'Escape') { label = 'Escape'; }
        else if (code === 'Insert') { label = 'Insert'; }
        else if (code === 'Delete') { label = 'Delete'; }
        else if (code === 'Home') { label = 'Home'; }
        else if (code === 'End') { label = 'End'; }
        else if (code === 'PageUp') { label = 'Page Up'; }
        else if (code === 'PageDown') { label = 'Page Down'; }
        else { label = code || e.key || 'Unknown'; }
        return { code: code, label: label };
    }

    function validateKeyChoice(code) {
        if (!code || code === '' || code === 'Unidentified') { return false; }
        for (var di = 0; di < CFG_KEYS.disallowed.length; di++) {
            if (code === CFG_KEYS.disallowed[di]) { return false; }
        }
        return true;
    }

    function loadStoredKeybind() {
        var storedCode = localStorage.getItem(CFG_STORAGE.key);
        var storedLabel = localStorage.getItem(CFG_STORAGE.keyDisplay);
        if (storedCode && storedCode !== '' && validateKeyChoice(storedCode)) {
            return { code: storedCode, label: storedLabel || storedCode };
        }
        return { code: CFG_KEYS.defaultCode, label: CFG_KEYS.defaultCode };
    }

    function saveKeybind(code, label) {
        localStorage.setItem(CFG_STORAGE.key, code);
        localStorage.setItem(CFG_STORAGE.keyDisplay, label);
        var configBtn = document.getElementById(CFG_SELECTORS.configButtonId);
        if (configBtn) {
            configBtn.setAttribute(CFG_SELECTORS.configTooltipAttr, CFG_LABELS.configTooltip + ' (current: ' + label + ')');
        }
    }

    function loadHideLogs() {
        return localStorage.getItem(CFG_STORAGE.hideLogs) === 'true';
    }

    function saveHideLogsSetting(hidden) {
        localStorage.setItem(CFG_STORAGE.hideLogs, hidden ? 'true' : 'false');
    }

    function applyHideLogs(hidden) {
        var btn = document.getElementById('msteams-clear-logs-btn');
        var box = document.getElementById('msteams-log-box');
        var gui = document.getElementById(MSTEAMS_GUI_ID);
        if (btn) btn.style.display = hidden ? 'none' : '';
        if (box) box.style.display = hidden ? 'none' : '';
        if (gui) gui.style.minHeight = hidden ? 'auto' : '300px';
    }

    function loadButtonLayout() {
        try {
            var raw = localStorage.getItem(CFG_STORAGE.buttonLayout);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function saveButtonLayoutSetting(layout) {
        localStorage.setItem(CFG_STORAGE.buttonLayout, JSON.stringify(layout));
    }

    function getEffectiveButtonLayout() {
        var saved = loadButtonLayout();
        var defaultLayout = BUTTON_DEFS.map(function (def, idx) {
            return { id: def.id, position: idx, visible: true };
        });
        if (!saved || !Array.isArray(saved)) return defaultLayout;
        var savedIds = {};
        for (var s = 0; s < saved.length; s++) { savedIds[saved[s].id] = true; }
        var maxPos = -1;
        for (var mm = 0; mm < saved.length; mm++) {
            if (saved[mm].position > maxPos) maxPos = saved[mm].position;
        }
        var currentIds = {};
        for (var c = 0; c < BUTTON_DEFS.length; c++) { currentIds[BUTTON_DEFS[c].id] = true; }
        for (var n = 0; n < BUTTON_DEFS.length; n++) {
            if (!savedIds[BUTTON_DEFS[n].id]) {
                maxPos++;
                saved.push({ id: BUTTON_DEFS[n].id, position: maxPos, visible: true });
            }
        }
        return saved.filter(function (e) { return currentIds[e.id]; });
    }

    function buildDefMap() {
        var map = {};
        for (var i = 0; i < BUTTON_DEFS.length; i++) {
            map[BUTTON_DEFS[i].id] = BUTTON_DEFS[i];
        }
        return map;
    }

    function renderButtonsInto(container) {
        while (container.firstChild) { container.removeChild(container.firstChild); }
        var layout = getEffectiveButtonLayout();
        var defMap = buildDefMap();
        var layoutByPos = {};
        for (var i = 0; i < layout.length; i++) {
            layoutByPos[layout[i].position] = layout[i];
        }
        var maxPos = 0;
        for (var j = 0; j < layout.length; j++) {
            if (layout[j].position > maxPos) maxPos = layout[j].position;
        }
        var lastVisiblePos = -1;
        for (var p = maxPos; p >= 0; p--) {
            var ev = layoutByPos[p];
            if (ev && ev.visible && defMap[ev.id]) { lastVisiblePos = p; break; }
        }
        for (let pos = 0; pos <= lastVisiblePos; pos++) {
            var entry = layoutByPos[pos];
            if (entry && entry.visible && defMap[entry.id]) {
                var def = defMap[entry.id];
                const button = document.createElement('button');
                button.id = def.id;
                button.textContent = def.label;
                button.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);';
                button.onmouseover = () => {
                    button.style.transform = 'translateY(-2px)';
                    button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                };
                button.onmouseout = () => {
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                };
                button.onclick = def.handler;
                container.appendChild(button);
            } else {
                const spacer = document.createElement('div');
                spacer.style.cssText = 'visibility:hidden; min-height: 44px;';
                container.appendChild(spacer);
            }
        }
    }

    function rebuildButtonsContainer() {
        var container = document.getElementById('msteams-buttons-container');
        if (container) renderButtonsInto(container);
    }

    // ─── Config: Keybind Listener ───────────────────────────────────────
    // ─── F4: Toggle Attendance Panel Visibility ─────────────────────────
    var attendanceToggleHandler = null;

    function toggleAttendancePanelVisibility() {
        var wrapper = document.getElementById('msteams-attendance-wrapper');
        if (!wrapper) {
            addLogMessage('F4: no attendance panel exists yet', 'warn');
            return;
        }
        if (wrapper.style.display === 'none') {
            wrapper.style.display = 'flex';
            refreshAttendanceList();
            updateAttendanceCount();
            refreshComparisonPanel();
            addLogMessage('F4: attendance panel shown', 'log');
        } else {
            wrapper.style.display = 'none';
            addLogMessage('F4: attendance panel hidden (scanning continues)', 'log');
        }
    }

    function attachAttendanceToggleListener() {
        if (attendanceToggleHandler) {
            document.removeEventListener('keydown', attendanceToggleHandler, true);
        }
        attendanceToggleHandler = function (e) {
            if (e.key === 'F4') {
                if (cfgState.modalOpen) return;
                e.preventDefault();
                e.stopPropagation();
                toggleAttendancePanelVisibility();
            }
        };
        document.addEventListener('keydown', attendanceToggleHandler, true);
    }

    function detachAttendanceToggleListener() {
        if (attendanceToggleHandler) {
            document.removeEventListener('keydown', attendanceToggleHandler, true);
            attendanceToggleHandler = null;
        }
    }

    function attachGlobalKeybindListener() {
        addLogMessage('attachGlobalKeybindListener: attaching listener for code=' + cfgState.currentCode, 'log');
        if (cfgState.globalKeybindHandler) {
            document.removeEventListener('keydown', cfgState.globalKeybindHandler, true);
            cfgState.globalKeybindHandler = null;
        }
        cfgState.globalKeybindHandler = function (e) {
            if (cfgState.keybindSuspended) { return; }
            if (cfgState.modalOpen) { return; }
            if (e.metaKey) { return; }
            var activeEl = document.activeElement;
            if (activeEl) {
                if (activeEl.matches(CFG_KEYS.ignoreWhenEditableSelectors)) { return; }
            }
            var canonical = canonicalizeKeyEvent(e);
            if (canonical.code !== cfgState.currentCode) { return; }
            e.preventDefault();
            e.stopPropagation();
            if (cfgState.debounceTimer) { return; }
            addLogMessage('attachGlobalKeybindListener: keybind matched code=' + canonical.code + ', toggling', 'log');
            cfgState.debounceTimer = setTimeout(function () {
                cfgState.debounceTimer = null;
            }, CFG_TIMEOUTS.debounceMs);
            toggleMainPanelVisibility();
        };
        document.addEventListener('keydown', cfgState.globalKeybindHandler, true);
        attachAttendanceToggleListener();
    }

    function detachGlobalKeybindListener() {
        if (cfgState.globalKeybindHandler) {
            document.removeEventListener('keydown', cfgState.globalKeybindHandler, true);
            cfgState.globalKeybindHandler = null;
        }
        if (cfgState.debounceTimer) {
            clearTimeout(cfgState.debounceTimer);
            cfgState.debounceTimer = null;
        }
        detachAttendanceToggleListener();
    }

    function applyVisibilityKeybind(code, label) {
        detachGlobalKeybindListener();
        cfgState.currentCode = code;
        cfgState.currentLabel = label;
        attachGlobalKeybindListener();
    }

    function toggleMainPanelVisibility() {
        var gui = document.getElementById(MSTEAMS_GUI_ID);
        if (!gui) {
            guiVisible = true;
            localStorage.setItem('msteams-gui-visible', 'true');
            createGUI();
            gui = document.getElementById(MSTEAMS_GUI_ID);
            if (gui) { gui.style.display = 'flex'; }
            return;
        }
        if (gui.parentNode && gui.parentNode !== document.body) {
            msteamsCleanupExisting();
            guiVisible = true;
            localStorage.setItem('msteams-gui-visible', 'true');
            createGUI();
            gui = document.getElementById(MSTEAMS_GUI_ID);
            if (gui) { gui.style.display = 'flex'; }
            return;
        }
        guiVisible = !guiVisible;
        localStorage.setItem('msteams-gui-visible', guiVisible ? 'true' : 'false');
        if (guiVisible) {
            gui.style.display = 'flex';
            addLogMessage('toggleMainPanelVisibility: GUI shown', 'log');
            gui.focus();
        } else {
            gui.style.display = 'none';
            addLogMessage('toggleMainPanelVisibility: GUI hidden', 'log');
            document.body.focus();
        }
    }

    function toggleGUI() {
        toggleMainPanelVisibility();
    }

    // ─── Config: Icon & Modal ───────────────────────────────────────────
    function insertConfigIconNextToClose(header, closeButton) {
        var configBtn = document.createElement('button');
        configBtn.id = CFG_SELECTORS.configButtonId;
        configBtn.setAttribute('aria-label', CFG_LABELS.configButtonAria);
        configBtn.setAttribute(CFG_SELECTORS.configTooltipAttr, CFG_LABELS.configTooltip + ' (current: ' + cfgState.currentLabel + ')');
        configBtn.setAttribute('type', 'button');
        configBtn.textContent = '\u2699';
        configBtn.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; margin-right: 6px; flex-shrink: 0;';
        configBtn.onmouseover = function () { configBtn.style.background = 'rgba(255, 255, 255, 0.35)'; };
        configBtn.onmouseout = function () { configBtn.style.background = 'rgba(255, 255, 255, 0.2)'; };
        configBtn.onfocus = function () { configBtn.style.outline = '2px solid rgba(255, 255, 255, 0.6)'; configBtn.style.outlineOffset = '2px'; };
        configBtn.onblur = function () { configBtn.style.outline = 'none'; };
        configBtn.onclick = function (e) {
            e.stopPropagation();
            openConfigModal();
        };
        configBtn.onkeydown = function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                openConfigModal();
            }
        };
        if (closeButton && closeButton.parentNode === header) {
            header.insertBefore(configBtn, closeButton);
        } else {
            header.appendChild(configBtn);
        }
        return configBtn;
    }

    function openConfigModal() {
        addLogMessage('openConfigModal: opening configuration modal', 'log');
        cfgState.modalOpen = true;
        cfgState.keybindSuspended = true;
        cfgState.capturedCode = null;
        cfgState.capturedLabel = null;
        cfgState.focusReturnElement = document.getElementById(CFG_SELECTORS.configButtonId);

        var existingModal = document.getElementById(CFG_SELECTORS.configModalId);
        if (existingModal) {
            if (existingModal.parentNode) { existingModal.parentNode.removeChild(existingModal); }
        }

        var overlay = document.createElement('div');
        overlay.id = CFG_SELECTORS.configModalId;
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); z-index: 30000; display: flex; align-items: center; justify-content: center;';

        var container = document.createElement('div');
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'cfg-modal-title');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 0; width: 480px; max-width: 94%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4); position: relative; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; display: flex; flex-direction: column; max-height: 92vh;';

        var modalHeader = document.createElement('div');
        modalHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.1); border-radius: 12px 12px 0 0; flex-shrink: 0;';

        var modalTitle = document.createElement('h3');
        modalTitle.id = 'cfg-modal-title';
        modalTitle.textContent = CFG_LABELS.modalTitle;
        modalTitle.style.cssText = 'margin: 0; color: white; font-size: 16px; font-weight: 600;';

        var modalClose = document.createElement('button');
        modalClose.textContent = '\u2715';
        modalClose.setAttribute('aria-label', 'Close configuration');
        modalClose.setAttribute('type', 'button');
        modalClose.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        modalClose.onmouseover = function () { modalClose.style.background = 'rgba(255, 67, 54, 0.8)'; };
        modalClose.onmouseout = function () { modalClose.style.background = 'rgba(255, 255, 255, 0.2)'; };

        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(modalClose);

        var modalBody = document.createElement('div');
        modalBody.style.cssText = 'padding: 16px; overflow-y: auto; flex: 1;';

        var pendingHideLogs = loadHideLogs();
        var originalHideLogs = pendingHideLogs;
        var cfgHasDirty = false;

        function checkDirty() {
            cfgHasDirty = false;
            if (cfgState.capturedCode && validateKeyChoice(cfgState.capturedCode) && cfgState.capturedCode !== cfgState.currentCode) cfgHasDirty = true;
            if (pendingHideLogs !== originalHideLogs) cfgHasDirty = true;
            var invalidKeybind = cfgState.capturedCode && !validateKeyChoice(cfgState.capturedCode);
            updateSaveBtnState(cfgHasDirty && !invalidKeybind);
        }

        // Keybind section
        var fieldLabel = document.createElement('label');
        fieldLabel.setAttribute('for', CFG_SELECTORS.keyCaptureFieldId);
        fieldLabel.textContent = CFG_LABELS.keybindLabel;
        fieldLabel.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500; margin-bottom: 8px;';

        var keyCaptureField = document.createElement('input');
        keyCaptureField.id = CFG_SELECTORS.keyCaptureFieldId;
        keyCaptureField.type = 'text';
        keyCaptureField.readOnly = true;
        keyCaptureField.value = cfgState.currentLabel;
        keyCaptureField.setAttribute('aria-label', CFG_LABELS.keybindLabel);
        keyCaptureField.setAttribute('placeholder', CFG_LABELS.keybindPlaceholder);
        keyCaptureField.style.cssText = 'width: 100%; box-sizing: border-box; padding: 10px 12px; background: rgba(15, 10, 40, 0.7); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 8px; color: #e0e0ff; font-size: 14px; font-weight: 500; outline: none; cursor: pointer; text-align: center; letter-spacing: 0.5px; transition: border-color 0.3s ease; font-family: monospace; -webkit-text-fill-color: #e0e0ff;';
        keyCaptureField.onfocus = function () {
            keyCaptureField.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            keyCaptureField.value = '';
            keyCaptureField.setAttribute('placeholder', CFG_LABELS.keybindPlaceholder);
            cfgAnnounce(CFG_LABELS.captureOn);
        };
        keyCaptureField.onblur = function () {
            keyCaptureField.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            if (!cfgState.capturedLabel) {
                keyCaptureField.value = cfgState.currentLabel;
            }
        };

        var validationMsg = document.createElement('div');
        validationMsg.style.cssText = 'color: #ff6b6b; font-size: 12px; min-height: 18px; margin-top: 6px; transition: opacity 0.2s ease;';
        validationMsg.textContent = '';

        // Display section
        var displaySection = document.createElement('div');
        displaySection.style.cssText = 'margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.15);';
        var displayTitle = document.createElement('div');
        displayTitle.textContent = 'Display';
        displayTitle.style.cssText = 'color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;';
        displaySection.appendChild(displayTitle);

        var hideLogsRow = document.createElement('label');
        hideLogsRow.style.cssText = 'display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px 10px; border-radius: 6px; background: rgba(0, 0, 0, 0.15); transition: background 0.2s ease;';
        hideLogsRow.onmouseover = function () { hideLogsRow.style.background = 'rgba(0, 0, 0, 0.25)'; };
        hideLogsRow.onmouseout = function () { hideLogsRow.style.background = 'rgba(0, 0, 0, 0.15)'; };
        var hideLogsCheckbox = document.createElement('input');
        hideLogsCheckbox.type = 'checkbox';
        hideLogsCheckbox.checked = pendingHideLogs;
        hideLogsCheckbox.setAttribute('aria-label', 'Hide Logs');
        hideLogsCheckbox.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #764ba2; flex-shrink: 0;';
        hideLogsCheckbox.onchange = function () {
            pendingHideLogs = hideLogsCheckbox.checked;
            checkDirty();
        };
        var hideLogsLabel = document.createElement('span');
        hideLogsLabel.textContent = 'Hide Logs';
        hideLogsLabel.style.cssText = 'color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500;';
        hideLogsRow.appendChild(hideLogsCheckbox);
        hideLogsRow.appendChild(hideLogsLabel);
        displaySection.appendChild(hideLogsRow);

        // Aria live region
        var ariaLive = document.createElement('span');
        ariaLive.setAttribute('aria-live', 'polite');
        ariaLive.setAttribute('role', 'status');
        ariaLive.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';

        function cfgAnnounce(text) {
            ariaLive.textContent = '';
            setTimeout(function () { ariaLive.textContent = text; }, 50);
        }

        // Footer
        var modalFooter = document.createElement('div');
        modalFooter.style.cssText = 'padding: 12px 16px; display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid rgba(255, 255, 255, 0.15); flex-shrink: 0;';

        var cancelBtn = document.createElement('button');
        cancelBtn.id = CFG_SELECTORS.cancelBtnId;
        cancelBtn.textContent = CFG_LABELS.cancel;
        cancelBtn.setAttribute('type', 'button');
        cancelBtn.style.cssText = 'background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); color: white; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.3s ease;';
        cancelBtn.onmouseover = function () { cancelBtn.style.background = 'rgba(255, 255, 255, 0.25)'; };
        cancelBtn.onmouseout = function () { cancelBtn.style.background = 'rgba(255, 255, 255, 0.15)'; };

        var saveBtn = document.createElement('button');
        saveBtn.id = CFG_SELECTORS.saveBtnId;
        saveBtn.textContent = CFG_LABELS.save;
        saveBtn.setAttribute('type', 'button');
        saveBtn.disabled = true;
        saveBtn.style.cssText = 'background: rgba(40, 167, 69, 0.6); border: 1px solid rgba(40, 167, 69, 0.8); color: white; padding: 8px 18px; border-radius: 8px; cursor: not-allowed; font-size: 13px; font-weight: 600; transition: all 0.3s ease; opacity: 0.5;';

        function updateSaveBtnState(enabled) {
            saveBtn.disabled = !enabled;
            if (enabled) {
                saveBtn.style.cursor = 'pointer';
                saveBtn.style.opacity = '1';
                saveBtn.style.background = 'rgba(40, 167, 69, 0.8)';
            } else {
                saveBtn.style.cursor = 'not-allowed';
                saveBtn.style.opacity = '0.5';
                saveBtn.style.background = 'rgba(40, 167, 69, 0.6)';
            }
        }

        saveBtn.onmouseover = function () {
            if (!saveBtn.disabled) { saveBtn.style.background = 'rgba(40, 167, 69, 1)'; }
        };
        saveBtn.onmouseout = function () {
            if (!saveBtn.disabled) { saveBtn.style.background = 'rgba(40, 167, 69, 0.8)'; }
            else { saveBtn.style.background = 'rgba(40, 167, 69, 0.6)'; }
        };

        cfgState.modalKeyCaptureHandler = function (e) {
            if (!cfgState.modalOpen) { return; }
            if (document.activeElement !== keyCaptureField) { return; }
            e.preventDefault();
            e.stopPropagation();
            if (e.metaKey) { return; }
            if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') { return; }
            var canonical = canonicalizeKeyEvent(e);
            keyCaptureField.value = canonical.label;
            cfgState.capturedCode = canonical.code;
            cfgState.capturedLabel = canonical.label;
            if (!validateKeyChoice(canonical.code)) {
                validationMsg.textContent = CFG_LABELS.invalidKey;
                cfgAnnounce(CFG_LABELS.invalidKey);
                checkDirty();
            } else {
                validationMsg.textContent = '';
                checkDirty();
            }
        };
        keyCaptureField.addEventListener('keydown', cfgState.modalKeyCaptureHandler);

        function closeModal(didSave) {
            cfgState.modalOpen = false;
            cfgState.keybindSuspended = false;
            cfgState.capturedCode = null;
            cfgState.capturedLabel = null;
            if (cfgState.modalKeyCaptureHandler) {
                keyCaptureField.removeEventListener('keydown', cfgState.modalKeyCaptureHandler);
                cfgState.modalKeyCaptureHandler = null;
            }
            if (cfgState.modalEscHandler) {
                document.removeEventListener('keydown', cfgState.modalEscHandler, true);
                cfgState.modalEscHandler = null;
            }
            var modal = document.getElementById(CFG_SELECTORS.configModalId);
            if (modal && modal.parentNode) { modal.parentNode.removeChild(modal); }
            cfgAnnounce(CFG_LABELS.captureOff);
            if (cfgState.focusReturnElement) { cfgState.focusReturnElement.focus(); }
        }

        modalClose.onclick = function () { closeModal(false); };
        cancelBtn.onclick = function () { closeModal(false); };

        saveBtn.onclick = function () {
            if (saveBtn.disabled) { return; }
            var keybindChanged = cfgState.capturedCode && validateKeyChoice(cfgState.capturedCode) && cfgState.capturedCode !== cfgState.currentCode;
            var hideLogsChanged = pendingHideLogs !== originalHideLogs;
            var newCode = cfgState.capturedCode;
            var newLabel = cfgState.capturedLabel;
            closeModal(true);
            if (keybindChanged) {
                applyVisibilityKeybind(newCode, newLabel);
                saveKeybind(newCode, newLabel);
            }
            if (hideLogsChanged) {
                saveHideLogsSetting(pendingHideLogs);
                applyHideLogs(pendingHideLogs);
            }
            addLogMessage('openConfigModal: settings saved', 'log');
        };

        cfgState.modalEscHandler = function (e) {
            if (e.key === 'Escape' && cfgState.modalOpen) {
                if (document.activeElement === keyCaptureField) {
                    keyCaptureField.blur();
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                closeModal(false);
            }
        };
        document.addEventListener('keydown', cfgState.modalEscHandler, true);

        overlay.onclick = function (e) {
            if (e.target === overlay) { closeModal(false); }
        };

        modalBody.appendChild(fieldLabel);
        modalBody.appendChild(keyCaptureField);
        modalBody.appendChild(validationMsg);
        modalBody.appendChild(displaySection);

        modalFooter.appendChild(cancelBtn);
        modalFooter.appendChild(saveBtn);

        container.appendChild(modalHeader);
        container.appendChild(modalBody);
        container.appendChild(modalFooter);
        container.appendChild(ariaLive);

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        setTimeout(function () { keyCaptureField.focus(); }, 50);
    }

    function stopConfig() {
        cfgState.modalOpen = false;
        cfgState.keybindSuspended = false;
        cfgState.capturedCode = null;
        cfgState.capturedLabel = null;
        if (cfgState.modalEscHandler) {
            document.removeEventListener('keydown', cfgState.modalEscHandler, true);
            cfgState.modalEscHandler = null;
        }
        if (cfgState.modalKeyCaptureHandler) {
            cfgState.modalKeyCaptureHandler = null;
        }
        var modal = document.getElementById(CFG_SELECTORS.configModalId);
        if (modal && modal.parentNode) { modal.parentNode.removeChild(modal); }
        if (cfgState.debounceTimer) {
            clearTimeout(cfgState.debounceTimer);
            cfgState.debounceTimer = null;
        }
        if (cfgState.focusReturnElement) {
            cfgState.focusReturnElement.focus();
            cfgState.focusReturnElement = null;
        }
    }

    function configInit() {
        var stored = loadStoredKeybind();
        cfgState.currentCode = stored.code;
        cfgState.currentLabel = stored.label;
        addLogMessage('configInit: loaded keybind code=' + cfgState.currentCode + ' label=' + cfgState.currentLabel, 'log');
        attachGlobalKeybindListener();
    }

    // ─── Main GUI ───────────────────────────────────────────────────────
    function createGUI() {
        originalLog.call(console, '[MSTeams] createGUI: called');
        var existingGui = document.getElementById(MSTEAMS_GUI_ID);
        if (existingGui) {
            if (existingGui.parentNode === document.body) {
                originalLog.call(console, '[MSTeams] createGUI: GUI already exists on document.body, skipping creation');
                return;
            }
            originalLog.call(console, '[MSTeams] createGUI: stale GUI found in wrong parent, removing');
            msteamsCleanupExisting();
        }

        const guiContainer = document.createElement('div');
        guiContainer.id = MSTEAMS_GUI_ID;
        guiContainer.setAttribute(MSTEAMS_DATA_ATTR, 'true');
        guiContainer.style.cssText = `
        position: fixed;
        top: 100px;
        right: 100px;
        width: 350px;
        min-height: 300px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: none;
        flex-direction: column;
        overflow: hidden;
        transform-origin: top left;
    `;

        const header = document.createElement('div');
        header.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

        const title = document.createElement('h3');
        title.textContent = 'Microsoft Automator';
        title.style.cssText = `
        margin: 0;
        color: white;
        font-size: 16px;
        font-weight: 600;
    `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '\u2715';
        closeButton.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    `;
        closeButton.onmouseover = () => closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        closeButton.onmouseout = () => closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        closeButton.onclick = () => toggleGUI();

        var headerRight = document.createElement('div');
        headerRight.style.cssText = 'display: flex; align-items: center; gap: 4px; flex-shrink: 0;';
        headerRight.appendChild(closeButton);
        header.appendChild(title);
        header.appendChild(headerRight);
        insertConfigIconNextToClose(headerRight, closeButton);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'msteams-buttons-container';
        buttonsContainer.style.cssText = `
        padding: 16px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        background: rgba(255, 255, 255, 0.05);
    `;
        renderButtonsInto(buttonsContainer);

        const scaleContainer = document.createElement('div');
        scaleContainer.style.cssText = `
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    `;

        const scaleLabel = document.createElement('div');
        scaleLabel.textContent = `Scale: ${guiScale.toFixed(2)}x`;
        scaleLabel.style.cssText = `
        color: white;
        font-size: 12px;
        margin-bottom: 8px;
        font-weight: 500;
    `;

        const scaleSlider = document.createElement('input');
        scaleSlider.type = 'range';
        scaleSlider.min = '0.75';
        scaleSlider.max = '1';
        scaleSlider.step = '0.05';
        scaleSlider.value = guiScale;
        scaleSlider.style.cssText = `
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.3);
        outline: none;
        -webkit-appearance: none;
    `;

        scaleSlider.oninput = (e) => {
            const newScale = parseFloat(e.target.value);
            localStorage.setItem('msteams-gui-scale', newScale);
            scaleLabel.textContent = `Scale: ${newScale.toFixed(2)}x (refresh to apply)`;
        };

        scaleContainer.appendChild(scaleLabel);
        scaleContainer.appendChild(scaleSlider);

        const clearLogsBtn = document.createElement('button');
        clearLogsBtn.id = 'msteams-clear-logs-btn';
        clearLogsBtn.textContent = 'Clear Logs';
        clearLogsBtn.style.cssText = `
        margin-top: 8px;
        width: 100%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.8);
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.3s ease;
    `;
        clearLogsBtn.onmouseover = () => {
            clearLogsBtn.style.background = 'rgba(255, 67, 54, 0.4)';
            clearLogsBtn.style.borderColor = 'rgba(255, 67, 54, 0.6)';
            clearLogsBtn.style.color = 'white';
        };
        clearLogsBtn.onmouseout = () => {
            clearLogsBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            clearLogsBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            clearLogsBtn.style.color = 'rgba(255, 255, 255, 0.8)';
        };
        clearLogsBtn.onclick = () => {
            logMessages.length = 0;
            updateLogBox();
        };
        scaleContainer.appendChild(clearLogsBtn);

        const logBox = document.createElement('div');
        logBox.id = 'msteams-log-box';
        logBox.style.cssText = `
        flex: 1;
        padding: 12px;
        background: rgba(0, 0, 0, 0.3);
        overflow-y: auto;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 11px;
        line-height: 1.4;
        max-height: 200px;
    `;

        guiContainer.appendChild(header);
        guiContainer.appendChild(buttonsContainer);
        guiContainer.appendChild(scaleContainer);
        guiContainer.appendChild(logBox);

        if (loadHideLogs()) {
            clearLogsBtn.style.display = 'none';
            logBox.style.display = 'none';
            guiContainer.style.minHeight = 'auto';
        }
        document.body.appendChild(guiContainer);
        makeDraggable(guiContainer, header);
        addLogMessage('Microsoft Automator GUI initialized', 'log');
        updateGUIScale();
    }

    function updateLogBox() {
        const logBox = document.getElementById('msteams-log-box');
        if (!logBox || logBox.style.display === 'none') return;
        while (logBox.firstChild) { logBox.removeChild(logBox.firstChild); }
        var maxDisplay = 200;
        var startIdx = Math.max(0, logMessages.length - maxDisplay);
        for (var i = startIdx; i < logMessages.length; i++) {
            var msg = logMessages[i];
            var color = msg.type === 'error' ? '#ff6b6b' :
                msg.type === 'warn' ? '#ffd93d' : '#6bcf7f';
            var row = document.createElement('div');
            row.style.cssText = 'color: ' + color + '; margin-bottom: 4px;';
            var ts = document.createElement('span');
            ts.style.opacity = '0.7';
            ts.textContent = '[' + msg.timestamp + '] ';
            row.appendChild(ts);
            row.appendChild(document.createTextNode(msg.message));
            logBox.appendChild(row);
        }
        logBox.scrollTop = logBox.scrollHeight;
    }

    function updateGUIScale() {
        const gui = document.getElementById(MSTEAMS_GUI_ID);
        if (!gui) return;
        gui.style.transform = `scale(${guiScale})`;
        gui.style.transformOrigin = 'top left';
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────
    function msteamsCleanupExisting() {
        originalLog.call(console, '[MSTeams] msteamsCleanupExisting: scanning for stale GUI instances');
        var allInstances = document.querySelectorAll('#' + MSTEAMS_GUI_ID);
        for (var i = 0; i < allInstances.length; i++) {
            if (allInstances[i].parentNode) { allInstances[i].parentNode.removeChild(allInstances[i]); }
        }
        var allRoots = document.querySelectorAll('#' + MSTEAMS_ROOT_ID);
        for (var r = 0; r < allRoots.length; r++) {
            if (allRoots[r].parentNode) { allRoots[r].parentNode.removeChild(allRoots[r]); }
        }
        var trappedPanels = document.querySelectorAll('[' + MSTEAMS_DATA_ATTR + ']');
        for (var t = 0; t < trappedPanels.length; t++) {
            if (trappedPanels[t].parentNode) { trappedPanels[t].parentNode.removeChild(trappedPanels[t]); }
        }
    }

    function msteamsTeardown() {
        originalLog.call(console, '[MSTeams] msteamsTeardown: performing full teardown');
        detachGlobalKeybindListener();
        stopConfig();
        stopAttendance();
        if (msteamsReparentObserver) {
            msteamsReparentObserver.disconnect();
            msteamsReparentObserver = null;
        }
        if (msteamsInitDebounceTimer) {
            clearTimeout(msteamsInitDebounceTimer);
            msteamsInitDebounceTimer = null;
        }
        msteamsCleanupExisting();
        var aw = document.getElementById('msteams-attendance-wrapper');
        if (aw && aw.parentNode) aw.parentNode.removeChild(aw);
        var mm = document.getElementById('msteams-manual-add-modal');
        if (mm && mm.parentNode) mm.parentNode.removeChild(mm);
        var cm = document.getElementById(CFG_SELECTORS.configModalId);
        if (cm && cm.parentNode) cm.parentNode.removeChild(cm);
        msteamsInitialized = false;
        msteamsNavListenersRegistered = false;
        msteamsKeybindListenerRegistered = false;
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
    }

    // ─── Console hot-reload hook ─────────────────────────────────────────
    // Usage (DevTools console):
    //   1. window.__msteamsDestroy()   ← tears down current instance
    //   2. Paste the updated script IIFE and run it
    window.__msteamsDestroy = function () {
        msteamsTeardown();
        delete window.__msteamsDestroy;
        originalLog.call(console, '[MSTeams] Destroyed. Paste the updated script into the console to reload.');
    };

    function msteamsWatchForReparent() {
        if (msteamsReparentObserver) {
            msteamsReparentObserver.disconnect();
            msteamsReparentObserver = null;
        }
        msteamsReparentObserver = new MutationObserver(function () {
            var gui = document.getElementById(MSTEAMS_GUI_ID);
            if (!gui) { return; }
            if (gui.parentNode && gui.parentNode !== document.body) {
                originalLog.call(console, '[MSTeams] msteamsWatchForReparent: GUI trapped, reparenting to document.body');
                gui.parentNode.removeChild(gui);
                document.body.appendChild(gui);
            }
        });
        msteamsReparentObserver.observe(document.body, { childList: true, subtree: true });
    }

    function msteamsEnsureSingleInstance() {
        if (msteamsInitDebounceTimer) { clearTimeout(msteamsInitDebounceTimer); }
        msteamsInitDebounceTimer = setTimeout(function () {
            msteamsInitDebounceTimer = null;
            var existingGui = document.getElementById(MSTEAMS_GUI_ID);
            if (existingGui) {
                if (existingGui.parentNode && existingGui.parentNode !== document.body) {
                    msteamsCleanupExisting();
                    if (guiVisible) {
                        createGUI();
                        var newGui = document.getElementById(MSTEAMS_GUI_ID);
                        if (newGui) { newGui.style.display = 'flex'; }
                    }
                }
            } else {
                if (guiVisible) {
                    createGUI();
                    var recreatedGui = document.getElementById(MSTEAMS_GUI_ID);
                    if (recreatedGui) { recreatedGui.style.display = 'flex'; }
                }
            }
            if (!msteamsReparentObserver) { msteamsWatchForReparent(); }
        }, 50);
    }

    function msteamsRegisterNavListeners() {
        if (msteamsNavListenersRegistered) { return; }
        msteamsNavListenersRegistered = true;

        var origPushState = history.pushState;
        history.pushState = function () {
            origPushState.apply(this, arguments);
            msteamsEnsureSingleInstance();
        };

        var origReplaceState = history.replaceState;
        history.replaceState = function () {
            origReplaceState.apply(this, arguments);
            msteamsEnsureSingleInstance();
        };

        window.addEventListener('popstate', function () { msteamsEnsureSingleInstance(); });
        window.addEventListener('hashchange', function () { msteamsEnsureSingleInstance(); });

        window.addEventListener('pageshow', function (e) {
            if (e.persisted) {
                msteamsCleanupExisting();
                var sv = localStorage.getItem('msteams-gui-visible');
                guiVisible = sv === null ? true : sv === 'true';
                if (guiVisible) {
                    createGUI();
                    var gui = document.getElementById(MSTEAMS_GUI_ID);
                    if (gui) { gui.style.display = 'flex'; }
                }
                msteamsWatchForReparent();
            } else {
                msteamsEnsureSingleInstance();
            }
        });

        window.addEventListener('beforeunload', function () {
            msteamsTeardown();
        });
    }

    // ─── Init ───────────────────────────────────────────────────────────
    function isTopWindow() {
        try { return window === window.top; } catch (e) { return false; }
    }

    function init() {
        // Run "window.__msteamsDestroy()" to destroy current instance; then copy and paste the entire scrip
        var inTop = isTopWindow();
        originalLog.call(console, '[MSTeams] init: context=' + (inTop ? 'top' : 'iframe'));

        if (msteamsInitialized) {
            msteamsEnsureSingleInstance();
            return;
        }
        msteamsInitialized = true;
        originalLog.call(console, '[MSTeams] init: initializing Microsoft Automator');

        msteamsCleanupExisting();

        if (!msteamsKeybindListenerRegistered) {
            msteamsKeybindListenerRegistered = true;
            configInit();
        }

        msteamsRegisterNavListeners();

        var storedVisible = localStorage.getItem('msteams-gui-visible');
        guiVisible = storedVisible === null ? true : storedVisible === 'true';
        if (guiVisible) {
            originalLog.call(console, '[MSTeams] init: guiVisible=true, creating GUI');
            createGUI();
            var gui = document.getElementById(MSTEAMS_GUI_ID);
            if (gui) { gui.style.display = 'flex'; }
            localStorage.setItem('msteams-gui-visible', 'true');
        }

        msteamsWatchForReparent();

        originalLog.call(console, '[MSTeams] init: Microsoft Automator loaded. Press ' + cfgState.currentLabel + ' to toggle GUI.');
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        setTimeout(init, 0);
    }
})();

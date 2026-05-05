
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
        scanCount: 0
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
        }
        return newCount;
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

    // ─── Attendance: XLSX Export ─────────────────────────────────────────
    function generateXLSX(participants) {
        var xmlRows = '';
        xmlRows += '<Row>';
        xmlRows += '<Cell><Data ss:Type="String">#</Data></Cell>';
        xmlRows += '<Cell><Data ss:Type="String">Name</Data></Cell>';
        xmlRows += '</Row>';
        for (var i = 0; i < participants.length; i++) {
            var escapedName = participants[i].name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            xmlRows += '<Row>';
            xmlRows += '<Cell><Data ss:Type="Number">' + (i + 1) + '</Data></Cell>';
            xmlRows += '<Cell><Data ss:Type="String">' + escapedName + '</Data></Cell>';
            xmlRows += '</Row>';
        }
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<?mso-application progid="Excel.Sheet"?>\n' +
            '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
            ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
            '<Styles>\n' +
            '  <Style ss:ID="header">\n' +
            '    <Font ss:Bold="1" ss:Size="11"/>\n' +
            '    <Interior ss:Color="#667eea" ss:Pattern="Solid"/>\n' +
            '    <Font ss:Color="#FFFFFF" ss:Bold="1"/>\n' +
            '  </Style>\n' +
            '</Styles>\n' +
            '<Worksheet ss:Name="Attendance">\n' +
            '<Table>\n' +
            '<Column ss:Width="40"/>\n' +
            '<Column ss:Width="200"/>\n' +
            xmlRows +
            '</Table>\n' +
            '</Worksheet>\n' +
            '</Workbook>';
        return xml;
    }

    function exportAttendanceToXLSX() {
        var sorted = getSortedParticipants();
        if (sorted.length === 0) {
            addLogMessage('exportAttendanceToXLSX: no participants to export', 'warn');
            return;
        }
        var xml = generateXLSX(sorted);
        var blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
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
        attendanceState.allParticipants = [];
        attendanceState.seenNames = new Set();
        attendanceState.scanCount = 0;
        attendanceState.sortMode = 'page';

        scanParticipants();
        showAttendancePanel();

        if (attendanceState.intervalId) {
            clearInterval(attendanceState.intervalId);
        }
        attendanceState.intervalId = setInterval(function () {
            if (!attendanceState.isRunning) return;
            var newCount = scanParticipants();
            if (newCount > 0) {
                refreshAttendanceList();
                updateAttendanceCount();
            }
        }, 5000);
        addLogMessage('checkAttendanceInit: auto-scan started (every 5s)', 'log');
    }

    function stopAttendance() {
        addLogMessage('stopAttendance: stopping attendance check', 'log');
        attendanceState.isRunning = false;
        if (attendanceState.intervalId) {
            clearInterval(attendanceState.intervalId);
            attendanceState.intervalId = null;
        }
    }

    // ─── Attendance: Panel UI ───────────────────────────────────────────
    function showAttendancePanel() {
        addLogMessage('showAttendancePanel: creating attendance panel', 'log');

        var existingModal = document.getElementById('msteams-attendance-modal');
        if (existingModal && existingModal.parentNode) {
            existingModal.parentNode.removeChild(existingModal);
        }

        var modal = document.createElement('div');
        modal.id = 'msteams-attendance-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: transparent; z-index: 20000; display: flex; align-items: center; justify-content: center; pointer-events: none;';

        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 0; width: 500px; max-width: 94%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative; display: flex; flex-direction: column; max-height: 85vh; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;';
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
            modal.style.display = 'none';
        };

        header.appendChild(title);
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
            emptyMsg.textContent = 'No participants found yet. Scanning every 5 seconds\u2026';
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
                    var newCount = scanParticipants();
                    if (newCount > 0) {
                        refreshAttendanceList();
                        updateAttendanceCount();
                    }
                    var infoEl = document.getElementById('attendance-scan-info');
                    if (infoEl) infoEl.textContent = 'Scans: ' + attendanceState.scanCount;
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

        footer.appendChild(scanInfo);
        footer.appendChild(stopBtn);

        // Assemble
        container.appendChild(header);
        container.appendChild(toolbar);
        container.appendChild(listContainer);
        container.appendChild(footer);

        modal.appendChild(container);

        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);

        document.body.appendChild(modal);
        addLogMessage('showAttendancePanel: panel displayed with ' + sorted.length + ' participants', 'log');

        var escHandler = function (e) {
            if (e.key === 'Escape') {
                addLogMessage('showAttendancePanel: hidden via Escape (scanning continues)', 'log');
                modal.style.display = 'none';
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
            emptyMsg.textContent = 'No participants found yet. Scanning every 5 seconds\u2026';
            emptyMsg.style.cssText = 'color: rgba(255, 255, 255, 0.5); font-size: 13px; text-align: center; padding: 40px 0; font-style: italic;';
            list.appendChild(emptyMsg);
        }
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
        var modal = document.getElementById('msteams-attendance-modal');
        if (!modal) {
            addLogMessage('F4: no attendance panel exists yet', 'warn');
            return;
        }
        if (modal.style.display === 'none') {
            modal.style.display = 'flex';
            refreshAttendanceList();
            updateAttendanceCount();
            addLogMessage('F4: attendance panel shown', 'log');
        } else {
            modal.style.display = 'none';
            addLogMessage('F4: attendance panel hidden (scanning continues)', 'log');
        }
    }

    function attachAttendanceToggleListener() {
        if (attendanceToggleHandler) {
            document.removeEventListener('keydown', attendanceToggleHandler, true);
        }
        attendanceToggleHandler = function (e) {
            if (e.key === 'F4') {
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
        msteamsInitialized = false;
    }

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

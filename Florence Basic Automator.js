
// ==UserScript==
// @name Florence Automator
// @namespace vinh.activity.plan.state
// @version 2.1.0
// @description
// @match https://us.v2.researchbinders.com/*
// @run-at document-idle
// @grant GM.openInTab
// @grant GM_openInTab
// @grant GM.xmlHttpRequest
// ==/UserScript==

(function () {

    const ELOG_SELECTORS = {
        mainTable: '.document-log-entries.document-log-entries__table',
        gridTable: '.document-log-entries__grid-table[role="table"]',
        row: 'log-entry-row[role="row"], .document-log-entries__grid-table__row[role="row"]',
        cell: '[role="cell"]',
        nameCellIndex: 3,
        namePrimary: '.u-text-overflow-ellipsis',
        nameFallback: '.test-logEntrySignature span'
    };

    const ELOG_TIMEOUTS = {
        waitTableMs: 10000,
        waitGridMs: 10000
    };

    const ELOG_CSS_CLASSNAMES = {
        panelOverlay: 'elog-panel-overlay',
        inputPanel: 'elog-input-panel',
        progressPanel: 'elog-progress-panel',
        warningPanel: 'elog-warning-panel',
        subpanelLeft: 'elog-subpanel-left',
        subpanelRight: 'elog-subpanel-right',
        searchInput: 'elog-search-input',
        listItem: 'elog-list-item',
        statusPending: 'elog-status-pending',
        statusFound: 'elog-status-found',
        statusNotFound: 'elog-status-notfound',
        statusDuplicate: 'elog-status-duplicate'
    };

    const ELOG_SCROLL = {
        stepPx: 600,
        idleDelayMs: 30,
        settleDelayMs: 200,
        maxDurationMs: 120000,
        maxNoProgressIterations: 8,
        userScrollPauseMs: 800,
        viewportOverscanPx: 400,
        retryScanAttempts: 5,
        retryScanDelayMs: 150
    };

    const ELOG_ATTRS = {
        ariaBusyTarget: 'body',
        ariaBusyAttr: 'aria-busy'
    };

    const ELOG_LABELS = {
        progressComplete: 'Scan complete',
        progressNoMore: 'End of list reached',
        progressRescanning: 'Re-scanning',
        progressStopped: 'Scan stopped'
    };

    const ELOG_FORM_SELECTORS = {
        addEntryBtn: '.test-createLogEntryBtn',
        memberInput: 'input.filtered-select__input[placeholder*="Team Member"]',
        listContainer: 'ul.filtered-select__list.u-z-index-1060, ul.filtered-select__list, cdk-virtual-scroll-viewport',
        virtualViewport: 'cdk-virtual-scroll-viewport, .cdk-virtual-scroll-viewport',
        optionItem: 'cdk-virtual-scroll-viewport li.filtered-select__list__item, cdk-virtual-scroll-viewport li, .filtered-select__list li, cdk-virtual-scroll-viewport [role="option"], .filtered-select__list [role="option"]',
        saveAndAddAnotherBtn: 'button.btn.btn-primary',
        modalOrFormRoot: '.modal.show, .document-log-entries, body'
    };

    const ELOG_FORM_TIMEOUTS = {
        waitOpenMs: 10000,
        waitListMs: 6000,
        waitOptionRenderMs: 3000,
        waitSaveAfterClickMs: 8000,
        scrollIdleMs: 120,
        settleMs: 250,
        waitFilterMs: 800,
        waitLastNameFilterMs: 4000,
        maxSelectDurationMs: 8000
    };

    const ELOG_FORM_RETRY = {
        openListRetries: 4,
        selectRetriesPerScroll: 2,
        maxScrollPasses: 1,
        saveRetries: 2
    };

    const ELOG_RUN_LABELS = {
        statusPending: 'Pending',
        statusAlready: 'Already Exist',
        statusAdded: 'Completed',
        statusNotInDropdown: 'Not In Dropdown',
        statusSelectionFailed: 'Selection Failed',
        statusSaveFailed: 'Save Failed',
        statusStopped: 'Stopped'
    };

    const DOA_SELECTORS = {
        addEntryBtn: '.test-createLogEntryBtn',
        memberInput: 'input.filtered-select__input[placeholder*="Team Member"]',
        listContainer: 'ul.filtered-select__list.u-z-index-1060, ul.filtered-select__list, cdk-virtual-scroll-viewport',
        virtualViewport: 'cdk-virtual-scroll-viewport, .cdk-virtual-scroll-viewport',
        optionItem: 'cdk-virtual-scroll-viewport li.filtered-select__list__item, cdk-virtual-scroll-viewport li, .filtered-select__list li, cdk-virtual-scroll-viewport [role="option"], .filtered-select__list [role="option"]',
        roleClearBtn: 'i.fa-times.test-clearBtn',
        roleSearchInput: 'input.filtered-select__input[placeholder*="Search"]',
        roleOptionItem: '.filtered-select__list__item, [role="option"], .cdk-virtual-scroll-viewport .filtered-select__list__item',
        roleOptionText: '.filtered-select__list__item__text',
        tasksToggleBtn: 'button.dropdown-toggle.log-entry-form__select-options-dropdown-button',
        tasksMenu: 'ul.dropdown-menu.log-entry-form__select-options-dropdown',
        tasksItem: 'ul.dropdown-menu.log-entry-form__select-options-dropdown li',
        tasksItemCheckbox: 'ul.dropdown-menu.log-entry-form__select-options-dropdown li input[type="checkbox"]',
        mainGridTable: '.document-log-entries__grid-table[role="table"]',
        mainGridRow: 'log-entry-row[role="row"], .document-log-entries__grid-table__row[role="row"]',
        mainGridCell: '[role="cell"]',
        saveAndAddAnotherBtn: 'button.btn.btn-primary',
        mainTableContainer: '.document-log-entries.document-log-entries__table',
        ariaLiveRegion: '.aria-live-region'
    };

    const DOA_TIMEOUTS = {
        waitOpenMs: 10000,
        waitListMs: 6000,
        waitOptionRenderMs: 3000,
        waitRoleListMs: 6000,
        settleMs: 250,
        waitFilterMs: 800,
        waitLastNameFilterMs: 2000,
        waitTasksMenuMs: 5000,
        waitAfterTasksToggleMs: 200,
        maxSelectDurationMs: 8000,
        scrollIdleMs: 140,
        waitAfterSaveMs: 1500
    };

    const DOA_RETRY = {
        openListRetries: 2,
        selectRetriesPerScroll: 2,
        maxScrollPasses: 1
    };

    const DOA_LABELS = {
        featureButton: 'Add DoA Log Staff Entries',
        statusPending: 'Pending',
        statusDuplicate: 'Duplicate',
        statusAlready: 'Already Exist',
        statusAdded: 'Completed',
        statusNotInDropdown: 'Not In Dropdown',
        statusSelectionFailed: 'Selection Failed',
        statusSaveFailed: 'Save Failed',
        statusRoleNotFound: 'Role Not Found',
        statusTasksApplied: 'Completed',
        statusStopped: 'Stopped'
    };

    const MAX_NAME_SEARCH_WORD_INDEX = 6;

    let elogState = {
        isRunning: false,
        observers: [],
        timeouts: [],
        intervals: [],
        eventListeners: [],
        parsedNames: [],
        normalizedNames: new Map(),
        scannedNames: [],
        focusReturnElement: null,
        abortController: null,
        seenNormalizedNames: new Set(),
        prevAriaBusy: null,
        scrollContainer: null,
        prevScrollTop: 0,
        userScrollHandler: null,
        userScrollPaused: false,
        idleCallbackId: null,
        leftPanelRowIndex: 0,
        lastAutoScrollTime: 0,
        addQueue: [],
        addQueueIndex: 0,
        existingPairs: new Set(),
        counters: { total: 0, added: 0, duplicates: 0, failures: 0, pending: 0 },
        listScrollTop: 0,
        isAddingEntries: false,
        isPaused: false,
        activeDropdown: null
    };

    let doaState = {
        isRunning: false,
        observers: [],
        timeouts: [],
        intervals: [],
        eventListeners: [],
        idleCallbackIds: [],
        parsedCandidates: [],
        scannedNames: [],
        focusReturnElement: null,
        abortController: null,
        seenNormalizedNames: new Set(),
        prevAriaBusy: null,
        scrollContainer: null,
        prevScrollTop: 0,
        userScrollHandler: null,
        userScrollPaused: false,
        idleCallbackId: null,
        leftPanelRowIndex: 0,
        lastAutoScrollTime: 0,
        addQueue: [],
        addQueueIndex: 0,
        existingPairs: new Set(),
        counters: { total: 0, added: 0, duplicates: 0, failures: 0, pending: 0 },
        listScrollTop: 0,
        roleListScrollTop: 0,
        isAddingEntries: false,
        isPaused: false,
        activeDropdown: null
    };

    function addELogStaffEntriesInit() {
        addLogMessage('addELogStaffEntriesInit: starting feature', 'log');
        elogState.focusReturnElement = document.getElementById('elog-staff-entries-btn');
        elogState.abortController = new AbortController();
        resetELogState();
        const mainTable = document.querySelector(ELOG_SELECTORS.mainTable);
        addLogMessage('addELogStaffEntriesInit: checking for main table selector', 'log');
        if (!mainTable) {
            addLogMessage('addELogStaffEntriesInit: main table not found, showing warning', 'warn');
            showELogWarning();
            return;
        }
        addLogMessage('addELogStaffEntriesInit: main table found, showing input panel', 'log');
        showELogInputPanel();
    }

    function resetELogState() {
        addLogMessage('resetELogState: resetting state', 'log');
        elogState.isRunning = false;
        elogState.parsedNames = [];
        elogState.normalizedNames = new Map();
        elogState.scannedNames = [];
        elogState.seenNormalizedNames = new Set();
        elogState.prevAriaBusy = null;
        elogState.scrollContainer = null;
        elogState.prevScrollTop = 0;
        elogState.userScrollHandler = null;
        elogState.userScrollPaused = false;
        elogState.idleCallbackId = null;
        elogState.leftPanelRowIndex = 0;
        elogState.lastAutoScrollTime = 0;
        elogState.addQueue = [];
        elogState.addQueueIndex = 0;
        elogState.existingPairs = new Set();
        elogState.counters = { total: 0, added: 0, duplicates: 0, failures: 0, pending: 0 };
        elogState.listScrollTop = 0;
        elogState.isAddingEntries = false;
        elogState.isPaused = false;
        elogState.activeDropdown = null;
    }

    function showELogWarning() {
        addLogMessage('showELogWarning: creating warning popup', 'log');
        const modal = document.createElement('div');
        modal.className = ELOG_CSS_CLASSNAMES.warningPanel;
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 30000; display: flex; align-items: center; justify-content: center;';
        const container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 12px; padding: 24px; width: 450px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'alertdialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'elog-warning-title');
        container.setAttribute('aria-describedby', 'elog-warning-message');
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        const title = document.createElement('h3');
        title.id = 'elog-warning-title';
        title.textContent = 'Document Log Not Found';
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.setAttribute('aria-label', 'Close warning');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() { closeButton.style.background = 'rgba(255, 255, 255, 0.3)'; };
        closeButton.onmouseout = function() { closeButton.style.background = 'rgba(255, 255, 255, 0.2)'; };
        const closeWarning = function() {
            addLogMessage('showELogWarning: closing warning', 'log');
            if (modal.parentNode) { document.body.removeChild(modal); }
            stopELog();
            if (elogState.focusReturnElement) { elogState.focusReturnElement.focus(); }
        };
        closeButton.onclick = closeWarning;
        header.appendChild(title);
        header.appendChild(closeButton);
        const messageDiv = document.createElement('p');
        messageDiv.id = 'elog-warning-message';
        messageDiv.textContent = 'The current page does not contain the Document Log Entries table. Please navigate to a page with the Document Log Entries grid before using this feature.';
        messageDiv.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px; line-height: 1.5;';
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; margin-top: 20px; width: 100%;';
        okButton.onmouseover = function() { okButton.style.background = 'rgba(255, 255, 255, 0.3)'; };
        okButton.onmouseout = function() { okButton.style.background = 'rgba(255, 255, 255, 0.2)'; };
        okButton.onclick = closeWarning;
        const keyHandler = function(e) { if (e.key === 'Escape') { closeWarning(); } };
        document.addEventListener('keydown', keyHandler);
        elogState.eventListeners.push({ element: document, type: 'keydown', handler: keyHandler });
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
        okButton.focus();
        addLogMessage('showELogWarning: warning displayed', 'log');
    }

    function showELogInputPanel() {
        addLogMessage('showELogInputPanel: creating input panel', 'log');
        const modal = document.createElement('div');
        modal.className = ELOG_CSS_CLASSNAMES.inputPanel;
        modal.id = 'elog-input-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        const container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 500px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'elog-input-title');
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
        const title = document.createElement('h3');
        title.id = 'elog-input-title';
        title.textContent = 'Add ELog Staff Entries';
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600; letter-spacing: 0.2px;';
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.setAttribute('aria-label', 'Close panel');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() { closeButton.style.background = 'rgba(255, 67, 54, 0.8)'; };
        closeButton.onmouseout = function() { closeButton.style.background = 'rgba(255, 255, 255, 0.2)'; };
        closeButton.onclick = function() {
            addLogMessage('showELogInputPanel: closed by user', 'warn');
            if (modal.parentNode) { document.body.removeChild(modal); }
            stopELog();
            if (elogState.focusReturnElement) { elogState.focusReturnElement.focus(); }
        };
        header.appendChild(title);
        header.appendChild(closeButton);
        var description = document.createElement('p');
        description.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;';
        description.append("Rules:");
        description.appendChild(document.createElement('br'));
        var lines = [
            'Enter staff names to check against the Document Log. Separate names with commas or place each name on a new line.',
            'After clicking Confirm, do not click anywhere else on the page, as this will impact the process.',
            'If the Confirm button is unavailable even after input, refresh the page.'
        ];

        for (var i = 0; i < lines.length; i++) {
            description.appendChild(document.createTextNode('• ' + lines[i]));
            if (i < lines.length - 1) {
                description.appendChild(document.createElement('br'));
            }
        }
        const textarea = document.createElement('textarea');
        textarea.id = 'elog-names-input';
        textarea.placeholder = 'Name1, Name2, Name3\nor\nName1\nName2\nName3';
        textarea.setAttribute('aria-label', 'Staff names input');
        textarea.style.cssText = 'width: 100%; height: 160px; padding: 12px 14px; border: 2px solid rgba(255, 255, 255, 0.35); border-radius: 10px; background: rgba(255, 255, 255, 0.95); color: #1e293b; font-size: 14px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; resize: vertical; outline: none; transition: all 0.25s ease; box-shadow: 0 2px 0 rgba(0,0,0,0.04) inset; box-sizing: border-box;';
        textarea.onfocus = function() { textarea.style.borderColor = '#8ea0ff'; textarea.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.25)'; };
        textarea.onblur = function() { textarea.style.borderColor = 'rgba(255, 255, 255, 0.35)'; textarea.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04) inset'; };
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm';
        confirmButton.disabled = true;
        confirmButton.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; transition: all 0.25s ease; opacity: 0.5;';
        const updateConfirmState = function() {
            const parsed = parseNamesInput(textarea.value);
            if (parsed.length > 0) { confirmButton.disabled = false; confirmButton.style.opacity = '1'; confirmButton.style.cursor = 'pointer'; }
            else { confirmButton.disabled = true; confirmButton.style.opacity = '0.5'; confirmButton.style.cursor = 'not-allowed'; }
        };
        textarea.oninput = updateConfirmState;
        confirmButton.onmouseover = function() { if (!confirmButton.disabled) { confirmButton.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)'; } };
        confirmButton.onmouseout = function() { confirmButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'; };
        confirmButton.onclick = function() {
            addLogMessage('showELogInputPanel: Confirm clicked', 'log');
            const parsed = parseNamesInput(textarea.value);
            if (parsed.length === 0) { addLogMessage('showELogInputPanel: no valid names parsed', 'warn'); return; }
            elogState.parsedNames = parsed;
            addLogMessage('showELogInputPanel: parsed ' + parsed.length + ' unique names', 'log');
            if (modal.parentNode) { document.body.removeChild(modal); }
            elogState.isRunning = true;
            showCollectingDataPanel('elog', 'Add Training Log Staff Entries');
            startELogScan();
        };
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All';
        clearButton.style.cssText = 'background: rgba(255, 255, 255, 0.18); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.25s ease; backdrop-filter: blur(2px);';
        clearButton.onmouseover = function() { clearButton.style.background = 'rgba(255, 255, 255, 0.28)'; };
        clearButton.onmouseout = function() { clearButton.style.background = 'rgba(255, 255, 255, 0.18)'; };
        clearButton.onclick = function() {
            addLogMessage('showELogInputPanel: Clear All clicked', 'log');
            textarea.value = '';
            elogState.parsedNames = [];
            elogState.normalizedNames = new Map();
            confirmButton.disabled = true;
            confirmButton.style.opacity = '0.5';
            confirmButton.style.cursor = 'not-allowed';
        };
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;';
        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(confirmButton);
        container.appendChild(header);
        container.appendChild(description);
        container.appendChild(textarea);
        container.appendChild(buttonContainer);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        textarea.focus();
        addLogMessage('showELogInputPanel: input panel displayed', 'log');
    }

    function parseNamesInput(input) {
        addLogMessage('parseNamesInput: parsing input', 'log');
        if (!input || !input.trim()) { addLogMessage('parseNamesInput: empty input', 'warn'); return []; }
        const results = [];
        const seenNormalized = new Set();
        elogState.normalizedNames = new Map();
        const lines = input.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(',');
            for (let j = 0; j < parts.length; j++) {
                let name = parts[j].trim();
                name = name.replace(/,+$/, '').trim();
                if (!name) { continue; }
                const normalized = elogNormalizeName(name);
                if (!normalized) { continue; }
                if (seenNormalized.has(normalized)) { addLogMessage('parseNamesInput: duplicate detected (ignored): ' + name, 'log'); continue; }
                seenNormalized.add(normalized);
                elogState.normalizedNames.set(normalized, name);
                results.push({ display: name, normalized: normalized, status: 'Pending' });
            }
        }
        addLogMessage('parseNamesInput: parsed ' + results.length + ' unique names', 'log');
        return results;
    }

    function elogNormalizeName(name) {
        if (!name) { return ''; }
        let normalized = name.trim();
        normalized = normalized.replace(/\s+/g, ' ');
        normalized = normalized.toLowerCase();
        return normalized;
    }

    function showELogProgressPanel() {
        addLogMessage('showELogProgressPanel: creating progress panel', 'log');
        elogState.isRunning = true;
        const modal = document.createElement('div');
        modal.className = ELOG_CSS_CLASSNAMES.progressPanel;
        modal.id = 'elog-progress-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        const container = document.createElement('div');
        container.id = 'elog-progress-container';
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 900px; max-width: 95%; max-height: 80vh; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative; display: flex; flex-direction: column;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'elog-progress-title');
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0;';
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
        const title = document.createElement('h3');
        title.id = 'elog-progress-title';
        title.textContent = 'ELog Staff Entries - Review';
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        const statusBadge = document.createElement('span');
        statusBadge.id = 'elog-status-badge';
        statusBadge.textContent = 'In Progress';
        statusBadge.style.cssText = 'background: rgba(255, 255, 255, 0.3); color: #ffd93d; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
        titleContainer.appendChild(title);
        titleContainer.appendChild(statusBadge);
        const headerButtons = document.createElement('div');
        headerButtons.style.cssText = 'display: flex; gap: 8px; align-items: center;';
        const rescanButton = document.createElement('button');
        rescanButton.textContent = 'Re-scan';
        rescanButton.id = 'elog-rescan-btn';
        rescanButton.setAttribute('aria-label', 'Re-scan document log');
        rescanButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.25s ease;';
        rescanButton.onmouseover = function() { rescanButton.style.background = 'rgba(255, 255, 255, 0.3)'; };
        rescanButton.onmouseout = function() { rescanButton.style.background = 'rgba(255, 255, 255, 0.2)'; };
        rescanButton.onclick = function() { addLogMessage('showELogProgressPanel: Re-scan clicked', 'log'); performRescan(); };
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.setAttribute('aria-label', 'Close and stop scanning');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() { closeButton.style.background = 'rgba(255, 67, 54, 0.8)'; };
        closeButton.onmouseout = function() { closeButton.style.background = 'rgba(255, 255, 255, 0.2)'; };
        closeButton.onclick = function() {
            addLogMessage('showELogProgressPanel: closed by user', 'warn');
            if (modal.parentNode) { document.body.removeChild(modal); }
            stopELog();
            if (elogState.focusReturnElement) { elogState.focusReturnElement.focus(); }
        };
        const pauseButton = document.createElement('button');
        pauseButton.textContent = 'Pause';
        pauseButton.id = 'elog-pause-btn';
        pauseButton.setAttribute('aria-label', 'Pause or resume adding entries');
        pauseButton.style.cssText = 'background: rgba(255, 193, 7, 0.25); border: 2px solid rgba(255, 193, 7, 0.5); color: #ffd93d; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.25s ease;';
        pauseButton.onmouseover = function() { pauseButton.style.background = 'rgba(255, 193, 7, 0.4)'; };
        pauseButton.onmouseout = function() {
            if (elogState.isPaused) {
                pauseButton.style.background = 'rgba(76, 175, 80, 0.25)';
            } else {
                pauseButton.style.background = 'rgba(255, 193, 7, 0.25)';
            }
        };
        pauseButton.onclick = function() {
            if (elogState.isPaused) {
                addLogMessage('showELogProgressPanel: Resume clicked', 'log');
                elogState.isPaused = false;
                pauseButton.textContent = 'Pause';
                pauseButton.style.background = 'rgba(255, 193, 7, 0.25)';
                pauseButton.style.borderColor = 'rgba(255, 193, 7, 0.5)';
                pauseButton.style.color = '#ffd93d';
                updateScanStatus('Adding Entries', 'progress');
                var title = document.getElementById('elog-progress-title');
                if (title) {
                    title.textContent = 'ELog Staff Entries - Adding Entries';
                }
                processNextStaffFromQueue();
            } else {
                addLogMessage('showELogProgressPanel: Pause clicked', 'log');
                elogState.isPaused = true;
                pauseButton.textContent = 'Resume';
                pauseButton.style.background = 'rgba(76, 175, 80, 0.25)';
                pauseButton.style.borderColor = 'rgba(76, 175, 80, 0.5)';
                pauseButton.style.color = '#6bcf7f';
                updateScanStatus('Paused', 'paused');
                var title = document.getElementById('elog-progress-title');
                if (title) {
                    title.textContent = 'ELog Staff Entries - Paused';
                }
            }
        };
        headerButtons.appendChild(rescanButton);
        headerButtons.appendChild(pauseButton);
        headerButtons.appendChild(closeButton);
        header.appendChild(titleContainer);
        header.appendChild(headerButtons);
        const panelsContainer = document.createElement('div');
        panelsContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; overflow: hidden;';
        const leftPanel = createSubpanel('Scanned Log Entries', 'elog-left-panel', 'elog-left-search');
        const rightPanel = createSubpanel('User Names Status', 'elog-right-panel', 'elog-right-search');
        addSortToggleToSubpanel(rightPanel, 'elog-right-panel', 'elog-sort-toggle', 'elog-failure-filter', [ELOG_RUN_LABELS.statusNotInDropdown, ELOG_RUN_LABELS.statusSelectionFailed, ELOG_RUN_LABELS.statusSaveFailed]);
        panelsContainer.appendChild(leftPanel);
        panelsContainer.appendChild(rightPanel);
        const summaryFooter = document.createElement('div');
        summaryFooter.id = 'elog-summary-footer';
        summaryFooter.setAttribute('aria-label', 'Processing summary');
        summaryFooter.style.cssText = 'display: flex; justify-content: space-around; align-items: center; padding: 10px 16px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; margin-top: 12px; flex-shrink: 0;';
        const summaryItems = [
            { id: 'elog-summary-total', label: 'Total', value: '0' },
            { id: 'elog-summary-added', label: 'Added', value: '0' },
            { id: 'elog-summary-duplicates', label: 'Duplicates', value: '0' },
            { id: 'elog-summary-failures', label: 'Failures', value: '0' },
            { id: 'elog-summary-pending', label: 'Pending', value: '0' },
            { id: 'elog-summary-percent', label: 'Progress', value: '0%' }
        ];
        for (let si = 0; si < summaryItems.length; si++) {
            const summaryItem = document.createElement('div');
            summaryItem.style.cssText = 'text-align: center;';
            const valSpan = document.createElement('span');
            valSpan.id = summaryItems[si].id;
            valSpan.textContent = summaryItems[si].value;
            valSpan.style.cssText = 'display: block; color: white; font-size: 16px; font-weight: 700;';
            const labelSpan = document.createElement('span');
            labelSpan.textContent = summaryItems[si].label;
            labelSpan.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.6); font-size: 11px; font-weight: 500; margin-top: 2px;';
            summaryItem.appendChild(valSpan);
            summaryItem.appendChild(labelSpan);
            summaryFooter.appendChild(summaryItem);
        }
        const ariaLiveRegion = document.createElement('div');
        ariaLiveRegion.id = 'elog-aria-live';
        ariaLiveRegion.setAttribute('aria-live', 'polite');
        ariaLiveRegion.setAttribute('aria-atomic', 'true');
        ariaLiveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        container.appendChild(header);
        container.appendChild(panelsContainer);
        container.appendChild(summaryFooter);
        container.appendChild(ariaLiveRegion);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        initializeRightPanel();
        populateELogLeftPanel();
        finalizeELogRightPanelAfterScan();
        rescanButton.focus();
        addLogMessage('showELogProgressPanel: progress panel displayed with all data populated', 'log');
        updateScanStatus('Scan Complete', 'complete');
        var progressTitle = document.getElementById('elog-progress-title');
        if (progressTitle) {
            progressTitle.textContent = 'ELog Staff Entries - Adding Entries';
        }
        beginAddNonDuplicateELogEntries();
    }

    function createSubpanel(titleText, listId, searchId) {
        addLogMessage('createSubpanel: creating ' + titleText, 'log');
        const panel = document.createElement('div');
        panel.style.cssText = 'background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; min-height: 0; overflow: hidden;';
        const panelHeader = document.createElement('div');
        panelHeader.style.cssText = 'margin-bottom: 10px; flex-shrink: 0;';
        const panelTitle = document.createElement('h4');
        panelTitle.textContent = titleText;
        panelTitle.style.cssText = 'margin: 0 0 8px 0; color: white; font-size: 14px; font-weight: 600;';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = searchId;
        searchInput.placeholder = 'Search...';
        searchInput.setAttribute('aria-label', 'Search ' + titleText);
        searchInput.style.cssText = 'width: 100%; padding: 8px 12px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 13px; outline: none; transition: all 0.2s ease; box-sizing: border-box;';
        searchInput.onfocus = function() { searchInput.style.borderColor = 'rgba(255, 255, 255, 0.4)'; searchInput.style.background = 'rgba(255, 255, 255, 0.15)'; };
        searchInput.onblur = function() { searchInput.style.borderColor = 'rgba(255, 255, 255, 0.2)'; searchInput.style.background = 'rgba(255, 255, 255, 0.1)'; };
        searchInput.oninput = function() { filterSubpanelList(listId, searchInput.value); };
        panelHeader.appendChild(panelTitle);
        panelHeader.appendChild(searchInput);
        const listContainer = document.createElement('div');
        listContainer.id = listId;
        listContainer.style.cssText = 'flex: 1; overflow-y: auto; min-height: 200px; max-height: 400px;';
        panel.appendChild(panelHeader);
        panel.appendChild(listContainer);
        return panel;
    }

    function filterSubpanelList(listId, searchTerm) {
        addLogMessage('filterSubpanelList: filtering ' + listId + ' with term: ' + searchTerm, 'log');
        const list = document.getElementById(listId);
        if (!list) { return; }
        const items = list.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem);
        const searchLower = searchTerm.toLowerCase().trim();
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const text = item.textContent.toLowerCase();
            if (!searchLower || text.indexOf(searchLower) !== -1) { item.style.display = 'flex'; }
            else { item.style.display = 'none'; }
        }
    }

    function addSortToggleToSubpanel(subpanelEl, listId, toggleId, failureFilterId, failureStatuses) {
        addLogMessage('addSortToggleToSubpanel: adding toggle for ' + listId, 'log');
        var panelHeader = subpanelEl.firstElementChild;
        if (!panelHeader) {
            return;
        }
        var titleEl = panelHeader.querySelector('h4');
        if (!titleEl) {
            return;
        }
        var titleRow = document.createElement('div');
        titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
        titleEl.style.cssText = 'margin: 0; color: white; font-size: 14px; font-weight: 600;';
        panelHeader.removeChild(titleEl);
        titleRow.appendChild(titleEl);
        var toggleBtn = document.createElement('button');
        toggleBtn.id = toggleId;
        toggleBtn.textContent = 'A-Z';
        toggleBtn.setAttribute('aria-label', 'Toggle alphabetical sort');
        toggleBtn.setAttribute('aria-pressed', 'false');
        toggleBtn.style.cssText = 'background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: rgba(255, 255, 255, 0.7); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.2s ease; flex-shrink: 0;';
        toggleBtn.onmouseover = function() {
            toggleBtn.style.background = 'rgba(255, 255, 255, 0.25)';
        };
        toggleBtn.onmouseout = function() {
            var pressed = toggleBtn.getAttribute('aria-pressed') === 'true';
            toggleBtn.style.background = pressed ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)';
        };
        toggleBtn.onclick = function() {
            var isPressed = toggleBtn.getAttribute('aria-pressed') === 'true';
            var newPressed = !isPressed;
            toggleBtn.setAttribute('aria-pressed', String(newPressed));
            if (newPressed) {
                toggleBtn.style.background = 'rgba(255, 255, 255, 0.3)';
                toggleBtn.style.color = 'white';
                toggleBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            } else {
                toggleBtn.style.background = 'rgba(255, 255, 255, 0.15)';
                toggleBtn.style.color = 'rgba(255, 255, 255, 0.7)';
                toggleBtn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }
            sortPanelList(listId, newPressed);
            addLogMessage('addSortToggleToSubpanel: toggled sort for ' + listId + ' alphabetical=' + newPressed, 'log');
        };
        titleRow.appendChild(toggleBtn);
        if (failureFilterId && failureStatuses) {
            var btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display: flex; gap: 4px; flex-shrink: 0;';
            titleRow.removeChild(toggleBtn);
            btnContainer.appendChild(toggleBtn);
            var filterBtn = document.createElement('button');
            filterBtn.id = failureFilterId;
            filterBtn.textContent = 'Failures';
            filterBtn.setAttribute('aria-label', 'Filter to show only failed items');
            filterBtn.setAttribute('aria-pressed', 'false');
            filterBtn.style.cssText = 'background: rgba(255, 107, 107, 0.15); border: 1px solid rgba(255, 107, 107, 0.3); color: rgba(255, 107, 107, 0.8); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.2s ease; flex-shrink: 0;';
            filterBtn.onmouseover = function() {
                filterBtn.style.background = 'rgba(255, 107, 107, 0.25)';
            };
            filterBtn.onmouseout = function() {
                var pressed = filterBtn.getAttribute('aria-pressed') === 'true';
                filterBtn.style.background = pressed ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 107, 107, 0.15)';
            };
            filterBtn.onclick = function() {
                var isPressed = filterBtn.getAttribute('aria-pressed') === 'true';
                var newPressed = !isPressed;
                filterBtn.setAttribute('aria-pressed', String(newPressed));
                if (newPressed) {
                    filterBtn.style.background = 'rgba(255, 107, 107, 0.3)';
                    filterBtn.style.color = '#ff6b6b';
                    filterBtn.style.borderColor = 'rgba(255, 107, 107, 0.6)';
                } else {
                    filterBtn.style.background = 'rgba(255, 107, 107, 0.15)';
                    filterBtn.style.color = 'rgba(255, 107, 107, 0.8)';
                    filterBtn.style.borderColor = 'rgba(255, 107, 107, 0.3)';
                }
                filterPanelListByFailure(listId, newPressed, failureStatuses);
                addLogMessage('addSortToggleToSubpanel: toggled failure filter for ' + listId + ' active=' + newPressed, 'log');
            };
            btnContainer.appendChild(filterBtn);
            titleRow.appendChild(btnContainer);
        } else {
            titleRow.appendChild(toggleBtn);
        }
        panelHeader.insertBefore(titleRow, panelHeader.firstChild);
    }

    function sortPanelList(listId, alphabetical) {
        addLogMessage('sortPanelList: listId=' + listId + ' alphabetical=' + alphabetical, 'log');
        var list = document.getElementById(listId);
        if (!list) {
            return;
        }
        var items = Array.from(list.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem));
        if (items.length === 0) {
            return;
        }
        if (alphabetical) {
            items.sort(function(a, b) {
                var textA = (a.getAttribute('data-sort-name') || '').toLowerCase();
                var textB = (b.getAttribute('data-sort-name') || '').toLowerCase();
                return textA.localeCompare(textB);
            });
        } else {
            items.sort(function(a, b) {
                var orderA = parseInt(a.getAttribute('data-input-order'), 10) || 0;
                var orderB = parseInt(b.getAttribute('data-input-order'), 10) || 0;
                return orderA - orderB;
            });
        }
        for (var i = 0; i < items.length; i++) {
            list.appendChild(items[i]);
        }
    }

    function filterPanelListByFailure(listId, showOnlyFailures, failureStatuses) {
        addLogMessage('filterPanelListByFailure: listId=' + listId + ' showOnlyFailures=' + showOnlyFailures, 'log');
        var list = document.getElementById(listId);
        if (!list) {
            return;
        }
        var items = list.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (!showOnlyFailures) {
                item.style.display = 'flex';
                continue;
            }
            var badge = item.querySelector('.elog-status-badge');
            var badgeText = badge ? badge.textContent.trim() : '';
            var isFailure = false;
            for (var fi = 0; fi < failureStatuses.length; fi++) {
                if (badgeText === failureStatuses[fi]) {
                    isFailure = true;
                    break;
                }
            }
            item.style.display = isFailure ? 'flex' : 'none';
        }
    }

    function initializeRightPanel() {
        addLogMessage('initializeRightPanel: initializing with parsed names', 'log');
        const rightPanel = document.getElementById('elog-right-panel');
        if (!rightPanel) { addLogMessage('initializeRightPanel: right panel not found', 'error'); return; }
        rightPanel.innerHTML = '';
        for (let i = 0; i < elogState.parsedNames.length; i++) {
            const nameObj = elogState.parsedNames[i];
            const item = createListItem(nameObj.display, 'Pending', 'pending', i + 1);
            item.setAttribute('data-normalized', nameObj.normalized);
            item.setAttribute('data-pairkey', normalizeFirstLastPair(nameObj.display));
            item.setAttribute('data-input-order', String(i + 1));
            item.setAttribute('data-sort-name', nameObj.display);
            rightPanel.appendChild(item);
        }
        addLogMessage('initializeRightPanel: added ' + elogState.parsedNames.length + ' items', 'log');
    }

    function createListItem(text, statusText, statusType, index) {
        const item = document.createElement('div');
        item.className = ELOG_CSS_CLASSNAMES.listItem;
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; margin: 4px 0; background: rgba(255, 255, 255, 0.08); border-radius: 6px; transition: background 0.2s ease;';
        item.onmouseover = function() { item.style.background = 'rgba(255, 255, 255, 0.12)'; };
        item.onmouseout = function() { item.style.background = 'rgba(255, 255, 255, 0.08)'; };
        const leftSection = document.createElement('div');
        leftSection.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;';
        if (index !== null && index !== undefined) {
            const indexBadge = document.createElement('span');
            indexBadge.textContent = index;
            indexBadge.style.cssText = 'background: rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.7); font-size: 11px; font-weight: 600; min-width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
            leftSection.appendChild(indexBadge);
        }
        const nameText = document.createElement('span');
        nameText.textContent = text;
        nameText.style.cssText = 'color: white; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        leftSection.appendChild(nameText);
        item.appendChild(leftSection);
        if (statusText) {
            const statusBadge = document.createElement('span');
            statusBadge.className = 'elog-status-badge';
            statusBadge.textContent = statusText;
            let badgeColor = 'rgba(255, 255, 255, 0.7)';
            let badgeBg = 'rgba(255, 255, 255, 0.1)';
            if (statusType === 'pending') { badgeColor = '#ffd93d'; badgeBg = 'rgba(255, 217, 61, 0.2)'; }
            else if (statusType === 'found') { badgeColor = '#6bcf7f'; badgeBg = 'rgba(107, 207, 127, 0.2)'; }
            else if (statusType === 'notfound') { badgeColor = '#ff6b6b'; badgeBg = 'rgba(255, 107, 107, 0.2)'; }
            else if (statusType === 'duplicate') { badgeColor = '#ffa500'; badgeBg = 'rgba(255, 165, 0, 0.2)'; }
            statusBadge.style.cssText = 'color: ' + badgeColor + '; background: ' + badgeBg + '; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 10px; white-space: nowrap; flex-shrink: 0;';
            item.appendChild(statusBadge);
        }
        return item;
    }

    function showCollectingDataPanel(featureId, featureName) {
        addLogMessage('showCollectingDataPanel: showing for ' + featureId, 'log');
        var existing = document.getElementById(featureId + '-collecting-modal');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }
        var modal = document.createElement('div');
        modal.id = featureId + '-collecting-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 36px 48px; max-width: 420px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); text-align: center;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', featureId + '-collecting-title');
        var spinner = document.createElement('div');
        spinner.style.cssText = 'width: 48px; height: 48px; border: 4px solid rgba(255, 255, 255, 0.2); border-top-color: white; border-radius: 50%; margin: 0 auto 20px; animation: collectingSpin 0.8s linear infinite;';
        var styleTag = document.getElementById('collecting-spinner-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'collecting-spinner-style';
            styleTag.textContent = '@keyframes collectingSpin { to { transform: rotate(360deg); } }';
            document.head.appendChild(styleTag);
        }
        var title = document.createElement('h3');
        title.id = featureId + '-collecting-title';
        title.textContent = featureName || 'Please wait';
        title.style.cssText = 'margin: 0 0 8px 0; color: white; font-size: 18px; font-weight: 600;';
        var message = document.createElement('p');
        message.textContent = 'Please wait. Collecting data.';
        message.style.cssText = 'margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 15px; font-weight: 400;';
        container.appendChild(spinner);
        container.appendChild(title);
        container.appendChild(message);
        modal.appendChild(container);
        document.body.appendChild(modal);
        addLogMessage('showCollectingDataPanel: displayed for ' + featureId, 'log');
    }

    function removeCollectingDataPanel(featureId) {
        addLogMessage('removeCollectingDataPanel: removing for ' + featureId, 'log');
        var modal = document.getElementById(featureId + '-collecting-modal');
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    function populateELogLeftPanel() {
        addLogMessage('populateELogLeftPanel: populating with ' + elogState.scannedNames.length + ' names', 'log');
        var leftPanel = document.getElementById('elog-left-panel');
        if (!leftPanel) {
            addLogMessage('populateELogLeftPanel: left panel not found', 'error');
            return;
        }
        leftPanel.innerHTML = '';
        for (var i = 0; i < elogState.scannedNames.length; i++) {
            var item = createListItem(elogState.scannedNames[i], null, null, i + 1);
            leftPanel.appendChild(item);
        }
        addLogMessage('populateELogLeftPanel: populated ' + elogState.scannedNames.length + ' items', 'log');
    }

    function finalizeELogRightPanelAfterScan() {
        addLogMessage('finalizeELogRightPanelAfterScan: updating right panel statuses', 'log');
        var scannedNormSet = new Set();
        for (var si = 0; si < elogState.scannedNames.length; si++) {
            scannedNormSet.add(elogNormalizeName(elogState.scannedNames[si]));
        }
        for (var i = 0; i < elogState.parsedNames.length; i++) {
            var nameObj = elogState.parsedNames[i];
            if (scannedNormSet.has(nameObj.normalized)) {
                nameObj.status = 'Found';
                updateRightPanelItemStatus(nameObj.normalized, 'Found', 'found');
            } else {
                nameObj.status = 'Not Found';
                updateRightPanelItemStatus(nameObj.normalized, 'Not Found', 'notfound');
            }
        }
        addLogMessage('finalizeELogRightPanelAfterScan: completed', 'log');
    }

    function startELogScan() {
        addLogMessage('startELogScan: beginning scan with auto-scroll', 'log');
        elogState.scannedNames = [];
        elogState.seenNormalizedNames = new Set();
        waitForElement(ELOG_SELECTORS.mainTable, ELOG_TIMEOUTS.waitTableMs)
            .then(function(mainTable) {
            addLogMessage('startELogScan: main table found', 'log');
            return waitForElement(ELOG_SELECTORS.gridTable, ELOG_TIMEOUTS.waitGridMs);
        })
            .then(function(gridTable) {
            addLogMessage('startELogScan: grid table found, starting auto-scroll scan', 'log');
            autoScrollScan({
                onRow: function(name, normalized) {
                    addLogMessage('startELogScan: onRow callback for ' + name, 'log');
                },
                onProgress: function(data) {
                    addLogMessage('startELogScan: progress - scanned ' + data.scanned, 'log');
                },
                onDone: function(data) {
                    addLogMessage('startELogScan: done - total=' + data.total + ' reason=' + data.reason, 'log');
                    removeCollectingDataPanel('elog');
                    if (data.reason !== 'stopped' && elogState.isRunning) {
                        addLogMessage('startELogScan: scan complete, showing progress panel', 'log');
                        showELogProgressPanel();
                    }
                },
                onError: function(error) {
                    addLogMessage('startELogScan: error - ' + error.message, 'error');
                    removeCollectingDataPanel('elog');
                    showELogProgressPanel();
                    updateScanStatus('Error', 'error');
                    showInlineNotice('Error during auto-scroll scan: ' + error.message);
                }
            });
        })
            .catch(function(error) {
            addLogMessage('startELogScan: error during scan: ' + error, 'error');
            removeCollectingDataPanel('elog');
            showELogProgressPanel();
            updateScanStatus('Error', 'error');
            showInlineNotice('An error occurred during scanning. The table may not be fully loaded.');
        });
    }

    function waitForElement(selector, timeout) {
        addLogMessage('waitForElement: waiting for ' + selector, 'log');
        return new Promise(function(resolve, reject) {
            const element = document.querySelector(selector);
            if (element) { addLogMessage('waitForElement: element found immediately', 'log'); resolve(element); return; }
            const observer = new MutationObserver(function(mutations, obs) {
                const el = document.querySelector(selector);
                if (el) {
                    addLogMessage('waitForElement: element found via observer', 'log');
                    obs.disconnect();
                    const idx = elogState.observers.indexOf(obs);
                    if (idx > -1) { elogState.observers.splice(idx, 1); }
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            elogState.observers.push(observer);
            const timeoutId = setTimeout(function() {
                observer.disconnect();
                const idx = elogState.observers.indexOf(observer);
                if (idx > -1) { elogState.observers.splice(idx, 1); }
                addLogMessage('waitForElement: timeout waiting for ' + selector, 'warn');
                reject(new Error('Timeout waiting for ' + selector));
            }, timeout);
            elogState.timeouts.push(timeoutId);
        });
    }

    function scanExistingStaffNames() {
        if (!elogState.isRunning) { return; }
        try {
            const rows = document.querySelectorAll(ELOG_SELECTORS.row);
            let rowIndex = 0;
            const processedNames = new Set();
            var batchSize = 10;
            const processNextBatch = function() {
                if (!elogState.isRunning) { return; }
                if (rowIndex >= rows.length) { finalizeScan(); return; }
                var end = Math.min(rowIndex + batchSize, rows.length);
                for (var bi = rowIndex; bi < end; bi++) {
                    const row = rows[bi];
                    const extractedName = extractNameFromRow(row, bi + 1);
                    if (extractedName && !processedNames.has(extractedName)) {
                        processedNames.add(extractedName);
                        elogState.scannedNames.push(extractedName);
                        updateLeftPanelList(extractedName, bi + 1);
                        checkAndUpdateRightPanel(extractedName);
                    }
                }
                rowIndex = end;
                const timeoutId = setTimeout(processNextBatch, 0);
                elogState.timeouts.push(timeoutId);
            };
            processNextBatch();
        } catch (error) {
            addLogMessage('scanExistingStaffNames: error: ' + error, 'error');
            showInlineNotice('Error scanning rows: ' + error.message);
        }
    }

    function extractNameFromRow(row, rowNumber) {
        try {
            const cells = row.querySelectorAll(ELOG_SELECTORS.cell);
            if (cells.length <= ELOG_SELECTORS.nameCellIndex) { addLogMessage('extractNameFromRow: not enough cells in row ' + rowNumber, 'warn'); return null; }
            const targetCell = cells[ELOG_SELECTORS.nameCellIndex];
            const primaryElement = targetCell.querySelector(ELOG_SELECTORS.namePrimary);
            if (primaryElement) {
                const brElement = primaryElement.querySelector('br');
                if (brElement) {
                    let nameText = '';
                    for (let i = 0; i < primaryElement.childNodes.length; i++) {
                        const node = primaryElement.childNodes[i];
                        if (node.nodeName === 'BR') { break; }
                        if (node.nodeType === Node.TEXT_NODE) { nameText += node.textContent; }
                    }
                    nameText = nameText.trim().replace(/\s+/g, ' ');
                    if (nameText) { return nameText; }
                } else {
                    let nameText = primaryElement.textContent.trim().replace(/\s+/g, ' ');
                    if (nameText) { return nameText; }
                }
            }
            const fallbackElement = targetCell.querySelector(ELOG_SELECTORS.nameFallback);
            if (fallbackElement) {
                let nameText = fallbackElement.textContent.trim().replace(/\s+/g, ' ');
                if (nameText) { return nameText; }
            }
            return null;
        } catch (error) {
            addLogMessage('extractNameFromRow: error in row ' + rowNumber + ': ' + error, 'error');
            return null;
        }
    }

    function updateLeftPanelList(name, rowNumber) {
        const leftPanel = document.getElementById('elog-left-panel');
        if (!leftPanel) { addLogMessage('updateLeftPanelList: left panel not found', 'error'); return; }
        const item = createListItem(name, null, null, rowNumber);
        leftPanel.appendChild(item);
        const searchInput = document.getElementById('elog-left-search');
        if (searchInput && searchInput.value.trim()) { filterSubpanelList('elog-left-panel', searchInput.value); }
    }

    function checkAndUpdateRightPanel(scannedName) {
        const normalizedScanned = elogNormalizeName(scannedName);
        for (let i = 0; i < elogState.parsedNames.length; i++) {
            const nameObj = elogState.parsedNames[i];
            if (nameObj.normalized === normalizedScanned && nameObj.status === 'Pending') {
                nameObj.status = 'Found';
                updateRightPanelItemStatus(nameObj.normalized, 'Found', 'found');
            }
        }
    }

    function updateRightPanelItemStatus(normalized, statusText, statusType) {
        const rightPanel = document.getElementById('elog-right-panel');
        if (!rightPanel) { return; }
        const items = rightPanel.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.getAttribute('data-normalized') === normalized) {
                const badge = item.querySelector('.elog-status-badge');
                if (badge) {
                    badge.textContent = statusText;
                    let badgeColor = 'rgba(255, 255, 255, 0.7)';
                    let badgeBg = 'rgba(255, 255, 255, 0.1)';
                    if (statusType === 'found') { badgeColor = '#6bcf7f'; badgeBg = 'rgba(107, 207, 127, 0.2)'; }
                    else if (statusType === 'notfound') { badgeColor = '#ff6b6b'; badgeBg = 'rgba(255, 107, 107, 0.2)'; }
                    else if (statusType === 'pending') { badgeColor = '#ffd93d'; badgeBg = 'rgba(255, 217, 61, 0.2)'; }
                    badge.style.color = badgeColor;
                    badge.style.background = badgeBg;
                }
                break;
            }
        }
    }

    function finalizeScan() {
        addLogMessage('finalizeScan: marking remaining as Not Found', 'log');
        for (let i = 0; i < elogState.parsedNames.length; i++) {
            const nameObj = elogState.parsedNames[i];
            if (nameObj.status === 'Pending') {
                nameObj.status = 'Not Found';
                updateRightPanelItemStatus(nameObj.normalized, 'Not Found', 'notfound');
            }
        }
        updateScanStatus('Complete', 'complete');
        addLogMessage('finalizeScan: scan completed', 'log');
    }

    function updateScanStatus(statusText, statusType) {
        addLogMessage('updateScanStatus: ' + statusText, 'log');
        const badge = document.getElementById('elog-status-badge');
        const title = document.getElementById('elog-progress-title');
        if (badge) {
            badge.textContent = statusText;
            if (statusType === 'complete') { badge.style.background = 'rgba(107, 207, 127, 0.3)'; badge.style.color = '#6bcf7f'; }
            else if (statusType === 'error') { badge.style.background = 'rgba(255, 107, 107, 0.3)'; badge.style.color = '#ff6b6b'; }
            else { badge.style.background = 'rgba(255, 217, 61, 0.3)'; badge.style.color = '#ffd93d'; }
        }
        if (title && statusType === 'complete') { title.textContent = 'ELog Staff Entries - Complete'; }
    }

    function performRescan() {
        addLogMessage('performRescan: restarting scan with auto-scroll', 'log');
        for (let i = 0; i < elogState.observers.length; i++) {
            try {
                elogState.observers[i].disconnect();
            } catch (e) {
                addLogMessage('performRescan: error disconnecting observer: ' + e, 'error');
            }
        }
        elogState.observers = [];
        for (let i = 0; i < elogState.timeouts.length; i++) {
            try {
                clearTimeout(elogState.timeouts[i]);
            } catch (e) {
                addLogMessage('performRescan: error clearing timeout: ' + e, 'error');
            }
        }
        elogState.timeouts = [];
        if (elogState.idleCallbackId && typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(elogState.idleCallbackId);
            elogState.idleCallbackId = null;
        }
        elogState.scannedNames = [];
        elogState.seenNormalizedNames = new Set();
        elogState.leftPanelRowIndex = 0;
        elogState.userScrollPaused = false;
        elogState.isAddingEntries = false;
        elogState.addQueue = [];
        elogState.addQueueIndex = 0;
        for (let pi = 0; pi < elogState.parsedNames.length; pi++) {
            elogState.parsedNames[pi].status = 'Pending';
        }
        var progressModal = document.getElementById('elog-progress-modal');
        if (progressModal && progressModal.parentNode) {
            progressModal.parentNode.removeChild(progressModal);
        }
        showCollectingDataPanel('elog', 'Add Training Log Staff Entries');
        addLogMessage('performRescan: starting auto-scroll scan', 'log');
        autoScrollScan({
            onRow: function(name, normalized) {
                addLogMessage('performRescan: onRow callback for ' + name, 'log');
            },
            onProgress: function(data) {
                addLogMessage('performRescan: progress - scanned ' + data.scanned, 'log');
            },
            onDone: function(data) {
                addLogMessage('performRescan: done - total=' + data.total + ' reason=' + data.reason, 'log');
                removeCollectingDataPanel('elog');
                if (data.reason !== 'stopped' && elogState.isRunning) {
                    addLogMessage('performRescan: re-scan complete, showing progress panel', 'log');
                    showELogProgressPanel();
                }
            },
            onError: function(error) {
                addLogMessage('performRescan: error - ' + error.message, 'error');
                removeCollectingDataPanel('elog');
                showELogProgressPanel();
                updateScanStatus('Error', 'error');
                showInlineNotice('Error during re-scan: ' + error.message);
            }
        });
    }

    function showInlineNotice(message) {
        addLogMessage('showInlineNotice: ' + message, 'warn');
        const container = document.getElementById('elog-progress-container');
        if (!container) { return; }
        const existingNotice = container.querySelector('.elog-inline-notice');
        if (existingNotice) { existingNotice.remove(); }
        const notice = document.createElement('div');
        notice.className = 'elog-inline-notice';
        notice.style.cssText = 'background: rgba(255, 193, 7, 0.2); border-left: 4px solid #ffc107; border-radius: 6px; padding: 10px 14px; margin-top: 12px; color: white; font-size: 13px; line-height: 1.4;';
        notice.textContent = message;
        container.appendChild(notice);
    }

    function getFirstAndLast(name) {
        if (!name || !name.trim()) {
            return ['', ''];
        }
        const suffixPattern = /^(jr|sr|ii|iii|iv)\.?$/i;
        const trimmed = name.trim().replace(/\s+/g, ' ');
        const tokens = trimmed.split(' ');
        const filtered = [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i]) {
                filtered.push(tokens[i]);
            }
        }
        if (filtered.length === 0) {
            return ['', ''];
        }
        if (filtered.length === 1) {
            return [filtered[0], filtered[0]];
        }
        const first = filtered[0];
        let last = filtered[filtered.length - 1];
        if (filtered.length > 2 && suffixPattern.test(last)) {
            last = filtered[filtered.length - 2];
        }
        return [first, last];
    }

    function normalizeFirstLastPair(name) {
        if (!name || !name.trim()) { return ''; }
        const trimmed = name.trim();
        if (trimmed.indexOf(',') !== -1) {
            const commaParts = trimmed.split(',');
            const lastPart = commaParts[0].trim();
            const firstPart = commaParts.slice(1).join(',').trim();
            const firstToken = firstPart.split(/\s+/)[0] || '';
            const lastTokens = lastPart.split(/\s+/);
            const lastToken = lastTokens[lastTokens.length - 1] || lastPart;
            return elogNormalizeName(firstToken + ' ' + lastToken);
        }
        const pair = getFirstAndLast(name);
        return elogNormalizeName(pair[0] + ' ' + pair[1]);
    }

    function buildCandidatePairKeys(name) {
        addLogMessage('[Florence] buildCandidatePairKeys: input="' + name + '"', 'log');
        if (!name || !name.trim()) {
            return { searchTerm: '', pairKeys: [], searchTerms: [] };
        }
        var trimmed = name.trim().replace(/\s+/g, ' ');
        var tokens = trimmed.split(' ');
        var filtered = [];
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i]) {
                filtered.push(tokens[i]);
            }
        }
        if (filtered.length === 0) {
            return { searchTerm: '', pairKeys: [], searchTerms: [] };
        }
        var word1 = filtered[0];
        if (filtered.length === 1) {
            var singleKey = elogNormalizeName(word1 + ' ' + word1);
            addLogMessage('[Florence] buildCandidatePairKeys: single word, pairKeys=[' + singleKey + ']', 'log');
            return { searchTerm: word1, pairKeys: [singleKey], searchTerms: [word1] };
        }
        var word2 = filtered[1];
        if (filtered.length === 2) {
            var twoWordKey = elogNormalizeName(word1 + ' ' + word2);
            addLogMessage('[Florence] buildCandidatePairKeys: two words, pairKeys=[' + twoWordKey + ']', 'log');
            return { searchTerm: word1, pairKeys: [twoWordKey], searchTerms: [word1, word2] };
        }
        var maxWord = Math.min(filtered.length, MAX_NAME_SEARCH_WORD_INDEX);
        var wordOrder = [2, 1];
        for (var wi = 3; wi < maxWord; wi++) {
            wordOrder.push(wi);
        }
        var pairKeys = [];
        var seenKeys = {};
        for (var oi = 0; oi < wordOrder.length; oi++) {
            var idx = wordOrder[oi];
            if (idx < filtered.length) {
                var pk = elogNormalizeName(word1 + ' ' + filtered[idx]);
                if (!seenKeys[pk]) {
                    seenKeys[pk] = true;
                    pairKeys.push(pk);
                }
            }
        }
        var searchTerms = [word1];
        var seenTerms = {};
        seenTerms[word1.toLowerCase()] = true;
        for (var si = 0; si < wordOrder.length; si++) {
            var sidx = wordOrder[si];
            if (sidx < filtered.length) {
                var term = filtered[sidx];
                var termLower = term.toLowerCase();
                if (!seenTerms[termLower]) {
                    seenTerms[termLower] = true;
                    searchTerms.push(term);
                }
            }
        }
        addLogMessage('[Florence] buildCandidatePairKeys: ' + filtered.length + ' words, searchTerms=[' + searchTerms.join(', ') + '] pairKeys=[' + pairKeys.join(', ') + ']', 'log');
        return { searchTerm: word1, pairKeys: pairKeys, searchTerms: searchTerms };
    }

    function tryNameSearchTermsSequentially(searchTerms, termIndex, inputEl, targetPairKey, selectors, timeouts, state, candidates, logPrefix, resolve) {
        if (termIndex >= searchTerms.length) {
            addLogMessage(logPrefix + ': all ' + searchTerms.length + ' search terms exhausted, marking as not found', 'log');
            clearFilteredInput(inputEl);
            resolve(false);
            return;
        }
        var term = searchTerms[termIndex];
        var stepLabel = logPrefix + '[term ' + (termIndex + 1) + '/' + searchTerms.length + ' "' + term + '"]';

        if (termIndex === 0) {
            typeIntoFilteredInput(inputEl, term);
            var tid = setTimeout(function() {
                if (!state.isRunning) {
                    clearFilteredInput(inputEl);
                    resolve(false);
                    return;
                }
                reopenDropdownIfClosed(state).then(function() {
                    var match = scanFilteredOptionsForMatch(targetPairKey, selectors, candidates);
                    if (match) {
                        addLogMessage(stepLabel + ': found (' + match.matchType + ')', 'log');
                        state.activeDropdown = null;
                        match.element.click();
                        var verifyTid = setTimeout(function() {
                            resolve(true);
                        }, timeouts.settleMs);
                        state.timeouts.push(verifyTid);
                        return;
                    }
                    addLogMessage(stepLabel + ': not found, trying next term', 'log');
                    tryNameSearchTermsSequentially(searchTerms, termIndex + 1, inputEl, targetPairKey, selectors, timeouts, state, candidates, logPrefix, resolve);
                });
            }, timeouts.waitFilterMs);
            state.timeouts.push(tid);
        } else {
            clearFilteredInput(inputEl);
            var clearTid = setTimeout(function() {
                typeIntoFilteredInput(inputEl, term);
                var filterTid = setTimeout(function() {
                    if (!state.isRunning) {
                        clearFilteredInput(inputEl);
                        resolve(false);
                        return;
                    }
                    reopenDropdownIfClosed(state).then(function() {
                        var match = scanFilteredOptionsForMatch(targetPairKey, selectors, candidates);
                        if (match) {
                            addLogMessage(stepLabel + ': found (' + match.matchType + ')', 'log');
                            state.activeDropdown = null;
                            match.element.click();
                            var verifyTid = setTimeout(function() {
                                resolve(true);
                            }, timeouts.settleMs);
                            state.timeouts.push(verifyTid);
                            return;
                        }
                        addLogMessage(stepLabel + ': not found, trying next term', 'log');
                        tryNameSearchTermsSequentially(searchTerms, termIndex + 1, inputEl, targetPairKey, selectors, timeouts, state, candidates, logPrefix, resolve);
                    });
                }, timeouts.waitLastNameFilterMs);
                state.timeouts.push(filterTid);
            }, timeouts.settleMs);
            state.timeouts.push(clearTid);
        }
    }

    function buildExistingPairsFromScan(scannedNamesArray) {
        addLogMessage('buildExistingPairsFromScan: building from ' + scannedNamesArray.length + ' names', 'log');
        const pairs = new Set();
        for (let i = 0; i < scannedNamesArray.length; i++) {
            const pk = normalizeFirstLastPair(scannedNamesArray[i]);
            if (pk) {
                pairs.add(pk);
            }
        }
        addLogMessage('buildExistingPairsFromScan: built ' + pairs.size + ' pairs', 'log');
        return pairs;
    }

    function buildUserQueueSorted(userNamesArray) {
        addLogMessage('buildUserQueueSorted: building from ' + userNamesArray.length + ' names', 'log');
        const seenPairKeys = new Set();
        const unique = [];
        const duplicateIndices = [];
        for (let i = 0; i < userNamesArray.length; i++) {
            const nameObj = userNamesArray[i];
            const pk = normalizeFirstLastPair(nameObj.display);
            if (seenPairKeys.has(pk)) {
                addLogMessage('buildUserQueueSorted: input duplicate pairKey=' + pk + ' display=' + nameObj.display, 'log');
                duplicateIndices.push(i);
                continue;
            }
            seenPairKeys.add(pk);
            var candidates = buildCandidatePairKeys(nameObj.display);
            unique.push({
                display: nameObj.display,
                normalized: nameObj.normalized,
                pairKey: pk,
                candidatePairKeys: candidates.pairKeys,
                status: ELOG_RUN_LABELS.statusPending
            });
        }
        addLogMessage('buildUserQueueSorted: unique=' + unique.length + ' duplicates=' + duplicateIndices.length, 'log');
        return { queue: unique, duplicateIndices: duplicateIndices };
    }

    function updateRightPanelStatus(pairKey, newStatus) {
        addLogMessage('updateRightPanelStatus: pairKey=' + pairKey + ' status=' + newStatus, 'log');
        const rightPanel = document.getElementById('elog-right-panel');
        if (!rightPanel) {
            addLogMessage('updateRightPanelStatus: right panel not found', 'error');
            return;
        }
        const items = rightPanel.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemPairKey = item.getAttribute('data-pairkey');
            if (!itemPairKey) {
                continue;
            }
            if (itemPairKey === pairKey) {
                const badge = item.querySelector('.elog-status-badge');
                if (badge) {
                    badge.textContent = newStatus;
                    let badgeColor = 'rgba(255, 255, 255, 0.7)';
                    let badgeBg = 'rgba(255, 255, 255, 0.1)';
                    if (newStatus === ELOG_RUN_LABELS.statusAdded) {
                        badgeColor = '#6bcf7f';
                        badgeBg = 'rgba(107, 207, 127, 0.2)';
                    }
                    else if (newStatus === ELOG_RUN_LABELS.statusAlready) {
                        badgeColor = '#ffa500';
                        badgeBg = 'rgba(255, 165, 0, 0.2)';
                    }
                    else if (newStatus === ELOG_RUN_LABELS.statusNotInDropdown || newStatus === ELOG_RUN_LABELS.statusSelectionFailed || newStatus === ELOG_RUN_LABELS.statusSaveFailed) {
                        badgeColor = '#ff6b6b';
                        badgeBg = 'rgba(255, 107, 107, 0.2)';
                    }
                    else if (newStatus === ELOG_RUN_LABELS.statusStopped) {
                        badgeColor = '#aaa';
                        badgeBg = 'rgba(170, 170, 170, 0.2)';
                    }
                    else if (newStatus === ELOG_RUN_LABELS.statusPending) {
                        badgeColor = '#ffd93d';
                        badgeBg = 'rgba(255, 217, 61, 0.2)';
                    }
                    badge.style.color = badgeColor;
                    badge.style.background = badgeBg;
                }
                addLogMessage('updateRightPanelStatus: updated item for pairKey=' + pairKey, 'log');
                break;
            }
        }
    }

    function updateRightPanelSummary(counters) {
        addLogMessage('updateRightPanelSummary: total=' + counters.total + ' added=' + counters.added + ' dup=' + counters.duplicates + ' fail=' + counters.failures + ' pending=' + counters.pending, 'log');
        const totalEl = document.getElementById('elog-summary-total');
        const addedEl = document.getElementById('elog-summary-added');
        const dupEl = document.getElementById('elog-summary-duplicates');
        const failEl = document.getElementById('elog-summary-failures');
        const pendingEl = document.getElementById('elog-summary-pending');
        const percentEl = document.getElementById('elog-summary-percent');
        if (totalEl) {
            totalEl.textContent = String(counters.total);
        }
        if (addedEl) {
            addedEl.textContent = String(counters.added);
        }
        if (dupEl) {
            dupEl.textContent = String(counters.duplicates);
        }
        if (failEl) {
            failEl.textContent = String(counters.failures);
        }
        if (pendingEl) {
            pendingEl.textContent = String(counters.pending);
        }
        if (percentEl) {
            const processed = counters.total - counters.pending;
            const pct = counters.total > 0 ? Math.round((processed / counters.total) * 100) : 0;
            percentEl.textContent = pct + '%';
        }
        updateAriaLiveRegion('Added: ' + counters.added + ', Duplicates: ' + counters.duplicates + ', Pending: ' + counters.pending);
    }

    function ensureAddEntryFormOpen() {
        addLogMessage('ensureAddEntryFormOpen: checking form state', 'log');
        return new Promise(function(resolve, reject) {
            const memberInput = document.querySelector(ELOG_FORM_SELECTORS.memberInput);
            if (memberInput) {
                addLogMessage('ensureAddEntryFormOpen: member input already present', 'log');
                resolve(memberInput);
                return;
            }
            const addBtn = document.querySelector(ELOG_FORM_SELECTORS.addEntryBtn);
            if (addBtn) {
                addLogMessage('ensureAddEntryFormOpen: clicking Add Entry button', 'log');
                addBtn.click();
            } else {
                addLogMessage('ensureAddEntryFormOpen: Add Entry button not found, waiting for input', 'warn');
            }
            waitForElement(ELOG_FORM_SELECTORS.memberInput, ELOG_FORM_TIMEOUTS.waitOpenMs)
                .then(function(el) {
                addLogMessage('ensureAddEntryFormOpen: member input found', 'log');
                resolve(el);
            })
                .catch(function(err) {
                addLogMessage('ensureAddEntryFormOpen: timeout waiting for member input: ' + err, 'error');
                reject(err);
            });
        });
    }

    function ensureMemberDropdownOpen() {
        addLogMessage('ensureMemberDropdownOpen: checking dropdown', 'log');
        return new Promise(function(resolve, reject) {
            let retries = 0;
            function tryOpen() {
                addLogMessage('ensureMemberDropdownOpen: attempt ' + (retries + 1), 'log');
                const listEl = document.querySelector(ELOG_FORM_SELECTORS.listContainer);
                if (listEl) {
                    addLogMessage('ensureMemberDropdownOpen: list already open', 'log');
                    elogState.activeDropdown = { inputSelector: ELOG_FORM_SELECTORS.memberInput, listSelector: ELOG_FORM_SELECTORS.listContainer };
                    resolve(listEl);
                    return;
                }
                const inputEl = document.querySelector(ELOG_FORM_SELECTORS.memberInput);
                if (inputEl) {
                    addLogMessage('ensureMemberDropdownOpen: clicking input to open list', 'log');
                    inputEl.click();
                    inputEl.focus();
                }
                waitForElement(ELOG_FORM_SELECTORS.listContainer, ELOG_FORM_TIMEOUTS.waitListMs)
                    .then(function(el) {
                    addLogMessage('ensureMemberDropdownOpen: list opened', 'log');
                    elogState.activeDropdown = { inputSelector: ELOG_FORM_SELECTORS.memberInput, listSelector: ELOG_FORM_SELECTORS.listContainer };
                    resolve(el);
                })
                    .catch(function(err) {
                    retries++;
                    if (retries < ELOG_FORM_RETRY.openListRetries) {
                        addLogMessage('ensureMemberDropdownOpen: retry ' + retries, 'warn');
                        const tid = setTimeout(tryOpen, 300);
                        elogState.timeouts.push(tid);
                    } else {
                        addLogMessage('ensureMemberDropdownOpen: exhausted retries', 'error');
                        reject(err);
                    }
                });
            }
            tryOpen();
        });
    }

    function reopenDropdownIfClosed(state) {
        if (!state.activeDropdown) {
            return Promise.resolve();
        }
        var listEl = document.querySelector(state.activeDropdown.listSelector);
        if (listEl) {
            return Promise.resolve();
        }
        addLogMessage('reopenDropdownIfClosed: dropdown closed, reopening via ' + state.activeDropdown.inputSelector, 'log');
        var inputEl = document.querySelector(state.activeDropdown.inputSelector);
        if (!inputEl) {
            addLogMessage('reopenDropdownIfClosed: input element not found for selector ' + state.activeDropdown.inputSelector, 'warn');
            return Promise.resolve();
        }
        inputEl.click();
        inputEl.focus();
        if (inputEl.value) {
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        var savedListSelector = state.activeDropdown.listSelector;
        var waitMs = 3000;
        return new Promise(function(resolve) {
            var checkCount = 0;
            var maxChecks = Math.ceil(waitMs / 200);
            function checkList() {
                var el = document.querySelector(savedListSelector);
                if (el) {
                    addLogMessage('reopenDropdownIfClosed: dropdown reopened successfully', 'log');
                    resolve();
                    return;
                }
                checkCount++;
                if (checkCount >= maxChecks) {
                    addLogMessage('reopenDropdownIfClosed: timeout waiting for dropdown to reopen', 'warn');
                    resolve();
                    return;
                }
                var tid = setTimeout(checkList, 200);
                state.timeouts.push(tid);
            }
            var initialTid = setTimeout(checkList, 200);
            state.timeouts.push(initialTid);
        });
    }

    function findDropdownViewportElement() {
        addLogMessage('findDropdownViewportElement: searching', 'log');
        const el = document.querySelector(ELOG_FORM_SELECTORS.virtualViewport);
        if (el) {
            addLogMessage('findDropdownViewportElement: found', 'log');
        } else {
            addLogMessage('findDropdownViewportElement: not found', 'warn');
        }
        return el;
    }

    function rememberListScrollPosition(viewportEl) {
        if (viewportEl) {
            elogState.listScrollTop = viewportEl.scrollTop;
            addLogMessage('rememberListScrollPosition: saved=' + elogState.listScrollTop, 'log');
        }
    }

    function restoreListScrollPosition(viewportEl) {
        if (viewportEl && elogState.listScrollTop > 0) {
            viewportEl.scrollTop = elogState.listScrollTop;
            addLogMessage('restoreListScrollPosition: restored=' + elogState.listScrollTop, 'log');
        }
    }

    function typeIntoFilteredInput(inputEl, text) {
        addLogMessage('typeIntoFilteredInput: typing "' + text + '"', 'log');
        inputEl.focus();
        inputEl.value = text;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function clearFilteredInput(inputEl) {
        addLogMessage('clearFilteredInput: clearing input', 'log');
        inputEl.focus();
        inputEl.value = '';
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function scanFilteredOptionsForMatch(targetPairKey, selectorSet, candidatePairKeys) {
        var matchKeys = candidatePairKeys && candidatePairKeys.length > 0 ? candidatePairKeys : [targetPairKey];
        var options = document.querySelectorAll(selectorSet.optionItem);
        addLogMessage('scanFilteredOptionsForMatch: checking ' + options.length + ' options against candidates=[' + matchKeys.join(', ') + ']', 'log');
        for (var oi = 0; oi < options.length; oi++) {
            var optText = options[oi].getAttribute('aria-label') || (options[oi].textContent || '').trim();
            optText = optText.trim();
            var optPairKey = normalizeFirstLastPair(optText);
            for (var ki = 0; ki < matchKeys.length; ki++) {
                if (optPairKey === matchKeys[ki]) {
                    addLogMessage('scanFilteredOptionsForMatch: exact match at index ' + oi + ' text=' + optText + ' matchedKey=' + matchKeys[ki], 'log');
                    return { element: options[oi], matchType: 'exact' };
                }
            }
        }
        for (var si = 0; si < options.length; si++) {
            var sOptText = options[si].getAttribute('aria-label') || (options[si].textContent || '').trim();
            sOptText = sOptText.trim();
            var sOptPairKey = normalizeFirstLastPair(sOptText);
            var optParts = sOptPairKey.split(' ');
            for (var ki2 = 0; ki2 < matchKeys.length; ki2++) {
                var targetParts = matchKeys[ki2].split(' ');
                if (targetParts.length >= 2 && optParts.length >= 2) {
                    if (targetParts[0] === optParts[0] && targetParts[targetParts.length - 1] === optParts[optParts.length - 1]) {
                        addLogMessage('scanFilteredOptionsForMatch: similar match at index ' + si + ' text=' + sOptText + ' matchedKey=' + matchKeys[ki2], 'log');
                        return { element: options[si], matchType: 'similar' };
                    }
                }
            }
        }
        addLogMessage('scanFilteredOptionsForMatch: no match found', 'log');
        return null;
    }

    function attemptSelectByScrollingForName(targetDisplay, targetPairKey, candidatePairKeys) {
        var searchInfo = buildCandidatePairKeys(targetDisplay);
        var candidates = candidatePairKeys && candidatePairKeys.length > 0 ? candidatePairKeys : searchInfo.pairKeys;
        var searchTerms = searchInfo.searchTerms;
        addLogMessage('[Florence] attemptSelectByScrollingForName: target=' + targetDisplay + ' searchTerms=[' + searchTerms.join(', ') + '] candidates=[' + candidates.join(', ') + ']', 'log');
        return new Promise(function(resolve) {
            var inputEl = document.querySelector(ELOG_FORM_SELECTORS.memberInput);
            if (!inputEl) {
                addLogMessage('attemptSelectByScrollingForName: member input not found', 'error');
                resolve(false);
                return;
            }
            tryNameSearchTermsSequentially(searchTerms, 0, inputEl, targetPairKey, ELOG_FORM_SELECTORS, ELOG_FORM_TIMEOUTS, elogState, candidates, 'attemptSelectByScrollingForName', resolve);
        });
    }

    function scrollSearchForName(targetPairKey, selectors, timeouts, retryConfig, state, resolve, candidatePairKeys) {
        var matchKeys = candidatePairKeys && candidatePairKeys.length > 0 ? candidatePairKeys : [targetPairKey];
        addLogMessage('scrollSearchForName: fallback scroll for candidates=[' + matchKeys.join(', ') + ']', 'log');
        var viewportEl = document.querySelector(selectors.virtualViewport);
        if (!viewportEl) {
            addLogMessage('scrollSearchForName: no viewport element', 'error');
            resolve(false);
            return;
        }
        var passCount = 0;
        var lastScrollTop = -1;
        var lastOptionSnapshot = '';
        var startTime = Date.now();
        function scanAndScroll() {
            if (!state.isRunning) {
                resolve(false);
                return;
            }
            if (Date.now() - startTime > timeouts.maxSelectDurationMs) {
                addLogMessage('scrollSearchForName: max duration exceeded', 'warn');
                resolve(false);
                return;
            }
            if (passCount >= retryConfig.maxScrollPasses) {
                addLogMessage('scrollSearchForName: max passes reached', 'warn');
                resolve(false);
                return;
            }
            reopenDropdownIfClosed(state).then(function() {
                var freshViewport = document.querySelector(selectors.virtualViewport);
                if (freshViewport) {
                    viewportEl = freshViewport;
                }
                doScanAndScroll();
            });
        }
        function doScanAndScroll() {
            var options = document.querySelectorAll(selectors.optionItem);
            var retryCount = 0;
            function tryScanOptions() {
                options = document.querySelectorAll(selectors.optionItem);
                if (options.length === 0 && retryCount < retryConfig.selectRetriesPerScroll) {
                    retryCount++;
                    var rtid = setTimeout(tryScanOptions, timeouts.waitOptionRenderMs);
                    state.timeouts.push(rtid);
                    return;
                }
                var found = false;
                var optionTexts = [];
                for (var oi = 0; oi < options.length; oi++) {
                    var optText = options[oi].getAttribute('aria-label') || (options[oi].textContent || '').trim();
                    optText = optText.trim();
                    optionTexts.push(optText);
                    var optPairKey = normalizeFirstLastPair(optText);
                    var matched = false;
                    for (var mki = 0; mki < matchKeys.length; mki++) {
                        if (optPairKey === matchKeys[mki]) {
                            matched = true;
                            break;
                        }
                    }
                    if (matched) {
                        addLogMessage('scrollSearchForName: match found at index ' + oi + ' text=' + optText, 'log');
                        state.activeDropdown = null;
                        options[oi].click();
                        found = true;
                        var verifyTid = setTimeout(function() {
                            resolve(true);
                        }, timeouts.settleMs);
                        state.timeouts.push(verifyTid);
                        break;
                    }
                }
                if (!found) {
                    var currentSnapshot = optionTexts.join('|');
                    var currentTop = viewportEl.scrollTop;
                    var noProgress = (currentTop === lastScrollTop && currentSnapshot === lastOptionSnapshot);
                    if (noProgress) {
                        passCount++;
                        addLogMessage('scrollSearchForName: no progress pass ' + passCount, 'log');
                    }
                    lastScrollTop = currentTop;
                    lastOptionSnapshot = currentSnapshot;
                    var stepSize = Math.round(viewportEl.clientHeight * 0.7);
                    var maxScroll = viewportEl.scrollHeight - viewportEl.clientHeight;
                    var newTop = Math.min(currentTop + stepSize, maxScroll);
                    if (newTop <= currentTop && currentTop > 0) {
                        newTop = 0;
                        lastScrollTop = -1;
                        lastOptionSnapshot = '';
                        passCount++;
                    }
                    viewportEl.scrollTop = newTop;
                    var scrollTid = setTimeout(scanAndScroll, timeouts.scrollIdleMs);
                    state.timeouts.push(scrollTid);
                }
            }
            tryScanOptions();
        }
        var initTid = setTimeout(scanAndScroll, timeouts.scrollIdleMs);
        state.timeouts.push(initTid);
    }

    function clickSaveAndAddAnother() {
        addLogMessage('clickSaveAndAddAnother: searching for button', 'log');
        return new Promise(function(resolve) {
            var buttons = document.querySelectorAll(ELOG_FORM_SELECTORS.saveAndAddAnotherBtn);
            var targetBtn = null;
            for (var bi = 0; bi < buttons.length; bi++) {
                var btnText = (buttons[bi].innerText || '').toLowerCase();
                if (btnText.indexOf('save') !== -1 && btnText.indexOf('add another') !== -1) {
                    targetBtn = buttons[bi];
                    break;
                }
            }
            if (!targetBtn) {
                addLogMessage('clickSaveAndAddAnother: button not found', 'error');
                resolve('not_found');
                return;
            }
            if (targetBtn.disabled || targetBtn.getAttribute('disabled') !== null) {
                addLogMessage('clickSaveAndAddAnother: button is disabled', 'warn');
                resolve('disabled');
                return;
            }
            addLogMessage('clickSaveAndAddAnother: clicking button', 'log');
            targetBtn.click();
            var waitStart = Date.now();
            function checkSaveResult() {
                if (Date.now() - waitStart > ELOG_FORM_TIMEOUTS.waitSaveAfterClickMs) {
                    addLogMessage('clickSaveAndAddAnother: timeout waiting for save result', 'warn');
                    resolve('timeout');
                    return;
                }
                var inputEl = document.querySelector(ELOG_FORM_SELECTORS.memberInput);
                if (inputEl && (!inputEl.value || !inputEl.value.trim())) {
                    addLogMessage('clickSaveAndAddAnother: input cleared, save successful', 'log');
                    resolve('success');
                    return;
                }
                var listGone = !document.querySelector(ELOG_FORM_SELECTORS.listContainer);
                if (listGone && inputEl && (!inputEl.value || !inputEl.value.trim())) {
                    addLogMessage('clickSaveAndAddAnother: list closed and input clear', 'log');
                    resolve('success');
                    return;
                }
                var tid = setTimeout(checkSaveResult, 200);
                elogState.timeouts.push(tid);
            }
            var initTid = setTimeout(checkSaveResult, 300);
            elogState.timeouts.push(initTid);
        });
    }

    function processNextStaffFromQueue() {
        addLogMessage('processNextStaffFromQueue: index=' + elogState.addQueueIndex + ' of ' + elogState.addQueue.length, 'log');
        if (elogState.isPaused) {
            addLogMessage('processNextStaffFromQueue: paused, waiting for resume', 'log');
            return;
        }
        if (!elogState.isRunning) {
            addLogMessage('processNextStaffFromQueue: stopped, marking remaining as Stopped', 'warn');
            for (var si = elogState.addQueueIndex; si < elogState.addQueue.length; si++) {
                if (elogState.addQueue[si].status === ELOG_RUN_LABELS.statusPending) {
                    elogState.addQueue[si].status = ELOG_RUN_LABELS.statusStopped;
                    updateRightPanelStatus(elogState.addQueue[si].pairKey, ELOG_RUN_LABELS.statusStopped);
                    elogState.counters.pending--;
                }
            }
            updateRightPanelSummary(elogState.counters);
            elogState.isAddingEntries = false;
            updateScanStatus('Stopped', 'stopped');
            var title = document.getElementById('elog-progress-title');
            if (title) {
                title.textContent = 'ELog Staff Entries - Stopped';
            }
            var pauseBtn = document.getElementById('elog-pause-btn');
            if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.style.opacity = '0.4'; pauseBtn.style.cursor = 'default'; }
            if (elogState.focusReturnElement) {
                elogState.focusReturnElement.focus();
            }
            return;
        }
        if (elogState.addQueueIndex >= elogState.addQueue.length) {
            addLogMessage('processNextStaffFromQueue: all candidates processed', 'log');
            elogState.isAddingEntries = false;
            updateScanStatus('Complete', 'complete');
            var titleEl = document.getElementById('elog-progress-title');
            if (titleEl) {
                titleEl.textContent = 'ELog Staff Entries - Complete';
            }
            var pauseBtnDone = document.getElementById('elog-pause-btn');
            if (pauseBtnDone) { pauseBtnDone.disabled = true; pauseBtnDone.style.opacity = '0.4'; pauseBtnDone.style.cursor = 'default'; }
            updateRightPanelSummary(elogState.counters);
            updateAriaLiveRegion('Processing complete. Added: ' + elogState.counters.added + ', Duplicates: ' + elogState.counters.duplicates + ', Failures: ' + elogState.counters.failures);
            if (elogState.counters.added > 0) {
                var existingBtn = document.getElementById('elog-select-checkboxes-btn');
                if (!existingBtn) {
                    var btnContainer = document.getElementById('elog-right-panel');
                    if (btnContainer) {
                        var selectBtn = document.createElement('button');
                        selectBtn.id = 'elog-select-checkboxes-btn';
                        selectBtn.textContent = 'Select Checkboxes';
                        selectBtn.style.cssText = 'display: block; width: 100%; margin-top: 12px; padding: 10px 16px; background: rgba(100, 149, 237, 0.3); color: #6495ed; border: 1px solid rgba(100, 149, 237, 0.4); border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s ease;';
                        selectBtn.onmouseover = function() { selectBtn.style.background = 'rgba(100, 149, 237, 0.45)'; };
                        selectBtn.onmouseout = function() { selectBtn.style.background = 'rgba(100, 149, 237, 0.3)'; };
                        selectBtn.onclick = function() {
                            selectCheckboxesForAddedNames();
                        };
                        btnContainer.parentElement.appendChild(selectBtn);
                    }
                }
            }
            var memberInput = document.querySelector(ELOG_FORM_SELECTORS.memberInput);
            if (memberInput) {
                memberInput.focus();
            } else if (elogState.focusReturnElement) {
                elogState.focusReturnElement.focus();
            }
            return;
        }
        var candidate = elogState.addQueue[elogState.addQueueIndex];
        addLogMessage('processNextStaffFromQueue: processing ' + candidate.display + ' pairKey=' + candidate.pairKey, 'log');
        if (elogState.existingPairs.has(candidate.pairKey)) {
            addLogMessage('processNextStaffFromQueue: already exists in table', 'log');
            candidate.status = ELOG_RUN_LABELS.statusAlready;
            elogState.counters.duplicates++;
            elogState.counters.pending--;
            updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusAlready);
            updateRightPanelSummary(elogState.counters);
            elogState.addQueueIndex++;
            var tid1 = setTimeout(processNextStaffFromQueue, 50);
            elogState.timeouts.push(tid1);
            return;
        }
        ensureAddEntryFormOpen()
            .then(function() {
            if (elogState.isPaused) { addLogMessage('processNextStaffFromQueue: paused after form open', 'log'); return Promise.reject('__paused__'); }
            addLogMessage('processNextStaffFromQueue: form open, opening dropdown', 'log');
            return ensureMemberDropdownOpen();
        })
            .then(function() {
            if (elogState.isPaused) { addLogMessage('processNextStaffFromQueue: paused after dropdown open', 'log'); return Promise.reject('__paused__'); }
            addLogMessage('processNextStaffFromQueue: dropdown open, selecting name', 'log');
            return attemptSelectByScrollingForName(candidate.display, candidate.pairKey, candidate.candidatePairKeys);
        })
            .then(function(selected) {
            if (elogState.isPaused) { addLogMessage('processNextStaffFromQueue: paused after name selection', 'log'); return; }
            if (!selected) {
                addLogMessage('processNextStaffFromQueue: not found in dropdown', 'warn');
                candidate.status = ELOG_RUN_LABELS.statusNotInDropdown;
                elogState.counters.failures++;
                elogState.counters.pending--;
                updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusNotInDropdown);
                updateRightPanelSummary(elogState.counters);
                elogState.addQueueIndex++;
                var tid2 = setTimeout(processNextStaffFromQueue, 50);
                elogState.timeouts.push(tid2);
                return;
            }
            addLogMessage('processNextStaffFromQueue: selected, clicking save', 'log');
            if (elogState.isPaused) { addLogMessage('processNextStaffFromQueue: paused before save', 'log'); return; }
            clickSaveAndAddAnother().then(function(saveResult) {
                if (saveResult === 'disabled') {
                    addLogMessage('processNextStaffFromQueue: save disabled, retrying selection', 'warn');
                    ensureMemberDropdownOpen()
                        .then(function() {
                        return attemptSelectByScrollingForName(candidate.display, candidate.pairKey, candidate.candidatePairKeys);
                    })
                        .then(function(reselected) {
                        if (!reselected) {
                            candidate.status = ELOG_RUN_LABELS.statusSelectionFailed;
                            elogState.counters.failures++;
                            elogState.counters.pending--;
                            updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusSelectionFailed);
                            updateRightPanelSummary(elogState.counters);
                            elogState.addQueueIndex++;
                            var tid3 = setTimeout(processNextStaffFromQueue, 50);
                            elogState.timeouts.push(tid3);
                            return;
                        }
                        return clickSaveAndAddAnother().then(function(retryResult) {
                            if (retryResult === 'success') {
                                candidate.status = ELOG_RUN_LABELS.statusAdded;
                                elogState.counters.added++;
                                elogState.counters.pending--;
                                updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusAdded);
                            } else {
                                candidate.status = ELOG_RUN_LABELS.statusSelectionFailed;
                                elogState.counters.failures++;
                                elogState.counters.pending--;
                                updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusSelectionFailed);
                            }
                            updateRightPanelSummary(elogState.counters);
                            elogState.addQueueIndex++;
                            var tid4 = setTimeout(processNextStaffFromQueue, 50);
                            elogState.timeouts.push(tid4);
                        });
                    })
                        .catch(function(err) {
                        addLogMessage('processNextStaffFromQueue: retry error: ' + err, 'error');
                        candidate.status = ELOG_RUN_LABELS.statusSelectionFailed;
                        elogState.counters.failures++;
                        elogState.counters.pending--;
                        updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusSelectionFailed);
                        updateRightPanelSummary(elogState.counters);
                        elogState.addQueueIndex++;
                        var tid5 = setTimeout(processNextStaffFromQueue, 50);
                        elogState.timeouts.push(tid5);
                    });
                    return;
                }
                if (saveResult === 'success') {
                    addLogMessage('processNextStaffFromQueue: saved successfully', 'log');
                    candidate.status = ELOG_RUN_LABELS.statusAdded;
                    elogState.counters.added++;
                    elogState.counters.pending--;
                    updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusAdded);
                } else {
                    addLogMessage('processNextStaffFromQueue: save failed result=' + saveResult, 'warn');
                    candidate.status = ELOG_RUN_LABELS.statusSaveFailed;
                    elogState.counters.failures++;
                    elogState.counters.pending--;
                    updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusSaveFailed);
                }
                updateRightPanelSummary(elogState.counters);
                elogState.addQueueIndex++;
                var tid6 = setTimeout(processNextStaffFromQueue, 50);
                elogState.timeouts.push(tid6);
            });
        })
            .catch(function(err) {
            if (err === '__paused__') { return; }
            addLogMessage('processNextStaffFromQueue: error: ' + err, 'error');
            candidate.status = ELOG_RUN_LABELS.statusSaveFailed;
            elogState.counters.failures++;
            elogState.counters.pending--;
            updateRightPanelStatus(candidate.pairKey, ELOG_RUN_LABELS.statusSaveFailed);
            updateRightPanelSummary(elogState.counters);
            elogState.addQueueIndex++;
            var tid7 = setTimeout(processNextStaffFromQueue, 50);
            elogState.timeouts.push(tid7);
        });
    }

    function beginAddNonDuplicateELogEntries() {
        addLogMessage('beginAddNonDuplicateELogEntries: starting', 'log');
        elogState.existingPairs = buildExistingPairsFromScan(elogState.scannedNames);
        addLogMessage('beginAddNonDuplicateELogEntries: existingPairs count=' + elogState.existingPairs.size, 'log');
        var result = buildUserQueueSorted(elogState.parsedNames);
        elogState.addQueue = result.queue;
        elogState.addQueueIndex = 0;
        elogState.listScrollTop = 0;
        elogState.isAddingEntries = true;
        for (var di = 0; di < result.duplicateIndices.length; di++) {
            var dupIdx = result.duplicateIndices[di];
            var dupName = elogState.parsedNames[dupIdx];
            if (dupName) {
                var dupPk = normalizeFirstLastPair(dupName.display);
                updateRightPanelStatus(dupPk, ELOG_RUN_LABELS.statusAlready);
            }
        }
        elogState.counters = {
            total: elogState.addQueue.length,
            added: 0,
            duplicates: 0,
            failures: 0,
            pending: elogState.addQueue.length
        };
        updateRightPanelSummary(elogState.counters);
        updateScanStatus('Adding Entries', 'progress');
        var title = document.getElementById('elog-progress-title');
        if (title) {
            title.textContent = 'ELog Staff Entries - Adding Entries';
        }
        updateAriaLiveRegion('Starting to add ' + elogState.addQueue.length + ' entries');
        addLogMessage('beginAddNonDuplicateELogEntries: queue size=' + elogState.addQueue.length + ', starting processing', 'log');
        processNextStaffFromQueue();
    }

    function selectCheckboxesForAddedNames() {
        addLogMessage('selectCheckboxesForAddedNames: starting', 'log');
        var addedPairKeys = new Set();
        for (var qi = 0; qi < elogState.addQueue.length; qi++) {
            if (elogState.addQueue[qi].status === ELOG_RUN_LABELS.statusAdded) {
                addedPairKeys.add(elogState.addQueue[qi].pairKey);
            }
        }
        addLogMessage('selectCheckboxesForAddedNames: addedPairKeys count=' + addedPairKeys.size, 'log');
        if (addedPairKeys.size === 0) {
            addLogMessage('selectCheckboxesForAddedNames: no added entries to select', 'warn');
            return;
        }
        var gridTable = document.querySelector(ELOG_SELECTORS.gridTable);
        if (!gridTable) {
            addLogMessage('selectCheckboxesForAddedNames: grid table not found', 'error');
            return;
        }
        var container = findScrollableContainer(gridTable);
        if (!container) {
            addLogMessage('selectCheckboxesForAddedNames: scrollable container not found', 'error');
            return;
        }
        var btn = document.getElementById('elog-select-checkboxes-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Selecting...';
        }
        var checkedPairKeys = new Set();
        var noProgress = 0;
        var lastScrollTop = -1;
        var lastRowSnapshot = '';
        container.scrollTo({ top: 0, behavior: 'auto' });
        function scanAndCheck() {
            var rows = gridTable.querySelectorAll(ELOG_SELECTORS.row);
            var rowTexts = [];
            for (var ri = 0; ri < rows.length; ri++) {
                var row = rows[ri];
                if (row.getAttribute('role') === 'columnheader') { continue; }
                var name = extractNameFromRow(row, ri + 1);
                if (!name) { continue; }
                rowTexts.push(name);
                var pk = normalizeFirstLastPair(name);
                if (addedPairKeys.has(pk) && !checkedPairKeys.has(pk)) {
                    var checkbox = row.querySelector('[role="checkbox"]');
                    if (checkbox && checkbox.getAttribute('aria-checked') === 'false') {
                        addLogMessage('selectCheckboxesForAddedNames: clicking checkbox for ' + name, 'log');
                        checkbox.click();
                        checkedPairKeys.add(pk);
                    } else if (checkbox && checkbox.getAttribute('aria-checked') === 'true') {
                        addLogMessage('selectCheckboxesForAddedNames: already checked for ' + name, 'log');
                        checkedPairKeys.add(pk);
                    }
                }
            }
            return rowTexts.join('|');
        }
        var initialSnapshot = scanAndCheck();
        function scrollLoop() {
            if (checkedPairKeys.size >= addedPairKeys.size) {
                addLogMessage('selectCheckboxesForAddedNames: all checkboxes selected (' + checkedPairKeys.size + ')', 'log');
                finishSelection();
                return;
            }
            var currTop = container.scrollTop;
            var maxScroll = container.scrollHeight - container.clientHeight;
            var newTop = Math.min(currTop + ELOG_SCROLL.stepPx, maxScroll);
            container.scrollTo({ top: newTop, behavior: 'auto' });
            setTimeout(function() {
                var snapshot = scanAndCheck();
                var currentTop = container.scrollTop;
                if (currentTop === lastScrollTop && snapshot === lastRowSnapshot) {
                    noProgress++;
                } else {
                    noProgress = 0;
                }
                lastScrollTop = currentTop;
                lastRowSnapshot = snapshot;
                if (noProgress >= ELOG_SCROLL.maxNoProgressIterations || currentTop >= maxScroll) {
                    addLogMessage('selectCheckboxesForAddedNames: end of table reached, checked=' + checkedPairKeys.size + ' of ' + addedPairKeys.size, 'log');
                    finishSelection();
                    return;
                }
                scrollLoop();
            }, ELOG_SCROLL.settleDelayMs);
        }
        function finishSelection() {
            addLogMessage('selectCheckboxesForAddedNames: finished, checked ' + checkedPairKeys.size + ' checkboxes', 'log');
            if (btn) {
                btn.textContent = 'Done (' + checkedPairKeys.size + ' selected)';
                btn.disabled = true;
                btn.style.background = 'rgba(107, 207, 127, 0.3)';
                btn.style.color = '#6bcf7f';
            }
        }
        setTimeout(scrollLoop, ELOG_SCROLL.settleDelayMs);
    }

    function findScrollableContainer(gridEl) {
        if (!gridEl) {
            addLogMessage('findScrollableContainer: gridEl is null', 'warn');
            return null;
        }
        let current = gridEl;
        while (current && current !== document.body) {
            const style = window.getComputedStyle(current);
            const overflowY = style.overflowY;
            const scrollDiff = current.scrollHeight - current.clientHeight;
            if (scrollDiff >= 20 && (overflowY === 'scroll' || overflowY === 'auto')) {
                return current;
            }
            current = current.parentElement;
        }
        return gridEl;
    }

    function getRenderedRowCount() {
        const gridTable = document.querySelector(ELOG_SELECTORS.gridTable);
        if (!gridTable) {
            addLogMessage('getRenderedRowCount: grid not found', 'warn');
            return 0;
        }
        const rows = gridTable.querySelectorAll(ELOG_SELECTORS.row);
        let count = 0;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                count++;
            }
        }
        return count;
    }

    function getRenderedLastRowKey() {
        const gridTable = document.querySelector(ELOG_SELECTORS.gridTable);
        if (!gridTable) {
            addLogMessage('getRenderedLastRowKey: grid not found', 'warn');
            return '';
        }
        const rows = gridTable.querySelectorAll(ELOG_SELECTORS.row);
        let lastDataRow = null;
        for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                lastDataRow = rows[i];
                break;
            }
        }
        if (!lastDataRow) {
            addLogMessage('getRenderedLastRowKey: no data rows', 'warn');
            return '';
        }
        const cells = lastDataRow.querySelectorAll(ELOG_SELECTORS.cell);
        if (cells.length > 0) {
            const firstCellText = cells[0].textContent.trim();
            if (firstCellText) {
                return firstCellText;
            }
        }
        let hash = 0;
        const content = lastDataRow.textContent || '';
        for (let i = 0; i < content.length; i++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(i);
            hash = hash & hash;
        }
        const key = 'hash_' + hash;
        return key;
    }

    function awaitSettle(container) {
        return new Promise(function(resolve) {
            const gridTable = document.querySelector(ELOG_SELECTORS.gridTable);
            let resolved = false;
            let observer = null;
            let debounceTimer = null;
            function finish() {
                if (resolved) { return; }
                resolved = true;
                if (debounceTimer) { clearTimeout(debounceTimer); }
                if (observer) {
                    observer.disconnect();
                    const idx = elogState.observers.indexOf(observer);
                    if (idx > -1) { elogState.observers.splice(idx, 1); }
                }
                resolve();
            }
            const maxTimeoutId = setTimeout(function() {
                addLogMessage('awaitSettle: max timeout reached, finishing', 'log');
                finish();
            }, ELOG_SCROLL.settleDelayMs * 5);
            elogState.timeouts.push(maxTimeoutId);
            if (gridTable) {
                observer = new MutationObserver(function() {
                    if (resolved) { return; }
                    if (debounceTimer) { clearTimeout(debounceTimer); }
                    debounceTimer = setTimeout(function() {
                        finish();
                    }, ELOG_SCROLL.settleDelayMs);
                    elogState.timeouts.push(debounceTimer);
                });
                observer.observe(gridTable, { childList: true, subtree: true });
                elogState.observers.push(observer);
            }
            debounceTimer = setTimeout(function() {
                finish();
            }, ELOG_SCROLL.settleDelayMs);
            elogState.timeouts.push(debounceTimer);
        });
    }

    function setAriaBusyOn() {
        const target = document.querySelector(ELOG_ATTRS.ariaBusyTarget);
        if (target) {
            elogState.prevAriaBusy = target.getAttribute(ELOG_ATTRS.ariaBusyAttr);
            target.setAttribute(ELOG_ATTRS.ariaBusyAttr, 'true');
        }
    }

    function setAriaBusyOff() {
        const target = document.querySelector(ELOG_ATTRS.ariaBusyTarget);
        if (target) {
            if (elogState.prevAriaBusy !== null) {
                target.setAttribute(ELOG_ATTRS.ariaBusyAttr, elogState.prevAriaBusy);
            } else {
                target.removeAttribute(ELOG_ATTRS.ariaBusyAttr);
            }
            elogState.prevAriaBusy = null;
        }
    }

    function computeEndReached(container, noProgress) {
        if (!container) {
            return true;
        }
        const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
        if (atBottom && noProgress >= 3) {
            return true;
        }
        return false;
    }

    function restoreViewport(container, prevTop) {
        if (!container) {
            return;
        }
        const diff = Math.abs(container.scrollTop - prevTop);
        if (diff > 100) {
            addLogMessage('restoreViewport: restoring scroll', 'log');
            container.scrollTo({ top: prevTop, behavior: 'auto' });
        }
    }

    function observeUserScrollPause(container) {
        addLogMessage('observeUserScrollPause: setup', 'log');
        if (!container || elogState.userScrollHandler) {
            return;
        }
        elogState.userScrollHandler = function() {
            const timeSinceAuto = Date.now() - elogState.lastAutoScrollTime;
            if (timeSinceAuto > 50 && !elogState.userScrollPaused) {
                elogState.userScrollPaused = true;
                const resumeTimeout = setTimeout(function() {
                    elogState.userScrollPaused = false;
                }, ELOG_SCROLL.userScrollPauseMs);
                elogState.timeouts.push(resumeTimeout);
            }
        };
        container.addEventListener('scroll', elogState.userScrollHandler);
        elogState.eventListeners.push({ element: container, type: 'scroll', handler: elogState.userScrollHandler });
    }

    function scanVisibleRowsOnce(onRow) {
        const gridTable = document.querySelector(ELOG_SELECTORS.gridTable);
        if (!gridTable) {
            addLogMessage('scanVisibleRowsOnce: grid not found', 'warn');
            return 0;
        }
        const rows = gridTable.querySelectorAll(ELOG_SELECTORS.row);
        let newCount = 0;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.getAttribute('role') === 'columnheader') {
                continue;
            }
            const extractedName = extractNameFromRow(row, i + 1);
            if (!extractedName) {
                continue;
            }
            const normalized = elogNormalizeName(extractedName);
            if (elogState.seenNormalizedNames.has(normalized)) {
                continue;
            }
            elogState.seenNormalizedNames.add(normalized);
            elogState.scannedNames.push(extractedName);
            newCount++;
            if (onRow) {
                onRow(extractedName, normalized);
            }
        }
        return newCount;
    }

    function updateAriaLiveRegion(message) {
        const liveRegion = document.getElementById('elog-aria-live');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    function autoScrollScan(options) {
        addLogMessage('autoScrollScan: starting', 'log');
        const onRow = options.onRow || function() {};
        const onProgress = options.onProgress || function() {};
        const onDone = options.onDone || function() {};
        const onError = options.onError || function() {};
        const gridTable = document.querySelector(ELOG_SELECTORS.gridTable);
        if (!gridTable) {
            addLogMessage('autoScrollScan: grid not found', 'error');
            onError(new Error('Grid table not found'));
            return;
        }
        const container = findScrollableContainer(gridTable);
        if (!container) {
            addLogMessage('autoScrollScan: container not found', 'error');
            onError(new Error('Container not found'));
            return;
        }
        elogState.scrollContainer = container;
        elogState.prevScrollTop = container.scrollTop;
        elogState.seenNormalizedNames = new Set();
        elogState.leftPanelRowIndex = 0;
        setAriaBusyOn();
        observeUserScrollPause(container);
        addLogMessage('autoScrollScan: scrolling to top before scan', 'log');
        container.scrollTo({ top: 0, behavior: 'auto' });
        const startTime = Date.now();
        let noProgress = 0;
        let prevScrollHeight = container.scrollHeight;
        function initialScan() {
            scanVisibleRowsOnce(function(name) {
                elogState.leftPanelRowIndex++;
            });
            onProgress({ scanned: elogState.scannedNames.length });
            prevScrollHeight = container.scrollHeight;
            const initScrollTimeout = setTimeout(scrollLoop, ELOG_SCROLL.idleDelayMs);
            elogState.timeouts.push(initScrollTimeout);
        }
        function scrollLoop() {
            if (!elogState.isRunning) {
                updateAriaLiveRegion(ELOG_LABELS.progressStopped);
                finishScan(ELOG_LABELS.progressStopped, 'stopped');
                return;
            }
            if (Date.now() - startTime > ELOG_SCROLL.maxDurationMs) {
                finishScan(ELOG_LABELS.progressComplete, 'timeout');
                return;
            }
            if (elogState.userScrollPaused) {
                const pt = setTimeout(scrollLoop, 100);
                elogState.timeouts.push(pt);
                return;
            }
            const currentScrollHeight = container.scrollHeight;
            if (currentScrollHeight > prevScrollHeight) {
                addLogMessage('autoScrollScan: scrollHeight grew from ' + prevScrollHeight + ' to ' + currentScrollHeight + ', resetting noProgress', 'log');
                noProgress = 0;
                prevScrollHeight = currentScrollHeight;
            }
            const priorKey = getRenderedLastRowKey();
            const priorCount = getRenderedRowCount();
            const currTop = container.scrollTop;
            const maxScroll = container.scrollHeight - container.clientHeight;
            const newTop = Math.min(currTop + ELOG_SCROLL.stepPx, maxScroll);
            elogState.lastAutoScrollTime = Date.now();
            container.scrollTo({ top: newTop, behavior: 'auto' });
            awaitSettle(container).then(function() {
                let attempts = 0;
                function attemptScan() {
                    const rc = getRenderedRowCount();
                    if (rc === 0 && attempts < ELOG_SCROLL.retryScanAttempts) {
                        attempts++;
                        const rt = setTimeout(attemptScan, ELOG_SCROLL.retryScanDelayMs);
                        elogState.timeouts.push(rt);
                        return;
                    }
                    scanVisibleRowsOnce(function(name) {
                        elogState.leftPanelRowIndex++;
                    });
                    onProgress({ scanned: elogState.scannedNames.length });
                    const currKey = getRenderedLastRowKey();
                    const currCount = getRenderedRowCount();
                    const postScrollHeight = container.scrollHeight;
                    if (postScrollHeight > prevScrollHeight) {
                        addLogMessage('autoScrollScan: scrollHeight grew after scan from ' + prevScrollHeight + ' to ' + postScrollHeight + ', resetting noProgress', 'log');
                        noProgress = 0;
                        prevScrollHeight = postScrollHeight;
                    } else if (currKey === priorKey && currCount === priorCount) {
                        noProgress++;
                    } else {
                        noProgress = 0;
                    }
                    if (computeEndReached(container, noProgress)) {
                        finishScan(ELOG_LABELS.progressNoMore, 'endReached');
                        return;
                    }
                    if (noProgress >= ELOG_SCROLL.maxNoProgressIterations) {
                        finishScan(ELOG_LABELS.progressNoMore, 'noProgress');
                        return;
                    }
                    if (typeof requestIdleCallback === 'function') {
                        elogState.idleCallbackId = requestIdleCallback(function() {
                            elogState.idleCallbackId = null;
                            scrollLoop();
                        }, { timeout: ELOG_SCROLL.idleDelayMs * 2 });
                    } else {
                        const it = setTimeout(scrollLoop, ELOG_SCROLL.idleDelayMs);
                        elogState.timeouts.push(it);
                    }
                }
                attemptScan();
            });
        }
        function finishScan(label, reason) {
            addLogMessage('autoScrollScan: done reason=' + reason + ' total=' + elogState.scannedNames.length, 'log');
            setAriaBusyOff();
            onDone({ total: elogState.scannedNames.length, reason: reason });
        }
        function waitForStableScrollHeight(callback) {
            var checks = 0;
            var maxChecks = 5;
            var lastHeight = container.scrollHeight;
            var stableCount = 0;
            function checkHeight() {
                if (!elogState.isRunning) { return; }
                var currentHeight = container.scrollHeight;
                if (currentHeight === lastHeight) {
                    stableCount++;
                } else {
                    addLogMessage('autoScrollScan: scrollHeight changed from ' + lastHeight + ' to ' + currentHeight + ' during stabilization', 'log');
                    stableCount = 0;
                    lastHeight = currentHeight;
                }
                checks++;
                if (stableCount >= 2 || checks >= maxChecks) {
                    addLogMessage('autoScrollScan: scrollHeight stabilized at ' + currentHeight + ' after ' + checks + ' checks', 'log');
                    callback();
                    return;
                }
                var tid = setTimeout(checkHeight, 500);
                elogState.timeouts.push(tid);
            }
            var tid = setTimeout(checkHeight, 500);
            elogState.timeouts.push(tid);
        }
        awaitSettle(container).then(function() {
            waitForStableScrollHeight(function() {
                initialScan();
            });
        });
    }

    function stopELog() {
        addLogMessage('stopELog: stopping all ELog processes', 'log');
        elogState.isRunning = false;
        if (elogState.idleCallbackId && typeof cancelIdleCallback === 'function') {
            addLogMessage('stopELog: cancelling idle callback', 'log');
            cancelIdleCallback(elogState.idleCallbackId);
            elogState.idleCallbackId = null;
        }
        for (let i = 0; i < elogState.observers.length; i++) {
            try {
                elogState.observers[i].disconnect();
            } catch (e) {
                addLogMessage('stopELog: error disconnecting observer: ' + e, 'error');
            }
        }
        elogState.observers = [];
        for (let i = 0; i < elogState.timeouts.length; i++) {
            try {
                clearTimeout(elogState.timeouts[i]);
            } catch (e) {
                addLogMessage('stopELog: error clearing timeout: ' + e, 'error');
            }
        }
        elogState.timeouts = [];
        for (let i = 0; i < elogState.intervals.length; i++) {
            try {
                clearInterval(elogState.intervals[i]);
            } catch (e) {
                addLogMessage('stopELog: error clearing interval: ' + e, 'error');
            }
        }
        elogState.intervals = [];
        for (let i = 0; i < elogState.eventListeners.length; i++) {
            try {
                const listener = elogState.eventListeners[i];
                listener.element.removeEventListener(listener.type, listener.handler);
            } catch (e) {
                addLogMessage('stopELog: error removing event listener: ' + e, 'error');
            }
        }
        elogState.eventListeners = [];
        if (elogState.abortController) {
            elogState.abortController.abort();
            elogState.abortController = null;
        }
        setAriaBusyOff();
        if (elogState.scrollContainer && elogState.prevScrollTop !== undefined) {
            addLogMessage('stopELog: restoring viewport', 'log');
            restoreViewport(elogState.scrollContainer, elogState.prevScrollTop);
        }
        elogState.scrollContainer = null;
        elogState.userScrollHandler = null;
        elogState.userScrollPaused = false;
        if (elogState.isAddingEntries) {
            addLogMessage('stopELog: was adding entries, marking remaining as Stopped', 'log');
            for (let qi = elogState.addQueueIndex; qi < elogState.addQueue.length; qi++) {
                if (elogState.addQueue[qi].status === ELOG_RUN_LABELS.statusPending) {
                    elogState.addQueue[qi].status = ELOG_RUN_LABELS.statusStopped;
                    elogState.counters.pending--;
                }
            }
            elogState.isAddingEntries = false;
        }
        elogState.addQueue = [];
        elogState.addQueueIndex = 0;
        elogState.existingPairs = new Set();
        elogState.listScrollTop = 0;
        const inputModal = document.getElementById('elog-input-modal');
        if (inputModal && inputModal.parentNode) {
            inputModal.parentNode.removeChild(inputModal);
        }
        const progressModal = document.getElementById('elog-progress-modal');
        if (progressModal && progressModal.parentNode) {
            progressModal.parentNode.removeChild(progressModal);
        }
        removeCollectingDataPanel('elog');
        resetELogState();
        addLogMessage('stopELog: cleanup complete', 'log');
    }

    const RESP_SELECTORS = {
        pageStepRoot: 'doa-log-template-study-roles-step',
        dropListContainer: '.cdk-drop-list.doa-log-form-step__drop-list-container',
        roleColumns: '.doa-log-form-step__column.roles__column',
        roleSearchInput: 'input.filtered-select__input[placeholder*="Search"]',
        roleListContainer: 'ul.filtered-select__list.u-z-index-1060, ul.filtered-select__list',
        virtualViewport: 'cdk-virtual-scroll-viewport.cdk-virtual-scroll-viewport, .filtered-select__list',
        roleOptionItem: '.filtered-select__list__item, [role="option"], .cdk-virtual-scroll-viewport .filtered-select__list__item',
        roleOptionText: '.filtered-select__list__item__text',
        roleOptionCheckboxTri: '.test-checkboxTristate[role="checkbox"]',
        selectedRoleCheckboxInColumn: '[role="checkbox"][aria-checked="true"]',
        responsibilitiesToggleBtn: 'button[dropdowntoggle][data-test="study-responsibilities-dropdown-toggle"].roles__select-options-dropdown-button',
        responsibilitiesMenu: 'ul[role="menu"][data-test="study-responsibilities-list"]',
        responsibilitiesItem: 'ul[role="menu"][data-test="study-responsibilities-list"] li',
        responsibilitiesItemCheckbox: 'ul[role="menu"][data-test="study-responsibilities-list"] li input[type="checkbox"]',
        addStudyRoleBtn: 'button[data-test="add-study-role-button"]',
        mainPanelButtonTarget: '.main-gui-panel',
        ariaLiveRegion: '.aria-live-region'
    };

    const RESP_TIMEOUTS = {
        waitPageMs: 10000,
        waitInputPanelMs: 10000,
        waitProgressPanelMs: 10000,
        waitListOpenMs: 4000,
        waitOptionRenderMs: 1500,
        waitAfterSelectRoleMs: 800,
        waitResponsibilitiesMenuMs: 3000,
        waitAfterToggleResponsibilityMs: 200,
        waitAddRoleResultMs: 4000,
        settleAfterScrollMs: 150,
        idleBetweenScrollsMs: 80,
        maxSelectRoleDurationMs: 30000
    };

    const RESP_RETRY = {
        openListRetries: 4,
        optionScanRetries: 2,
        maxScrollPasses: 1,
        addRoleRetries: 2
    };

    const RESP_LABELS = {
        notOnPageWarning: 'You are not on the Study Role Page.',
        statusPending: 'Pending',
        statusCompleted: 'Completed',
        statusFailed: 'Failed',
        statusStopped: 'Stopped',
        parsing: 'Parsing input',
        scanningExisting: 'Scanning existing roles',
        selectingRole: 'Selecting role',
        selectingResponsibilities: 'Selecting responsibilities',
        addingRole: 'Adding study role',
        done: 'Completed'
    };

    const RESP_COUNTERS = {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0
    };

    const RESP_REGEX = {
        range: /\b(\d+)\s*(?:to|\-|\u2013|\u2014)\s*(\d+)\b/i,
        number: /\b\d+\b/g,
        quoteCleanup: /["\u201c\u201d]+/g,
        hyphenBreak: /-\s*\n\s*/g,
        lineBreakInRole: /\n+/g,
        whitespace: /\s+/g
    };

    const RESP_ROLE_KEYWORD_MAP = [
        { keyword: 'sub-investigator', role: 'Sub-Investigator' },
        { keyword: 'sub investigator', role: 'Sub-Investigator' },
        { keyword: 'subinvestigator', role: 'Sub-Investigator' },
        { keyword: 'sub-i', role: 'Sub-Investigator' },
        { keyword: 'principal investigator', role: 'Principal Investigator' },
        { keyword: 'principle investigator', role: 'Principal Investigator' },
        { keyword: 'clinical trial', role: 'Study Coordinator' },
        { keyword: 'clinical research', role: 'Research Nurse' },
        { keyword: 'lvn', role: 'Research Nurse' },
        { keyword: 'crc', role: 'Study Coordinator' },
        { keyword: 'infusion nurse', role: 'Research Nurse' },
        { keyword: 'nurse', role: 'Research Nurse' },
        { keyword: 'qa', role: 'Quality Assurance' },
        { keyword: 'quality', role: 'Quality Assurance' },
        { keyword: 'research assistant', role: 'Research Assistant' },
        { keyword: 'pharm', role: 'Pharmacy' },
        { keyword: 'recruitment', role: 'Recruitment' },
        { keyword: 'laboratory', role: 'Laboratory Technician' },
        { keyword: 'patient', role: 'Dietary Aide' },
        { keyword: 'lab tech', role: 'Laboratory Technician' },
        { keyword: 'data', role: 'Data Entry' },
        { keyword: 'regulatory', role: 'Regulatory Coordinator' },
        { keyword: 'dietary', role: 'Dietary Aide' },
        { keyword: 'pi', role: 'Principal Investigator' }
    ];

    const RESP_SCROLL = {
        stepRatio: 0.7,
        userPauseMs: 800
    };

    const RESP_ATTRS = {
        ariaBusyTarget: 'body',
        ariaBusyAttr: 'aria-busy'
    };

    const CLEAN_SELECTORS = {
        mainPanelButtonTarget: '.main-gui-panel',
        ariaLiveRegion: '.aria-live-region'
    };

    const CLEAN_TIMEOUTS = {
        waitInputPanelMs: 10000,
        waitResultsPanelMs: 10000
    };

    const CLEAN_LABELS = {
        featureButton: 'Clean Study Task List',
        inputTitle: 'Clean Study Task List Input',
        resultsTitle: 'Cleaned Study Task List',
        responsibilitiesHeader: 'Responsibilities',
        confirm: 'Confirm',
        clear: 'Clear All',
        close: 'Close',
        downloadXlsx: 'Download .xlsx',
        downloadCsv: 'Download CSV',
        parsing: 'Parsing and cleaning input',
        done: 'Cleaning complete',
        exportSuccess: 'Export file created',
        exportFailed: 'Export failed'
    };

    const CLEAN_REGEX = {
        itemStart: /(^|\s)(\d{1,3})([.)])\s+/g,
        leadingToken: /^(\d{1,3})([.)])\s*/,
        specialChars: /[\\\/:<>"|?*]/g,
        standaloneAnd: /\b(and)\b/gi,
        smartQuotes: /[\u201c\u201d]/g,
        strayQuotes: /"+/g,
        whitespace: /\s+/g,
        duplicateCommas: /,\s*,+/g
    };

    const CLEAN_LIMITS = {
        maxChars: 100
    };

    const CLEAN_ATTRS = {
        ariaBusyTarget: 'body',
        ariaBusyAttr: 'aria-busy'
    };

    var cleanState = {
        isRunning: false,
        stopRequested: false,
        observers: [],
        timeouts: [],
        intervals: [],
        eventListeners: [],
        idleCallbackIds: [],
        focusReturnElement: null,
        prevAriaBusy: null,
        parsedItems: null,
        outputModel: null
    };

    var respState = {
        isRunning: false,
        stopRequested: false,
        observers: [],
        timeouts: [],
        intervals: [],
        eventListeners: [],
        idleCallbackIds: [],
        focusReturnElement: null,
        prevAriaBusy: null,
        parsedRoles: null,
        rolesData: [],
        counters: { total: 0, completed: 0, failed: 0, pending: 0 },
        listScrollTop: 0,
        userScrollHandler: null,
        userScrollPaused: false
    };

    function resetRespState() {
        addLogMessage('resetRespState: resetting state', 'log');
        respState.isRunning = false;
        respState.stopRequested = false;
        respState.observers = [];
        respState.timeouts = [];
        respState.intervals = [];
        respState.eventListeners = [];
        respState.idleCallbackIds = [];
        respState.prevAriaBusy = null;
        respState.parsedRoles = null;
        respState.rolesData = [];
        respState.counters = { total: 0, completed: 0, failed: 0, pending: 0 };
        respState.listScrollTop = 0;
        respState.userScrollHandler = null;
        respState.userScrollPaused = false;
    }

    function respWaitForElement(selector, timeout) {
        addLogMessage('respWaitForElement: waiting for ' + selector, 'log');
        return new Promise(function(resolve, reject) {
            var element = document.querySelector(selector);
            if (element) {
                addLogMessage('respWaitForElement: found immediately', 'log');
                resolve(element);
                return;
            }
            var observer = new MutationObserver(function(mutations, obs) {
                var el = document.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    var idx = respState.observers.indexOf(obs);
                    if (idx > -1) {
                        respState.observers.splice(idx, 1);
                    }
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            respState.observers.push(observer);
            var timeoutId = setTimeout(function() {
                observer.disconnect();
                var idx = respState.observers.indexOf(observer);
                if (idx > -1) {
                    respState.observers.splice(idx, 1);
                }
                addLogMessage('respWaitForElement: timeout for ' + selector, 'warn');
                reject(new Error('Timeout waiting for ' + selector));
            }, timeout);
            respState.timeouts.push(timeoutId);
        });
    }

    function respDelay(ms) {
        return new Promise(function(resolve) {
            var tid = setTimeout(resolve, ms);
            respState.timeouts.push(tid);
        });
    }

    function normalizeRoleName(s) {
        if (!s) {
            return { display: '', key: '' };
        }
        var cleaned = s.trim();
        cleaned = cleaned.replace(RESP_REGEX.quoteCleanup, '');
        cleaned = cleaned.replace(RESP_REGEX.hyphenBreak, '-');
        cleaned = cleaned.replace(RESP_REGEX.lineBreakInRole, ' ');
        cleaned = cleaned.replace(RESP_REGEX.whitespace, ' ');
        cleaned = cleaned.trim();
        var display = cleaned;
        var key = cleaned.toLowerCase();
        addLogMessage("Display: " + display + ", Key: " + key);
        if (display === "RN") {
            display = "Research Nurse";
            key = "research nurse";
        }
        else if (display === "RA") {
            display = "Research Assistant";
            key = "research assistant";
        }
        else if (display === "QA") {
            display = "Quality Assurance";
            key = "quality assurance";
        }
        else if (display === "PI") {
            display = "Principal Investigator";
            key = "principal investigator";
        }
        else {
            for (var ki = 0; ki < RESP_ROLE_KEYWORD_MAP.length; ki++) {
                if (key.indexOf(RESP_ROLE_KEYWORD_MAP[ki].keyword) !== -1) {
                    display = RESP_ROLE_KEYWORD_MAP[ki].role;
                    key = display.toLowerCase();
                    break;
                }
            }
        }
        addLogMessage('normalizeRoleName: display=' + display + ' key=' + key, 'log');
        return { display: display, key: key };
    }

    function expandRanges(tokens) {
        addLogMessage('expandRanges: tokens=' + JSON.stringify(tokens), 'log');
        var result = new Set();
        var i = 0;
        while (i < tokens.length) {
            var current = tokens[i];
            if (i + 2 < tokens.length && /^(to)$/i.test(tokens[i + 1])) {
                var start = parseInt(current, 10);
                var end = parseInt(tokens[i + 2], 10);
                if (!isNaN(start) && !isNaN(end)) {
                    var lo = Math.min(start, end);
                    var hi = Math.max(start, end);
                    for (var n = lo; n <= hi; n++) {
                        result.add(n);
                    }
                    i += 3;
                    continue;
                }
            }
            var num = parseInt(current, 10);
            if (!isNaN(num)) {
                result.add(num);
            }
            i++;
        }
        addLogMessage('expandRanges: result size=' + result.size, 'log');
        return result;
    }

    function parseResponsibilitiesInput(rawText) {
        addLogMessage('parseResponsibilitiesInput: starting parse', 'log');
        try {
            if (!rawText || !rawText.trim()) {
                addLogMessage('parseResponsibilitiesInput: empty input', 'warn');
                return null;
            }
            var text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            text = text.replace(/[\u201c\u201d\u201e\u201f\u2018\u2019]+/g, '"');
            text = text.replace(/-\s*\n\s*/g, '-');
            var rawLines = text.split('\n');
            var mergedLines = [];
            var pendingQuote = false;
            var buffer = '';
            for (var li = 0; li < rawLines.length; li++) {
                var line = rawLines[li];
                if (pendingQuote) {
                    buffer = buffer + ' ' + line;
                    var quoteCount = 0;
                    for (var ci = 0; ci < buffer.length; ci++) {
                        if (buffer[ci] === '"') {
                            quoteCount++;
                        }
                    }
                    if (quoteCount % 2 === 0) {
                        pendingQuote = false;
                        mergedLines.push(buffer);
                        buffer = '';
                    }
                    continue;
                }
                var qc = 0;
                for (var ci2 = 0; ci2 < line.length; ci2++) {
                    if (line[ci2] === '"') {
                        qc++;
                    }
                }
                if (qc % 2 !== 0) {
                    pendingQuote = true;
                    buffer = line;
                    continue;
                }
                mergedLines.push(line);
            }
            if (buffer) {
                mergedLines.push(buffer);
            }
            addLogMessage('parseResponsibilitiesInput: merged into ' + mergedLines.length + ' lines', 'log');
            var parsedMap = {};
            for (var mi = 0; mi < mergedLines.length; mi++) {
                var mline = mergedLines[mi].trim();
                if (!mline) {
                    continue;
                }
                mline = mline.replace(/"+/g, '');
                var parts = mline.split(/\t+/);
                var rolePart = '';
                var numberPart = '';
                if (parts.length >= 2) {
                    var emailIdx = -1;
                    for (var pi = 0; pi < parts.length; pi++) {
                        if (parts[pi].indexOf('@') !== -1) {
                            emailIdx = pi;
                            break;
                        }
                    }
                    if (emailIdx !== -1 && emailIdx + 1 < parts.length) {
                        rolePart = parts[emailIdx + 1].trim();
                        numberPart = parts.slice(emailIdx + 2).join(' ');
                        addLogMessage('parseResponsibilitiesInput: line ' + mi + ' staff table detected, role=' + rolePart, 'log');
                    } else {
                        rolePart = parts[0].trim();
                        numberPart = parts.slice(1).join(' ');
                    }
                } else {
                    var firstNumMatch = mline.match(/\d/);
                    if (firstNumMatch) {
                        var idx = mline.indexOf(firstNumMatch[0]);
                        var beforeNum = mline.substring(0, idx).trim();
                        var afterNum = mline.substring(idx).trim();
                        if (beforeNum) {
                            rolePart = beforeNum;
                            numberPart = afterNum;
                        } else {
                            addLogMessage('parseResponsibilitiesInput: line ' + mi + ' no role part, skip', 'warn');
                            continue;
                        }
                    } else {
                        addLogMessage('parseResponsibilitiesInput: line ' + mi + ' no numbers, skip', 'warn');
                        continue;
                    }
                }
                rolePart = rolePart.replace(/"+/g, '').trim();
                if (!rolePart) {
                    addLogMessage('parseResponsibilitiesInput: line ' + mi + ' empty role, skip', 'warn');
                    continue;
                }
                var normalized = normalizeRoleName(rolePart);
                if (!normalized.key) {
                    addLogMessage('parseResponsibilitiesInput: line ' + mi + ' normalize fail, skip', 'warn');
                    continue;
                }
                var numTokens = numberPart.replace(/,/g, ' ').split(/\s+/).filter(function(t) {
                    return t.length > 0;
                });
                var numbers = expandRanges(numTokens);
                if (numbers.size === 0) {
                    addLogMessage('parseResponsibilitiesInput: line ' + mi + ' no numbers for ' + normalized.display, 'warn');
                    continue;
                }
                if (!parsedMap[normalized.key]) {
                    parsedMap[normalized.key] = { displayRole: normalized.display, occurrences: [], union: new Set(), intersection: null, excluded: new Set() };
                }
                parsedMap[normalized.key].occurrences.push(numbers);
                addLogMessage('parseResponsibilitiesInput: role=' + normalized.display + ' occ#' + parsedMap[normalized.key].occurrences.length + ' nums=' + Array.from(numbers).join(','), 'log');
            }
            addLogMessage('parseResponsibilitiesInput: parsed ' + Object.keys(parsedMap).length + ' unique roles', 'log');
            return parsedMap;
        } catch (error) {
            addLogMessage('parseResponsibilitiesInput: error: ' + error.message, 'error');
            return null;
        }
    }

    function computeRoleCommonAndExcluded(parsedMap) {
        addLogMessage('computeRoleCommonAndExcluded: computing sets', 'log');
        var rolesData = [];
        var keys = Object.keys(parsedMap);
        for (var ki = 0; ki < keys.length; ki++) {
            var key = keys[ki];
            var entry = parsedMap[key];
            var union = new Set();
            var intersection = null;
            for (var oi = 0; oi < entry.occurrences.length; oi++) {
                var occ = entry.occurrences[oi];
                occ.forEach(function(n) {
                    union.add(n);
                });
                if (intersection === null) {
                    intersection = new Set(occ);
                } else {
                    var newInt = new Set();
                    intersection.forEach(function(n) {
                        if (occ.has(n)) {
                            newInt.add(n);
                        }
                    });
                    intersection = newInt;
                }
            }
            if (intersection === null) {
                intersection = new Set();
            }
            var excluded = new Set();
            union.forEach(function(n) {
                if (!intersection.has(n)) {
                    excluded.add(n);
                }
            });
            entry.union = union;
            entry.intersection = intersection;
            entry.excluded = excluded;
            var status = RESP_LABELS.statusPending;
            if (intersection.size === 0) {
                status = RESP_LABELS.statusFailed;
                addLogMessage('computeRoleCommonAndExcluded: role=' + entry.displayRole + ' empty intersection', 'warn');
            }
            rolesData.push({
                key: key,
                displayRole: entry.displayRole,
                common: Array.from(intersection).sort(function(a, b) {
                    return a - b;
                }),
                excluded: Array.from(excluded).sort(function(a, b) {
                    return a - b;
                }),
                intersection: intersection,
                status: status,
                reason: intersection.size === 0 ? 'No common numbers across occurrences' : ''
            });
            addLogMessage('computeRoleCommonAndExcluded: role=' + entry.displayRole + ' common=[' + rolesData[rolesData.length - 1].common.join(',') + '] excluded=[' + rolesData[rolesData.length - 1].excluded.join(',') + ']', 'log');
        }
        return rolesData;
    }

    function setResponsibilitiesInit() {
        addLogMessage('setResponsibilitiesInit: starting feature', 'log');
        respState.focusReturnElement = document.getElementById('resp-set-btn');
        resetRespState();
        var pageStep = document.querySelector(RESP_SELECTORS.pageStepRoot);
        addLogMessage('setResponsibilitiesInit: checking for page step root', 'log');
        if (!pageStep) {
            addLogMessage('setResponsibilitiesInit: not on Study Role Page', 'warn');
            showRespWarning();
            return;
        }
        addLogMessage('setResponsibilitiesInit: on Study Role Page', 'log');
        showResponsibilitiesInputPanel();
    }

    function showRespWarning() {
        addLogMessage('showRespWarning: creating warning popup', 'log');
        var modal = document.createElement('div');
        modal.id = 'resp-warning-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 30000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 12px; padding: 24px; width: 450px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'alertdialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'resp-warning-title');
        container.setAttribute('aria-describedby', 'resp-warning-message');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        var title = document.createElement('h3');
        title.id = 'resp-warning-title';
        title.textContent = 'Study Role Page Not Found';
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close warning');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        var closeWarning = function() {
            addLogMessage('showRespWarning: closing warning', 'log');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            if (respState.focusReturnElement) {
                respState.focusReturnElement.focus();
            }
        };
        closeButton.onclick = closeWarning;
        header.appendChild(title);
        header.appendChild(closeButton);
        var messageDiv = document.createElement('p');
        messageDiv.id = 'resp-warning-message';
        messageDiv.textContent = RESP_LABELS.notOnPageWarning + ' Please navigate to the Study Roles step before using this feature.';
        messageDiv.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px; line-height: 1.5;';
        var okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; margin-top: 20px; width: 100%;';
        okButton.onmouseover = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        okButton.onmouseout = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        okButton.onclick = closeWarning;
        var keyHandler = function(e) {
            if (e.key === 'Escape') {
                closeWarning();
            }
        };
        document.addEventListener('keydown', keyHandler);
        respState.eventListeners.push({ element: document, type: 'keydown', handler: keyHandler });
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
        okButton.focus();
        addLogMessage('showRespWarning: warning displayed', 'log');
    }

    function showResponsibilitiesInputPanel() {
        addLogMessage('showResponsibilitiesInputPanel: creating input panel', 'log');
        var modal = document.createElement('div');
        modal.id = 'resp-input-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 550px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'resp-input-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
        var titleEl = document.createElement('h3');
        titleEl.id = 'resp-input-title';
        titleEl.textContent = 'Set Responsibilities';
        titleEl.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600; letter-spacing: 0.2px;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close panel');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showResponsibilitiesInputPanel: closed by user', 'warn');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopResponsibilities();
        };
        header.appendChild(titleEl);
        header.appendChild(closeButton);
        var description = document.createElement('p');
        description.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;';
        description.append("Rules:");
        description.appendChild(document.createElement('br'));
        var lines = [
            'Make sure the Study Responsibilities Identifier are set to Numbers and NOT Letters',
            'Each line should contain the role name, followed by a tab, then the responsibility numbers.',
            'Ranges such as "1 to 8" are supported.',
            'Ensure that no existing Study Roles are already added on the page.',
            'Make sure the Staff Roles are spelled correctly.',
            'After clicking Confirm, do not click anywhere else on the page, as this will impact the process.',
            'Paste role-to-responsibility assignments below.',
        ];

        for (var i = 0; i < lines.length; i++) {
            description.appendChild(document.createTextNode('• ' + lines[i]));
            if (i < lines.length - 1) {
                description.appendChild(document.createElement('br'));
            }
        }
        var textarea = document.createElement('textarea');
        textarea.id = 'resp-input-textarea';
        textarea.placeholder = 'PI  1 to 8  13  14  17  21\nStudy Coordinator  1 6 7 8 10 12 13 14 17 33';
        textarea.setAttribute('aria-label', 'Role responsibilities input');
        textarea.style.cssText = 'width: 100%; height: 200px; padding: 12px 14px; border: 2px solid rgba(255, 255, 255, 0.35); border-radius: 10px; background: rgba(255, 255, 255, 0.95); color: #1e293b; font-size: 14px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; resize: vertical; outline: none; transition: all 0.25s ease; box-shadow: 0 2px 0 rgba(0,0,0,0.04) inset; box-sizing: border-box;';
        textarea.onfocus = function() {
            textarea.style.borderColor = '#8ea0ff';
            textarea.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.25)';
        };
        textarea.onblur = function() {
            textarea.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            textarea.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04) inset';
        };
        var confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm';
        confirmButton.disabled = true;
        confirmButton.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; transition: all 0.25s ease; opacity: 0.5;';
        textarea.oninput = function() {
            if (textarea.value.trim().length > 0) {
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
            } else {
                confirmButton.disabled = true;
                confirmButton.style.opacity = '0.5';
                confirmButton.style.cursor = 'not-allowed';
            }
        };
        confirmButton.onmouseover = function() {
            if (!confirmButton.disabled) {
                confirmButton.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)';
            }
        };
        confirmButton.onmouseout = function() {
            confirmButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        };
        confirmButton.onclick = function() {
            addLogMessage('showResponsibilitiesInputPanel: Confirm clicked', 'log');
            var parsedMap = parseResponsibilitiesInput(textarea.value);
            if (!parsedMap || Object.keys(parsedMap).length === 0) {
                addLogMessage('showResponsibilitiesInputPanel: no valid roles', 'warn');
                return;
            }
            respState.parsedRoles = parsedMap;
            var rd = computeRoleCommonAndExcluded(parsedMap);
            respState.rolesData = rd;
            addLogMessage('showResponsibilitiesInputPanel: parsed ' + rd.length + ' roles', 'log');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            showResponsibilitiesProgressPanel(rd);
            processRolesWorkflow(rd);
        };
        var clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All';
        clearButton.style.cssText = 'background: rgba(255, 255, 255, 0.18); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.25s ease;';
        clearButton.onmouseover = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.28)';
        };
        clearButton.onmouseout = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.18)';
        };
        clearButton.onclick = function() {
            addLogMessage('showResponsibilitiesInputPanel: Clear All clicked', 'log');
            textarea.value = '';
            respState.parsedRoles = null;
            confirmButton.disabled = true;
            confirmButton.style.opacity = '0.5';
            confirmButton.style.cursor = 'not-allowed';
        };
        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;';
        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(confirmButton);
        container.appendChild(header);
        container.appendChild(description);
        container.appendChild(textarea);
        container.appendChild(buttonContainer);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        textarea.focus();
        addLogMessage('showResponsibilitiesInputPanel: displayed', 'log');
    }

    function getRespBadgeColors(status) {
        if (status === RESP_LABELS.statusCompleted) {
            return { color: '#6bcf7f', bg: 'rgba(107, 207, 127, 0.2)' };
        }
        if (status === RESP_LABELS.statusFailed) {
            return { color: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.2)' };
        }
        if (status === RESP_LABELS.statusStopped) {
            return { color: '#aaa', bg: 'rgba(170, 170, 170, 0.2)' };
        }
        return { color: '#ffd93d', bg: 'rgba(255, 217, 61, 0.2)' };
    }

    function createRespRoleRow(roleData, index) {
        var item = document.createElement('div');
        item.className = 'resp-role-item';
        item.setAttribute('data-role-key', roleData.key);
        item.style.cssText = 'display: flex; flex-direction: column; padding: 10px 12px; margin: 4px 0; background: rgba(255, 255, 255, 0.08); border-radius: 6px; transition: background 0.2s ease;';
        item.onmouseover = function() {
            item.style.background = 'rgba(255, 255, 255, 0.12)';
        };
        item.onmouseout = function() {
            item.style.background = 'rgba(255, 255, 255, 0.08)';
        };
        var topRow = document.createElement('div');
        topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
        var leftSection = document.createElement('div');
        leftSection.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;';
        var indexBadge = document.createElement('span');
        indexBadge.textContent = String(index + 1);
        indexBadge.style.cssText = 'background: rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.7); font-size: 11px; font-weight: 600; min-width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
        var nameText = document.createElement('span');
        nameText.textContent = roleData.displayRole;
        nameText.style.cssText = 'color: white; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        leftSection.appendChild(indexBadge);
        leftSection.appendChild(nameText);
        var statusBadge = document.createElement('span');
        statusBadge.className = 'resp-status-badge';
        statusBadge.textContent = roleData.status;
        var badgeColors = getRespBadgeColors(roleData.status);
        statusBadge.style.cssText = 'color: ' + badgeColors.color + '; background: ' + badgeColors.bg + '; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 10px; white-space: nowrap; flex-shrink: 0;';
        topRow.appendChild(leftSection);
        topRow.appendChild(statusBadge);
        var detailRow = document.createElement('div');
        detailRow.className = 'resp-detail-row';
        detailRow.style.cssText = 'margin-top: 6px; font-size: 11px; color: rgba(255, 255, 255, 0.7); line-height: 1.4;';
        var commonLabel = document.createElement('div');
        commonLabel.innerHTML = '<strong style="color: rgba(255,255,255,0.85);">Common:</strong> ' + (roleData.common.length > 0 ? roleData.common.join(', ') : 'None');
        detailRow.appendChild(commonLabel);
        if (roleData.excluded.length > 0) {
            var excludedLabel = document.createElement('div');
            excludedLabel.innerHTML = '<strong style="color: rgba(255,255,255,0.85);">Excluded:</strong> ' + roleData.excluded.join(', ');
            detailRow.appendChild(excludedLabel);
        }
        if (roleData.reason) {
            var reasonLabel = document.createElement('div');
            reasonLabel.style.cssText = 'color: #ff6b6b; margin-top: 2px;';
            reasonLabel.textContent = roleData.reason;
            detailRow.appendChild(reasonLabel);
        }
        var liveRegion = document.createElement('span');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        item.appendChild(topRow);
        item.appendChild(detailRow);
        item.appendChild(liveRegion);
        return item;
    }
function showResponsibilitiesProgressPanel(rolesData) {
    addLogMessage('showResponsibilitiesProgressPanel: creating', 'log');
    respState.isRunning = true;
    respState.stopRequested = false;
    respState.counters = { total: rolesData.length, completed: 0, failed: 0, pending: 0 };
    for (var ci = 0; ci < rolesData.length; ci++) {
        if (rolesData[ci].status === RESP_LABELS.statusPending) {
            respState.counters.pending++;
        } else if (rolesData[ci].status === RESP_LABELS.statusFailed) {
            respState.counters.failed++;
        } else if (rolesData[ci].status === RESP_LABELS.statusCompleted) {
            respState.counters.completed++;
        }
    }
    var modal = document.createElement('div');
    modal.id = 'resp-progress-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
    var container = document.createElement('div');
    container.id = 'resp-progress-container';
    container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 750px; max-width: 95%; max-height: 80vh; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative; display: flex; flex-direction: column;';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-labelledby', 'resp-progress-title');
    var header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; order: 0;';
    var titleContainer = document.createElement('div');
    titleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    var title = document.createElement('h3');
    title.id = 'resp-progress-title';
    title.textContent = 'Set Responsibilities - Processing';
    title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
    var statusBadge = document.createElement('span');
    statusBadge.id = 'resp-status-badge';
    statusBadge.textContent = 'In Progress';
    statusBadge.style.cssText = 'background: rgba(255, 255, 255, 0.3); color: #ffd93d; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
    titleContainer.appendChild(title);
    titleContainer.appendChild(statusBadge);
    var closeButton = document.createElement('button');
    closeButton.innerHTML = '\u2715';
    closeButton.setAttribute('aria-label', 'Close and stop');
    closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
    closeButton.onmouseover = function() {
        closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
    };
    closeButton.onmouseout = function() {
        closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    };
    closeButton.onclick = function() {
        addLogMessage('showResponsibilitiesProgressPanel: closed', 'warn');
        stopResponsibilities();
    };
    header.appendChild(titleContainer);
    header.appendChild(closeButton);
    container.appendChild(header);
    addLogMessage('showResponsibilitiesProgressPanel: header appended', 'log');

    var descriptionContainer = document.createElement('div');
    descriptionContainer.style.cssText = 'margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);';
    var description = document.createElement('div');
    var bulletPoints = [
        'Do not click anywhere on the page or outside of the page. It will affect the process as doing so closes the dropdown menu.',
        'If you need to make changes, do it at the end of the process: delete the role and create another one.'
    ];
    description.innerHTML = bulletPoints.map(function(point) {
        return '• ' + point;
    }).join('<br>');
    description.style.cssText = 'color: rgba(255, 255, 255, 0.85); font-size: 13px; line-height: 1.4; font-weight: 400;';
    descriptionContainer.appendChild(description);
    container.appendChild(descriptionContainer);
    addLogMessage('showResponsibilitiesProgressPanel: description appended', 'log');

    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'resp-progress-search';
    searchInput.placeholder = 'Search roles...';
    searchInput.setAttribute('aria-label', 'Search roles');
    searchInput.style.cssText = 'width: 100%; padding: 8px 12px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 13px; outline: none; box-sizing: border-box; margin-bottom: 12px; flex-shrink: 0;';
    searchInput.oninput = function() {
        var term = searchInput.value.toLowerCase().trim();
        var items = document.querySelectorAll('.resp-role-item');
        for (var si = 0; si < items.length; si++) {
            var text = items[si].textContent.toLowerCase();
            if (!term || text.indexOf(term) !== -1) {
                items[si].style.display = 'flex';
            } else {
                items[si].style.display = 'none';
            }
        }
    };
    container.appendChild(searchInput);
    addLogMessage('showResponsibilitiesProgressPanel: search input appended', 'log');

    var listContainer = document.createElement('div');
    listContainer.id = 'resp-roles-list';
    listContainer.style.cssText = 'flex: 1; overflow-y: auto; min-height: 150px; max-height: 400px;';
    for (var ri = 0; ri < rolesData.length; ri++) {
        listContainer.appendChild(createRespRoleRow(rolesData[ri], ri));
    }
    container.appendChild(listContainer);
    addLogMessage('showResponsibilitiesProgressPanel: list appended', 'log');

    var summaryFooter = document.createElement('div');
    summaryFooter.id = 'resp-summary-footer';
    summaryFooter.style.cssText = 'display: flex; justify-content: space-around; align-items: center; padding: 10px 16px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; margin-top: 12px; flex-shrink: 0;';
    var summaryItems = [
        { id: 'resp-summary-total', label: 'Total', value: String(respState.counters.total) },
        { id: 'resp-summary-completed', label: 'Completed', value: String(respState.counters.completed) },
        { id: 'resp-summary-failed', label: 'Failed', value: String(respState.counters.failed) },
        { id: 'resp-summary-pending', label: 'Pending', value: String(respState.counters.pending) },
        { id: 'resp-summary-percent', label: 'Progress', value: '0%' }
    ];
    for (var si2 = 0; si2 < summaryItems.length; si2++) {
        var sItem = document.createElement('div');
        sItem.style.cssText = 'text-align: center;';
        var vSpan = document.createElement('span');
        vSpan.id = summaryItems[si2].id;
        vSpan.textContent = summaryItems[si2].value;
        vSpan.style.cssText = 'display: block; color: white; font-size: 16px; font-weight: 700;';
        var lSpan = document.createElement('span');
        lSpan.textContent = summaryItems[si2].label;
        lSpan.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.6); font-size: 11px; font-weight: 500; margin-top: 2px;';
        sItem.appendChild(vSpan);
        sItem.appendChild(lSpan);
        summaryFooter.appendChild(sItem);
    }
    container.appendChild(summaryFooter);
    addLogMessage('showResponsibilitiesProgressPanel: summary appended', 'log');

    var ariaLiveRegion = document.createElement('div');
    ariaLiveRegion.id = 'resp-aria-live';
    ariaLiveRegion.setAttribute('aria-live', 'polite');
    ariaLiveRegion.setAttribute('aria-atomic', 'true');
    ariaLiveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    container.appendChild(ariaLiveRegion);
    addLogMessage('showResponsibilitiesProgressPanel: aria-live appended', 'log');

    modal.appendChild(container);
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    modal.style.pointerEvents = 'none';
    container.style.pointerEvents = 'auto';
    makeDraggable(container, header);
    document.body.appendChild(modal);
    closeButton.focus();
    addLogMessage('showResponsibilitiesProgressPanel: displayed', 'log');
}


    function updateRespRoleStatus(roleKey, newStatus, reason) {
        addLogMessage('updateRespRoleStatus: role=' + roleKey + ' status=' + newStatus, 'log');
        var items = document.querySelectorAll('.resp-role-item');
        for (var i = 0; i < items.length; i++) {
            if (items[i].getAttribute('data-role-key') === roleKey) {
                var badge = items[i].querySelector('.resp-status-badge');
                if (badge) {
                    badge.textContent = newStatus;
                    var colors = getRespBadgeColors(newStatus);
                    badge.style.color = colors.color;
                    badge.style.background = colors.bg;
                }
                if (reason) {
                    var dr = items[i].querySelector('.resp-detail-row');
                    if (dr) {
                        var re = document.createElement('div');
                        re.style.cssText = 'color: #ff6b6b; margin-top: 2px;';
                        re.textContent = reason;
                        dr.appendChild(re);
                    }
                }
                var lr = items[i].querySelector('[aria-live]');
                if (lr) {
                    lr.textContent = roleKey + ' ' + newStatus;
                }
                break;
            }
        }
    }

    function updateRespSummary() {
        addLogMessage('updateRespSummary: t=' + respState.counters.total + ' c=' + respState.counters.completed + ' f=' + respState.counters.failed + ' p=' + respState.counters.pending, 'log');
        var el1 = document.getElementById('resp-summary-total');
        var el2 = document.getElementById('resp-summary-completed');
        var el3 = document.getElementById('resp-summary-failed');
        var el4 = document.getElementById('resp-summary-pending');
        var el5 = document.getElementById('resp-summary-percent');
        if (el1) {
            el1.textContent = String(respState.counters.total);
        }
        if (el2) {
            el2.textContent = String(respState.counters.completed);
        }
        if (el3) {
            el3.textContent = String(respState.counters.failed);
        }
        if (el4) {
            el4.textContent = String(respState.counters.pending);
        }
        if (el5) {
            var processed = respState.counters.completed + respState.counters.failed;
            var pct = respState.counters.total > 0 ? Math.round((processed / respState.counters.total) * 100) : 0;
            el5.textContent = pct + '%';
        }
        updateRespAriaLive('Completed: ' + respState.counters.completed + ', Failed: ' + respState.counters.failed + ', Pending: ' + respState.counters.pending);
    }

    function updateRespAriaLive(message) {
        var lr = document.getElementById('resp-aria-live');
        if (lr) {
            lr.textContent = message;
        }
    }

    function scanExistingCompletedRoles() {
        addLogMessage('scanExistingCompletedRoles: scanning', 'log');
        try {
            var dropList = document.querySelector(RESP_SELECTORS.dropListContainer);
            if (!dropList) {
                addLogMessage('scanExistingCompletedRoles: no drop list container', 'warn');
                return;
            }
            var columns = dropList.querySelectorAll(RESP_SELECTORS.roleColumns);
            addLogMessage('scanExistingCompletedRoles: ' + columns.length + ' columns', 'log');
            for (var colIdx = 0; colIdx < columns.length; colIdx++) {
                var checked = columns[colIdx].querySelectorAll(RESP_SELECTORS.selectedRoleCheckboxInColumn);
                for (var bi = 0; bi < checked.length; bi++) {
                    var ariaLabel = checked[bi].getAttribute('aria-label') || '';
                    var parentItem = checked[bi].closest('.filtered-select__list__item');
                    var roleText = ariaLabel || (parentItem ? parentItem.textContent || '' : '');
                    if (!roleText) {
                        continue;
                    }
                    var normalized = normalizeRoleName(roleText);
                    for (var ri = 0; ri < respState.rolesData.length; ri++) {
                        if (respState.rolesData[ri].key === normalized.key && respState.rolesData[ri].status === RESP_LABELS.statusPending) {
                            respState.rolesData[ri].status = RESP_LABELS.statusCompleted;
                            respState.counters.completed++;
                            respState.counters.pending--;
                            updateRespRoleStatus(respState.rolesData[ri].key, RESP_LABELS.statusCompleted, '');
                            addLogMessage('scanExistingCompletedRoles: ' + normalized.display + ' already done', 'log');
                        }
                    }
                }
            }
            updateRespSummary();
            updateRespAriaLive('Existing roles scanned');
        } catch (error) {
            addLogMessage('scanExistingCompletedRoles: error: ' + error.message, 'error');
        }
    }

    function findAvailableRoleColumn() {
        addLogMessage('findAvailableRoleColumn: searching for last empty column', 'log');
        return new Promise(function(resolve, reject) {
            if (respState.stopRequested) {
                reject(new Error('Stopped'));
                return;
            }
            var dropList = document.querySelector(RESP_SELECTORS.dropListContainer);
            if (!dropList) {
                addLogMessage('findAvailableRoleColumn: drop list container not found', 'warn');
                reject(new Error('Drop list container not found'));
                return;
            }
            var columns = dropList.querySelectorAll(RESP_SELECTORS.roleColumns);
            addLogMessage('findAvailableRoleColumn: found ' + columns.length + ' columns in drop list', 'log');
            var lastEmpty = null;
            for (var ci = columns.length - 1; ci >= 0; ci--) {
                var selectedCheckbox = columns[ci].querySelector(RESP_SELECTORS.selectedRoleCheckboxInColumn);
                if (!selectedCheckbox) {
                    lastEmpty = columns[ci];
                    addLogMessage('findAvailableRoleColumn: last empty column at index ' + ci, 'log');
                    break;
                }
            }
            if (lastEmpty) {
                resolve(lastEmpty);
                return;
            }
            addLogMessage('findAvailableRoleColumn: no empty columns, clicking Add Study Role', 'log');
            var addBtn = document.querySelector(RESP_SELECTORS.addStudyRoleBtn);
            if (!addBtn) {
                reject(new Error('Add Study Role button not found'));
                return;
            }
            addBtn.click();
            var waitTid = setTimeout(function() {
                var updatedColumns = dropList.querySelectorAll(RESP_SELECTORS.roleColumns);
                addLogMessage('findAvailableRoleColumn: after add, ' + updatedColumns.length + ' columns', 'log');
                if (updatedColumns.length === 0) {
                    reject(new Error('No columns found after adding study role'));
                    return;
                }
                var lastCol = updatedColumns[updatedColumns.length - 1];
                var sel = lastCol.querySelector(RESP_SELECTORS.selectedRoleCheckboxInColumn);
                if (!sel) {
                    addLogMessage('findAvailableRoleColumn: new last column at index ' + (updatedColumns.length - 1), 'log');
                    resolve(lastCol);
                    return;
                }
                reject(new Error('No empty column after adding study role'));
            }, RESP_TIMEOUTS.waitAddRoleResultMs);
            respState.timeouts.push(waitTid);
        });
    }

    function dismissRoleListDropdown(columnEl) {
        addLogMessage('dismissRoleListDropdown: attempting to close role dropdown', 'log');
        return new Promise(function(resolve) {
            var globalList = document.querySelector(RESP_SELECTORS.roleListContainer);
            if (!globalList) {
                addLogMessage('dismissRoleListDropdown: no role list open, nothing to close', 'log');
                resolve();
                return;
            }
            addLogMessage('dismissRoleListDropdown: role list is open, trying Escape key', 'log');
            var escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true });
            document.activeElement.dispatchEvent(escEvent);
            document.dispatchEvent(escEvent);
            var attempts = 0;
            function waitClosed() {
                var stillOpen = document.querySelector(RESP_SELECTORS.roleListContainer);
                if (!stillOpen) {
                    addLogMessage('dismissRoleListDropdown: role list closed successfully', 'log');
                    resolve();
                    return;
                }
                attempts++;
                if (attempts === 1) {
                    addLogMessage('dismissRoleListDropdown: Escape did not work, clicking input to toggle closed', 'log');
                    if (columnEl) {
                        var inputEl = columnEl.querySelector(RESP_SELECTORS.roleSearchInput);
                        if (!inputEl) {
                            inputEl = columnEl.querySelector('.filtered-select__input, input[placeholder*="Search"]');
                        }
                        if (inputEl) {
                            inputEl.click();
                        }
                    }
                }
                if (attempts === 3) {
                    addLogMessage('dismissRoleListDropdown: still open, clicking body and blurring', 'log');
                    if (document.activeElement) {
                        document.activeElement.blur();
                    }
                    document.body.click();
                }
                if (attempts === 5) {
                    addLogMessage('dismissRoleListDropdown: clicking main panel area to dismiss', 'log');
                    var mainPanel = document.querySelector(RESP_SELECTORS.mainPanelButtonTarget);
                    if (mainPanel) {
                        mainPanel.click();
                    }
                }
                if (attempts >= 8) {
                    addLogMessage('dismissRoleListDropdown: could not close after ' + attempts + ' attempts, proceeding anyway', 'warn');
                    resolve();
                    return;
                }
                var tid = setTimeout(waitClosed, 250);
                respState.timeouts.push(tid);
            }
            var initTid = setTimeout(waitClosed, 300);
            respState.timeouts.push(initTid);
        });
    }

    function ensureRoleListOpenForColumn(columnEl) {
        addLogMessage('ensureRoleListOpenForColumn: ensuring open in target column', 'log');
        return dismissRoleListDropdown(columnEl).then(function() {
            return new Promise(function(resolve, reject) {
            var retries = 0;
            function tryOpen() {
                if (respState.stopRequested) {
                    reject(new Error('Stopped'));
                    return;
                }
                addLogMessage('ensureRoleListOpenForColumn: attempt ' + (retries + 1), 'log');
                var globalList = document.querySelector(RESP_SELECTORS.roleListContainer);
                if (globalList) {
                    addLogMessage('ensureRoleListOpenForColumn: global list already open', 'log');
                    resolve(globalList);
                    return;
                }
                var inputEl = columnEl.querySelector(RESP_SELECTORS.roleSearchInput);
                if (!inputEl) {
                    inputEl = columnEl.querySelector('.filtered-select__input, input[placeholder*="Search"]');
                }
                if (!inputEl) {
                    var allInputs = columnEl.querySelectorAll('input');
                    if (allInputs.length > 0) {
                        inputEl = allInputs[0];
                    }
                }
                if (inputEl) {
                    addLogMessage('ensureRoleListOpenForColumn: clicking input in column', 'log');
                    inputEl.click();
                    inputEl.focus();
                } else {
                    addLogMessage('ensureRoleListOpenForColumn: no input found in column, clicking column itself', 'warn');
                    columnEl.click();
                }
                var waitStart = Date.now();
                function pollForList() {
                    var el = document.querySelector(RESP_SELECTORS.roleListContainer);
                    if (el) {
                        addLogMessage('ensureRoleListOpenForColumn: global list appeared', 'log');
                        resolve(el);
                        return;
                    }
                    var vp = document.querySelector('cdk-virtual-scroll-viewport');
                    if (vp && vp.scrollHeight > 0 && vp.clientHeight > 0) {
                        addLogMessage('ensureRoleListOpenForColumn: found active viewport as list proxy', 'log');
                        resolve(vp);
                        return;
                    }
                    if (Date.now() - waitStart > RESP_TIMEOUTS.waitListOpenMs) {
                        retries++;
                        if (retries < RESP_RETRY.openListRetries) {
                            var tid = setTimeout(tryOpen, 300);
                            respState.timeouts.push(tid);
                        } else {
                            reject(new Error('Could not open role list in column'));
                        }
                        return;
                    }
                    var pt = setTimeout(pollForList, 200);
                    respState.timeouts.push(pt);
                }
                pollForList();
            }
            tryOpen();
        });
        });
    }

    function findRoleListViewport() {
        var allViewports = document.querySelectorAll('cdk-virtual-scroll-viewport');
        addLogMessage('findRoleListViewport: found ' + allViewports.length + ' global cdk-virtual-scroll-viewport elements', 'log');
        if (allViewports.length > 0) {
            var best = null;
            for (var vi = allViewports.length - 1; vi >= 0; vi--) {
                var vp = allViewports[vi];
                if (vp.scrollHeight > 0 && vp.clientHeight > 0) {
                    best = vp;
                    addLogMessage('findRoleListViewport: using viewport index ' + vi + ' scrollH=' + vp.scrollHeight + ' clientH=' + vp.clientHeight, 'log');
                    break;
                }
            }
            if (best) {
                return best;
            }
            var last = allViewports[allViewports.length - 1];
            addLogMessage('findRoleListViewport: fallback to last viewport index ' + (allViewports.length - 1) + ' scrollH=' + last.scrollHeight + ' clientH=' + last.clientHeight, 'log');
            return last;
        }
        var listEl = document.querySelector(RESP_SELECTORS.roleListContainer);
        if (listEl) {
            addLogMessage('findRoleListViewport: fallback to global list container scrollH=' + listEl.scrollHeight + ' clientH=' + listEl.clientHeight, 'log');
            return listEl;
        }
        addLogMessage('findRoleListViewport: no viewport found anywhere', 'warn');
        return null;
    }

    function respRememberListScrollPosition(viewportEl) {
        if (viewportEl) {
            respState.listScrollTop = viewportEl.scrollTop;
            addLogMessage('respRememberScroll: ' + respState.listScrollTop, 'log');
        }
    }

    function respRestoreListScrollPosition(viewportEl) {
        if (viewportEl && respState.listScrollTop > 0) {
            viewportEl.scrollTop = respState.listScrollTop;
            addLogMessage('respRestoreScroll: ' + respState.listScrollTop, 'log');
        }
    }

    function attemptSelectByScrollingForRole(columnEl, targetRoleDisplay, targetRoleKey) {
        addLogMessage('attemptSelectByScrollingForRole: target=' + targetRoleDisplay + ' key=' + targetRoleKey, 'log');
        return new Promise(function(resolve) {
            var viewportEl = findRoleListViewport();
            if (!viewportEl) {
                addLogMessage('attemptSelectByScrollingForRole: no viewport found', 'error');
                resolve(false);
                return;
            }
            addLogMessage('attemptSelectByScrollingForRole: viewport scrollH=' + viewportEl.scrollHeight + ' clientH=' + viewportEl.clientHeight, 'log');
            viewportEl.scrollTop = 0;
            var passCount = 0;
            var lastScrollTop = -1;
            var lastSnapshot = '';
            var startTime = Date.now();

            function scanAndScroll() {
                if (respState.stopRequested) {
                    respRememberListScrollPosition(viewportEl);
                    resolve(false);
                    return;
                }
                if (Date.now() - startTime > RESP_TIMEOUTS.maxSelectRoleDurationMs) {
                    addLogMessage('attemptSelectByScrollingForRole: max duration exceeded', 'warn');
                    respRememberListScrollPosition(viewportEl);
                    resolve(false);
                    return;
                }
                if (passCount >= RESP_RETRY.maxScrollPasses) {
                    addLogMessage('attemptSelectByScrollingForRole: max passes reached (' + passCount + ')', 'warn');
                    respRememberListScrollPosition(viewportEl);
                    resolve(false);
                    return;
                }
                var options = document.querySelectorAll(RESP_SELECTORS.roleOptionItem);
                var retryCount = 0;

                function tryScan() {
                    options = document.querySelectorAll(RESP_SELECTORS.roleOptionItem);
                    if (options.length === 0 && retryCount < RESP_RETRY.optionScanRetries) {
                        retryCount++;
                        addLogMessage('attemptSelectByScrollingForRole: empty render, retry ' + retryCount, 'log');
                        var rtid = setTimeout(tryScan, RESP_TIMEOUTS.waitOptionRenderMs);
                        respState.timeouts.push(rtid);
                        return;
                    }
                    addLogMessage('attemptSelectByScrollingForRole: scanning ' + options.length + ' options at scrollTop=' + viewportEl.scrollTop, 'log');
                    var found = false;
                    var optTexts = [];
                    for (var oi = 0; oi < options.length; oi++) {
                        var textEl = options[oi].querySelector(RESP_SELECTORS.roleOptionText);
                        var optText = textEl ? textEl.textContent.trim() : (options[oi].textContent || '').trim();
                        optTexts.push(optText);
                        var optKey = optText.replace(RESP_REGEX.quoteCleanup, '').replace(RESP_REGEX.lineBreakInRole, ' ').replace(RESP_REGEX.whitespace, ' ').trim().toLowerCase();
                        addLogMessage('attemptSelectByScrollingForRole: option[' + oi + '] text=' + optText + ' key=' + optKey, 'log');
                        if (optKey === targetRoleKey) {
                            addLogMessage('attemptSelectByScrollingForRole: MATCH at index ' + oi + ' text=' + optText, 'log');
                            var cb = options[oi].querySelector(RESP_SELECTORS.roleOptionCheckboxTri);
                            if (cb) {
                                cb.click();
                                addLogMessage('attemptSelectByScrollingForRole: clicked checkbox tristate', 'log');
                            } else {
                                options[oi].click();
                                addLogMessage('attemptSelectByScrollingForRole: clicked option item directly', 'log');
                            }
                            found = true;
                            respRememberListScrollPosition(viewportEl);
                            var vt = setTimeout(function() {
                                addLogMessage('attemptSelectByScrollingForRole: closing role dropdown after selection', 'log');
                                document.body.click();
                                var closeTid = setTimeout(function() {
                                    resolve(true);
                                }, 300);
                                respState.timeouts.push(closeTid);
                            }, RESP_TIMEOUTS.waitAfterSelectRoleMs);
                            respState.timeouts.push(vt);
                            break;
                        }
                    }
                    if (!found) {
                        var snap = optTexts.join('|');
                        var curTop = viewportEl.scrollTop;
                        if (curTop === lastScrollTop && snap === lastSnapshot) {
                            passCount++;
                            addLogMessage('attemptSelectByScrollingForRole: no progress pass ' + passCount + ' opts=' + options.length, 'log');
                        }
                        lastScrollTop = curTop;
                        lastSnapshot = snap;
                        var step = Math.round(viewportEl.clientHeight * RESP_SCROLL.stepRatio);
                        if (step < 50) {
                            step = 200;
                            addLogMessage('attemptSelectByScrollingForRole: step too small, using fallback 200px', 'warn');
                        }
                        var maxS = viewportEl.scrollHeight - viewportEl.clientHeight;
                        var newTop = Math.min(curTop + step, maxS);
                        if (newTop <= curTop && curTop > 0) {
                            addLogMessage('attemptSelectByScrollingForRole: at bottom, wrapping to top', 'log');
                            newTop = 0;
                            lastScrollTop = -1;
                            lastSnapshot = '';
                            passCount++;
                        }
                        viewportEl.scrollTop = newTop;
                        addLogMessage('attemptSelectByScrollingForRole: scrolled to ' + newTop + ' (max=' + maxS + ' step=' + step + ')', 'log');
                        var st = setTimeout(scanAndScroll, RESP_TIMEOUTS.idleBetweenScrollsMs);
                        respState.timeouts.push(st);
                    }
                }
                tryScan();
            }
            var initTid = setTimeout(scanAndScroll, RESP_TIMEOUTS.settleAfterScrollMs);
            respState.timeouts.push(initTid);
        });
    }

    function dismissExistingResponsibilitiesMenu() {
        return new Promise(function(resolve) {
            var allMenus = document.querySelectorAll(RESP_SELECTORS.responsibilitiesMenu);
            if (allMenus.length === 0) {
                resolve();
                return;
            }
            addLogMessage('dismissExistingResponsibilitiesMenu: found ' + allMenus.length + ' open menu(s), closing', 'log');
            var allToggles = document.querySelectorAll(RESP_SELECTORS.responsibilitiesToggleBtn);
            for (var ti = 0; ti < allToggles.length; ti++) {
                var btn = allToggles[ti];
                var expanded = btn.getAttribute('aria-expanded');
                if (expanded === 'true') {
                    addLogMessage('dismissExistingResponsibilitiesMenu: clicking expanded toggle at index ' + ti, 'log');
                    btn.click();
                }
            }
            if (allToggles.length === 0) {
                document.body.click();
            }
            var attempts = 0;
            function waitGone() {
                var still = document.querySelectorAll(RESP_SELECTORS.responsibilitiesMenu);
                if (still.length === 0) {
                    addLogMessage('dismissExistingResponsibilitiesMenu: all menus closed', 'log');
                    resolve();
                    return;
                }
                attempts++;
                if (attempts >= 10) {
                    addLogMessage('dismissExistingResponsibilitiesMenu: menus still visible after retries, clicking body to close', 'warn');
                    document.body.click();
                    var finalTid = setTimeout(function() {
                        addLogMessage('dismissExistingResponsibilitiesMenu: proceeding after final close attempt', 'log');
                        resolve();
                    }, 300);
                    respState.timeouts.push(finalTid);
                    return;
                }
                if (attempts === 5) {
                    addLogMessage('dismissExistingResponsibilitiesMenu: mid-retry body click', 'log');
                    document.body.click();
                }
                var tid = setTimeout(waitGone, 200);
                respState.timeouts.push(tid);
            }
            var initTid = setTimeout(waitGone, 300);
            respState.timeouts.push(initTid);
        });
    }

    function openResponsibilitiesDropdown(columnEl) {
        addLogMessage('openResponsibilitiesDropdown: opening responsibilities dropdown', 'log');
        return dismissExistingResponsibilitiesMenu().then(function() {
            return new Promise(function(resolve, reject) {
                try {
                    var targetColumn = columnEl;
                    addLogMessage('openResponsibilitiesDropdown: using passed columnEl directly', 'log');
                    var toggleBtn = targetColumn.querySelector(RESP_SELECTORS.responsibilitiesToggleBtn);
                    if (!toggleBtn) {
                        toggleBtn = targetColumn.querySelector('button[dropdowntoggle]');
                    }
                    if (!toggleBtn) {
                        toggleBtn = targetColumn.querySelector('.roles__select-options-dropdown-button');
                    }
                    if (!toggleBtn) {
                        var allToggles = document.querySelectorAll(RESP_SELECTORS.responsibilitiesToggleBtn);
                        if (allToggles.length > 0) {
                            toggleBtn = allToggles[allToggles.length - 1];
                            addLogMessage('openResponsibilitiesDropdown: using last global toggle button', 'log');
                        }
                    }
                    if (!toggleBtn) {
                        addLogMessage('openResponsibilitiesDropdown: toggle button not found anywhere', 'error');
                        reject(new Error('Responsibilities toggle button not found'));
                        return;
                    }
                    var menusBefore = document.querySelectorAll(RESP_SELECTORS.responsibilitiesMenu).length;
                    addLogMessage('openResponsibilitiesDropdown: menus before click: ' + menusBefore + ', clicking toggle button', 'log');
                    toggleBtn.click();

                    function waitForLastMenu(timeoutMs, retryClick) {
                        var elapsed = 0;
                        var interval = 100;
                        function poll() {
                            var allMenus = document.querySelectorAll(RESP_SELECTORS.responsibilitiesMenu);
                            var lastMenu = allMenus.length > 0 ? allMenus[allMenus.length - 1] : null;
                            if (allMenus.length > menusBefore && lastMenu) {
                                addLogMessage('openResponsibilitiesDropdown: new menu appeared (count ' + menusBefore + ' -> ' + allMenus.length + ')', 'log');
                                resolve(lastMenu);
                                return;
                            }
                            if (lastMenu && allMenus.length >= 1) {
                                var isVisible = lastMenu.offsetParent !== null || lastMenu.offsetHeight > 0;
                                if (isVisible) {
                                    addLogMessage('openResponsibilitiesDropdown: last menu is visible (count=' + allMenus.length + ')', 'log');
                                    resolve(lastMenu);
                                    return;
                                }
                            }
                            elapsed += interval;
                            if (elapsed >= timeoutMs) {
                                if (retryClick) {
                                    addLogMessage('openResponsibilitiesDropdown: timeout, retrying click', 'warn');
                                    toggleBtn.click();
                                    waitForLastMenu(timeoutMs, false);
                                } else {
                                    if (lastMenu) {
                                        addLogMessage('openResponsibilitiesDropdown: timeout but using last menu', 'warn');
                                        resolve(lastMenu);
                                    } else {
                                        reject(new Error('Timeout waiting for responsibilities menu'));
                                    }
                                }
                                return;
                            }
                            var tid = setTimeout(poll, interval);
                            respState.timeouts.push(tid);
                        }
                        var initTid = setTimeout(poll, interval);
                        respState.timeouts.push(initTid);
                    }
                    waitForLastMenu(RESP_TIMEOUTS.waitResponsibilitiesMenuMs, true);
                } catch (error) {
                    addLogMessage('openResponsibilitiesDropdown: error: ' + error.message, 'error');
                    reject(error);
                }
            });
        });
    }

    function selectResponsibilitiesByNumbers(numbersSet, menuEl) {
        addLogMessage('selectResponsibilitiesByNumbers: selecting ' + numbersSet.size + ' numbers: [' + Array.from(numbersSet).join(',') + ']', 'log');
        return new Promise(function(resolve) {
            try {
                var remaining = new Set(numbersSet);
                var scrollPassCount = 0;
                var maxScrollPasses = 10;
                var lastSnapshot = '';

                function getMenuContainer() {
                    if (menuEl && menuEl.isConnected) {
                        return menuEl;
                    }
                    var allMenus = document.querySelectorAll(RESP_SELECTORS.responsibilitiesMenu);
                    return allMenus.length > 0 ? allMenus[allMenus.length - 1] : null;
                }

                function processVisibleItems(callback) {
                    var container = getMenuContainer();
                    var items = container ? container.querySelectorAll('li') : document.querySelectorAll(RESP_SELECTORS.responsibilitiesItem);
                    addLogMessage('selectResponsibilitiesByNumbers: ' + items.length + ' visible items, ' + remaining.size + ' remaining', 'log');
                    var idx = 0;

                    function nextItem() {
                        if (respState.stopRequested) {
                            callback();
                            return;
                        }
                        if (idx >= items.length) {
                            callback();
                            return;
                        }
                        var item = items[idx];
                        var text = (item.textContent || '').trim();
                        var numMatch = text.match(/(\d+)/);
                        if (numMatch) {
                            var num = parseInt(numMatch[1], 10);
                            if (remaining.has(num)) {
                                var checkbox = item.querySelector('input[type="checkbox"]');
                                if (checkbox && !checkbox.checked) {
                                    addLogMessage('selectResponsibilitiesByNumbers: toggling checkbox for ' + num, 'log');
                                    checkbox.click();
                                    remaining.delete(num);
                                    idx++;
                                    var tid = setTimeout(nextItem, RESP_TIMEOUTS.waitAfterToggleResponsibilityMs);
                                    respState.timeouts.push(tid);
                                    return;
                                } else if (checkbox && checkbox.checked) {
                                    addLogMessage('selectResponsibilitiesByNumbers: ' + num + ' already checked', 'log');
                                    remaining.delete(num);
                                } else if (!checkbox) {
                                    addLogMessage('selectResponsibilitiesByNumbers: no checkbox for ' + num + ', clicking item', 'log');
                                    item.click();
                                    remaining.delete(num);
                                    idx++;
                                    var tid2 = setTimeout(nextItem, RESP_TIMEOUTS.waitAfterToggleResponsibilityMs);
                                    respState.timeouts.push(tid2);
                                    return;
                                }
                            }
                        }
                        idx++;
                        var tid3 = setTimeout(nextItem, 20);
                        respState.timeouts.push(tid3);
                    }
                    nextItem();
                }

                function scrollAndProcess() {
                    if (respState.stopRequested || remaining.size === 0) {
                        addLogMessage('selectResponsibilitiesByNumbers: done, remaining=' + remaining.size, 'log');
                        resolve();
                        return;
                    }
                    if (scrollPassCount >= maxScrollPasses) {
                        addLogMessage('selectResponsibilitiesByNumbers: max scroll passes, remaining=' + remaining.size, 'warn');
                        resolve();
                        return;
                    }
                    processVisibleItems(function() {
                        if (remaining.size === 0) {
                            addLogMessage('selectResponsibilitiesByNumbers: all selected', 'log');
                            resolve();
                            return;
                        }
                        var menuEl = getMenuContainer();
                        if (!menuEl) {
                            addLogMessage('selectResponsibilitiesByNumbers: menu gone, resolving', 'warn');
                            resolve();
                            return;
                        }
                        var items = menuEl.querySelectorAll('li');
                        var snap = '';
                        for (var si = 0; si < items.length; si++) {
                            snap += (items[si].textContent || '').trim() + '|';
                        }
                        if (snap === lastSnapshot) {
                            scrollPassCount++;
                            addLogMessage('selectResponsibilitiesByNumbers: no new items pass ' + scrollPassCount, 'log');
                        }
                        lastSnapshot = snap;
                        var scrollStep = Math.round(menuEl.clientHeight * 0.7);
                        if (scrollStep < 50) {
                            scrollStep = 200;
                        }
                        var maxScroll = menuEl.scrollHeight - menuEl.clientHeight;
                        var newTop = Math.min(menuEl.scrollTop + scrollStep, maxScroll);
                        if (newTop <= menuEl.scrollTop && maxScroll > 0) {
                            addLogMessage('selectResponsibilitiesByNumbers: at bottom of menu, done scrolling', 'log');
                            resolve();
                            return;
                        }
                        menuEl.scrollTop = newTop;
                        addLogMessage('selectResponsibilitiesByNumbers: scrolled menu to ' + newTop + ' (max=' + maxScroll + ')', 'log');
                        scrollPassCount++;
                        var tid4 = setTimeout(scrollAndProcess, RESP_TIMEOUTS.settleAfterScrollMs);
                        respState.timeouts.push(tid4);
                    });
                }
                scrollAndProcess();
            } catch (error) {
                addLogMessage('selectResponsibilitiesByNumbers: error: ' + error.message, 'error');
                resolve();
            }
        });
    }

    function clickAddStudyRole() {
        addLogMessage('clickAddStudyRole: clicking', 'log');
        return new Promise(function(resolve) {
            var retries = 0;

            function tryClick() {
                if (respState.stopRequested) {
                    resolve(false);
                    return;
                }
                var addBtn = document.querySelector(RESP_SELECTORS.addStudyRoleBtn);
                if (!addBtn) {
                    addLogMessage('clickAddStudyRole: button not found', 'warn');
                    resolve(false);
                    return;
                }
                if (addBtn.disabled || addBtn.getAttribute('disabled') !== null) {
                    if (retries < RESP_RETRY.addRoleRetries) {
                        retries++;
                        addLogMessage('clickAddStudyRole: button disabled, retry ' + retries, 'log');
                        var tid = setTimeout(tryClick, 1000);
                        respState.timeouts.push(tid);
                        return;
                    }
                    addLogMessage('clickAddStudyRole: button still disabled after retries', 'warn');
                    resolve(false);
                    return;
                }
                addBtn.click();
                addLogMessage('clickAddStudyRole: clicked, waiting for result', 'log');
                var wt = setTimeout(function() {
                    resolve(true);
                }, RESP_TIMEOUTS.waitAddRoleResultMs);
                respState.timeouts.push(wt);
            }
            tryClick();
        });
    }

    function respSetAriaBusyOn() {
        var target = document.querySelector(RESP_ATTRS.ariaBusyTarget);
        if (target) {
            respState.prevAriaBusy = target.getAttribute(RESP_ATTRS.ariaBusyAttr);
            target.setAttribute(RESP_ATTRS.ariaBusyAttr, 'true');
            addLogMessage('respSetAriaBusyOn: set aria-busy=true', 'log');
        }
    }

    function respSetAriaBusyOff() {
        var target = document.querySelector(RESP_ATTRS.ariaBusyTarget);
        if (target) {
            if (respState.prevAriaBusy !== null) {
                target.setAttribute(RESP_ATTRS.ariaBusyAttr, respState.prevAriaBusy);
            } else {
                target.removeAttribute(RESP_ATTRS.ariaBusyAttr);
            }
            respState.prevAriaBusy = null;
            addLogMessage('respSetAriaBusyOff: restored aria-busy', 'log');
        }
    }

    function processRolesWorkflow(rolesData) {
        addLogMessage('processRolesWorkflow: starting with ' + rolesData.length + ' roles', 'log');
        respState.isRunning = true;
        respState.stopRequested = false;
        respSetAriaBusyOn();
        updateRespAriaLive(RESP_LABELS.scanningExisting);
        scanExistingCompletedRoles();
        var roleIndex = 0;

        function processNextRole() {
            if (respState.stopRequested) {
                addLogMessage('processRolesWorkflow: stop requested, marking remaining roles', 'log');
                for (var si = roleIndex; si < rolesData.length; si++) {
                    if (rolesData[si].status === RESP_LABELS.statusPending) {
                        rolesData[si].status = RESP_LABELS.statusStopped;
                        respState.counters.pending--;
                        updateRespRoleStatus(rolesData[si].key, RESP_LABELS.statusStopped, '');
                    }
                }
                updateRespSummary();
                respSetAriaBusyOff();
                var t1 = document.getElementById('resp-progress-title');
                if (t1) {
                    t1.textContent = 'Set Responsibilities - Stopped';
                }
                var b1 = document.getElementById('resp-status-badge');
                if (b1) {
                    b1.textContent = 'Stopped';
                    b1.style.color = '#aaa';
                }
                updateRespAriaLive('Process stopped');
                respState.isRunning = false;
                return;
            }
            if (roleIndex >= rolesData.length) {
                addLogMessage('processRolesWorkflow: all roles processed', 'log');
                respSetAriaBusyOff();
                respState.isRunning = false;
                var t2 = document.getElementById('resp-progress-title');
                if (t2) {
                    t2.textContent = 'Set Responsibilities - Complete';
                }
                var b2 = document.getElementById('resp-status-badge');
                if (b2) {
                    b2.textContent = 'Complete';
                    b2.style.background = 'rgba(107, 207, 127, 0.3)';
                    b2.style.color = '#6bcf7f';
                }
                updateRespSummary();
                updateRespAriaLive('Complete. Done: ' + respState.counters.completed + ', Failed: ' + respState.counters.failed);
                return;
            }
            var role = rolesData[roleIndex];
            if (role.status !== RESP_LABELS.statusPending) {
                addLogMessage('processRolesWorkflow: skipping ' + role.displayRole + ' (status=' + role.status + ')', 'log');
                roleIndex++;
                var sk = setTimeout(processNextRole, 50);
                respState.timeouts.push(sk);
                return;
            }
            addLogMessage('processRolesWorkflow: processing role ' + (roleIndex + 1) + '/' + rolesData.length + ': ' + role.displayRole, 'log');
            updateRespAriaLive(RESP_LABELS.selectingRole + ': ' + role.displayRole);
            var currentColumnEl = null;

            findAvailableRoleColumn()
                .then(function(columnEl) {
                currentColumnEl = columnEl;
                if (respState.stopRequested) {
                    throw new Error('Stopped');
                }
                addLogMessage('processRolesWorkflow: got column for ' + role.displayRole, 'log');
                return ensureRoleListOpenForColumn(columnEl);
            })
                .then(function() {
                if (respState.stopRequested) {
                    throw new Error('Stopped');
                }
                addLogMessage('processRolesWorkflow: list open, attempting scroll select for ' + role.displayRole, 'log');
                return attemptSelectByScrollingForRole(currentColumnEl, role.displayRole, role.key);
            })
                .then(function(selected) {
                if (respState.stopRequested) {
                    throw new Error('Stopped');
                }
                if (!selected) {
                    addLogMessage('processRolesWorkflow: role not found in dropdown: ' + role.displayRole + ', closing dropdown before continuing', 'warn');
                    role.status = RESP_LABELS.statusFailed;
                    role.reason = 'Role not in dropdown, or dropdown menu failed to open.';
                    respState.counters.failed++;
                    respState.counters.pending--;
                    updateRespRoleStatus(role.key, RESP_LABELS.statusFailed, 'Role not in dropdown, or dropdown menu failed to open.');
                    updateRespSummary();
                    return dismissRoleListDropdown(currentColumnEl).then(function() {
                        roleIndex++;
                        var ft = setTimeout(processNextRole, 300);
                        respState.timeouts.push(ft);
                    });
                }
                addLogMessage('processRolesWorkflow: role selected, opening responsibilities for ' + role.displayRole, 'log');
                updateRespAriaLive(RESP_LABELS.selectingResponsibilities + ': ' + role.displayRole);
                return openResponsibilitiesDropdown(currentColumnEl)
                    .then(function(menu) {
                    if (respState.stopRequested) {
                        throw new Error('Stopped');
                    }
                    addLogMessage('processRolesWorkflow: responsibilities menu open for ' + role.displayRole, 'log');
                    return selectResponsibilitiesByNumbers(role.intersection, menu);
                })
                    .then(function() {
                    if (respState.stopRequested) {
                        throw new Error('Stopped');
                    }
                    addLogMessage('processRolesWorkflow: responsibilities selected, clicking Add Study Role for ' + role.displayRole, 'log');
                    updateRespAriaLive(RESP_LABELS.addingRole + ': ' + role.displayRole);
                    return dismissExistingResponsibilitiesMenu();
                })
                    .then(function() {
                    if (respState.stopRequested) {
                        throw new Error('Stopped');
                    }
                    return clickAddStudyRole();
                })
                    .then(function(addOk) {
                    if (addOk) {
                        addLogMessage('processRolesWorkflow: ' + role.displayRole + ' completed', 'log');
                        role.status = RESP_LABELS.statusCompleted;
                        respState.counters.completed++;
                        respState.counters.pending--;
                        updateRespRoleStatus(role.key, RESP_LABELS.statusCompleted, '');
                    } else {
                        addLogMessage('processRolesWorkflow: ' + role.displayRole + ' add failed', 'warn');
                        role.status = RESP_LABELS.statusFailed;
                        role.reason = 'Add Study Role failed';
                        respState.counters.failed++;
                        respState.counters.pending--;
                        updateRespRoleStatus(role.key, RESP_LABELS.statusFailed, 'Add Study Role failed');
                    }
                    updateRespSummary();
                    roleIndex++;
                    var nt = setTimeout(processNextRole, 200);
                    respState.timeouts.push(nt);
                });
            })
                .catch(function(err) {
                addLogMessage('processRolesWorkflow: error for ' + role.displayRole + ': ' + err.message, 'error');
                if (respState.stopRequested) {
                    role.status = RESP_LABELS.statusStopped;
                    updateRespRoleStatus(role.key, RESP_LABELS.statusStopped, '');
                    respState.counters.pending--;
                } else {
                    role.status = RESP_LABELS.statusFailed;
                    role.reason = err.message;
                    respState.counters.failed++;
                    respState.counters.pending--;
                    updateRespRoleStatus(role.key, RESP_LABELS.statusFailed, err.message);
                }
                updateRespSummary();
                dismissRoleListDropdown(currentColumnEl).then(function() {
                    roleIndex++;
                    var et = setTimeout(processNextRole, 300);
                    respState.timeouts.push(et);
                });
            });
        }
        processNextRole();
    }

    function resetCleanState() {
        addLogMessage('resetCleanState: resetting state', 'log');
        cleanState.isRunning = false;
        cleanState.stopRequested = false;
        cleanState.observers = [];
        cleanState.timeouts = [];
        cleanState.intervals = [];
        cleanState.eventListeners = [];
        cleanState.idleCallbackIds = [];
        cleanState.prevAriaBusy = null;
        cleanState.parsedItems = null;
        cleanState.outputModel = null;
    }

    function cleanSetAriaBusyOn() {
        addLogMessage('cleanSetAriaBusyOn: setting aria-busy', 'log');
        var target = document.querySelector(CLEAN_ATTRS.ariaBusyTarget);
        if (target) {
            cleanState.prevAriaBusy = target.getAttribute(CLEAN_ATTRS.ariaBusyAttr);
            target.setAttribute(CLEAN_ATTRS.ariaBusyAttr, 'true');
            addLogMessage('cleanSetAriaBusyOn: prev=' + cleanState.prevAriaBusy, 'log');
        }
    }

    function cleanSetAriaBusyOff() {
        addLogMessage('cleanSetAriaBusyOff: restoring aria-busy', 'log');
        var target = document.querySelector(CLEAN_ATTRS.ariaBusyTarget);
        if (target) {
            if (cleanState.prevAriaBusy !== null) {
                target.setAttribute(CLEAN_ATTRS.ariaBusyAttr, cleanState.prevAriaBusy);
            } else {
                target.removeAttribute(CLEAN_ATTRS.ariaBusyAttr);
            }
            cleanState.prevAriaBusy = null;
        }
    }

    function updateCleanAriaLive(message) {
        addLogMessage('updateCleanAriaLive: ' + message, 'log');
        var lr = document.getElementById('clean-aria-live');
        if (lr) {
            lr.textContent = message;
        }
    }

    function normalizeItemText(s) {
        addLogMessage('normalizeItemText: input length=' + s.length, 'log');
        var result = s;
        result = result.replace(CLEAN_REGEX.smartQuotes, '"');
        result = result.replace(CLEAN_REGEX.strayQuotes, '');
        result = result.replace(CLEAN_REGEX.whitespace, ' ');
        result = result.trim();
        addLogMessage('normalizeItemText: output length=' + result.length, 'log');
        return result;
    }

    function replaceSpecialCharactersToComma(s) {
        addLogMessage('replaceSpecialCharactersToComma: input length=' + s.length, 'log');
        var count = 0;
        var result = s.replace(CLEAN_REGEX.specialChars, function() {
            count++;
            return ',';
        });
        result = result.replace(CLEAN_REGEX.duplicateCommas, ',');
        result = result.replace(/,\s*/g, ', ');
        result = result.replace(/\s+/g, ' ');
        result = result.trim();
        addLogMessage('replaceSpecialCharactersToComma: replacements=' + count, 'log');
        return result;
    }

    function replaceStandaloneAndWithAmpersand(s) {
        addLogMessage('replaceStandaloneAndWithAmpersand: input length=' + s.length, 'log');
        var count = 0;
        var result = s.replace(CLEAN_REGEX.standaloneAnd, function() {
            count++;
            return '&';
        });
        addLogMessage('replaceStandaloneAndWithAmpersand: replacements=' + count, 'log');
        return result;
    }

    function splitRawIntoItems(rawText) {
        addLogMessage('splitRawIntoItems: starting split', 'log');
        var items = [];
        var normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        normalized = normalized.replace(CLEAN_REGEX.smartQuotes, '"');
        normalized = normalized.replace(CLEAN_REGEX.strayQuotes, '');
        var pattern = /(?:^|[\s"'])(\d{1,3})([.)])\s+/g;
        var boundaries = [];
        var match;
        while ((match = pattern.exec(normalized)) !== null) {
            var tokenStart = match.index;
            if (match[1] !== undefined && match.index < normalized.length) {
                var prefix = match[0];
                var leadingWhitespace = prefix.length - prefix.trimStart().length;
                tokenStart = match.index + leadingWhitespace;
                if (/["'\s]/.test(normalized[match.index]) && match.index !== 0) {
                    tokenStart = match.index + 1;
                } else if (match.index === 0) {
                    tokenStart = 0;
                }
            }
            boundaries.push({
                index: tokenStart,
                number: match[1],
                separator: match[2],
                fullMatchEnd: match.index + match[0].length
            });
        }
        addLogMessage('splitRawIntoItems: found ' + boundaries.length + ' boundaries', 'log');
        for (var i = 0; i < boundaries.length; i++) {
            var start = boundaries[i].fullMatchEnd;
            var end;
            if (i + 1 < boundaries.length) {
                end = boundaries[i + 1].index;
            } else {
                end = normalized.length;
            }
            var text = normalized.substring(start, end).trim();
            text = text.replace(/\n+/g, ' ');
            text = text.replace(CLEAN_REGEX.whitespace, ' ');
            items.push({
                number: boundaries[i].number,
                separator: boundaries[i].separator,
                rawText: text
            });
        }
        addLogMessage('splitRawIntoItems: extracted ' + items.length + ' items', 'log');
        return items;
    }

    function parseAndCleanResponsibilities(rawText) {
        addLogMessage('parseAndCleanResponsibilities: start', 'log');
        try {
            cleanSetAriaBusyOn();
            updateCleanAriaLive(CLEAN_LABELS.parsing);
            var rawItems = splitRawIntoItems(rawText);
            var results = [];
            var tooLongCount = 0;
            var tooShortCount = 0;
            for (var i = 0; i < rawItems.length; i++) {
                var item = rawItems[i];
                var cleaned = normalizeItemText(item.rawText);
                cleaned = replaceSpecialCharactersToComma(cleaned);
                cleaned = replaceStandaloneAndWithAmpersand(cleaned);
                cleaned = cleaned.trim();
                cleaned = cleaned.replace(CLEAN_REGEX.whitespace, ' ');
                var numberToken = item.number + item.separator;
                var fullText = numberToken + ' ' + cleaned;
                var textLength = cleaned.length;
                var isTooLong = textLength > CLEAN_LIMITS.maxChars;
                var isTooShort = textLength < CLEAN_LIMITS.maxChars;
                if (isTooLong) {
                    tooLongCount++;
                }
                if (isTooShort) {
                    tooShortCount++;
                }
                results.push({
                    numberToken: numberToken,
                    text: cleaned,
                    fullTextWithNumber: fullText,
                    tooLong: isTooLong,
                    tooShort: isTooShort,
                    length: textLength
                });
            }
            addLogMessage('parseAndCleanResponsibilities: parsed ' + results.length + ' items, tooLong=' + tooLongCount + ', tooShort=' + tooShortCount, 'log');
            updateCleanAriaLive(CLEAN_LABELS.done);
            cleanSetAriaBusyOff();
            return {
                items: results,
                summary: {
                    total: results.length,
                    tooLong: tooLongCount,
                    tooShort: tooShortCount
                }
            };
        } catch (e) {
            addLogMessage('parseAndCleanResponsibilities: error: ' + e, 'error');
            cleanSetAriaBusyOff();
            return {
                items: [],
                summary: { total: 0, tooLong: 0, tooShort: 0 }
            };
        }
    }

    function buildOutputModel(items) {
        addLogMessage('buildOutputModel: building model with ' + items.length + ' items', 'log');
        var headerLine = CLEAN_LABELS.responsibilitiesHeader;
        var cleanLines = [];
        var flags = [];
        var tooLongCount = 0;
        var tooShortCount = 0;
        for (var i = 0; i < items.length; i++) {
            cleanLines.push(items[i].text);
            flags.push({
                tooLong: items[i].tooLong,
                tooShort: items[i].tooShort,
                length: items[i].length
            });
            if (items[i].tooLong) {
                tooLongCount++;
            }
            if (items[i].tooShort) {
                tooShortCount++;
            }
        }
        addLogMessage('buildOutputModel: tooLong=' + tooLongCount + ', tooShort=' + tooShortCount, 'log');
        return {
            headerLine: headerLine,
            cleanLines: cleanLines,
            flags: flags,
            copyText: headerLine + '\n' + cleanLines.join('\n'),
            tooLongCount: tooLongCount,
            tooShortCount: tooShortCount
        };
    }

    function exportResponsibilitiesToXlsxOrCsv(model) {
        addLogMessage('exportResponsibilitiesToXlsxOrCsv: starting export', 'log');
        try {
            if (typeof window.XLSX !== 'undefined' && window.XLSX) {
                addLogMessage('exportResponsibilitiesToXlsxOrCsv: using XLSX library', 'log');
                var wsData = [[model.headerLine]];
                for (var i = 0; i < model.cleanLines.length; i++) {
                    wsData.push([model.cleanLines[i]]);
                }
                var wb = window.XLSX.utils.book_new();
                var ws = window.XLSX.utils.aoa_to_sheet(wsData);
                window.XLSX.utils.book_append_sheet(wb, ws, 'Responsibilities');
                var timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                var filename = 'Responsibilities_' + timestamp + '.xlsx';
                window.XLSX.writeFile(wb, filename);
                addLogMessage('exportResponsibilitiesToXlsxOrCsv: xlsx exported as ' + filename, 'log');
                updateCleanAriaLive(CLEAN_LABELS.exportSuccess);
                return true;
            } else {
                addLogMessage('exportResponsibilitiesToXlsxOrCsv: XLSX not available, falling back to CSV', 'log');
                var csvRows = [];
                csvRows.push('"' + model.headerLine.replace(/"/g, '""') + '"');
                for (var j = 0; j < model.cleanLines.length; j++) {
                    csvRows.push('"' + model.cleanLines[j].replace(/"/g, '""') + '"');
                }
                var csvContent = csvRows.join('\r\n');
                var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                var url = URL.createObjectURL(blob);
                var timestamp2 = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                var filename2 = 'Responsibilities_' + timestamp2 + '.csv';
                var link = document.createElement('a');
                link.href = url;
                link.download = filename2;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                addLogMessage('exportResponsibilitiesToXlsxOrCsv: csv exported as ' + filename2, 'log');
                updateCleanAriaLive(CLEAN_LABELS.exportSuccess);
                return true;
            }
        } catch (e) {
            addLogMessage('exportResponsibilitiesToXlsxOrCsv: export failed: ' + e, 'error');
            updateCleanAriaLive(CLEAN_LABELS.exportFailed);
            return false;
        }
    }

    function showCleanInputPanel() {
        addLogMessage('showCleanInputPanel: creating input panel', 'log');
        var modal = document.createElement('div');
        modal.id = 'clean-input-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 550px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'clean-input-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        var title = document.createElement('h3');
        title.id = 'clean-input-title';
        title.textContent = CLEAN_LABELS.inputTitle;
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600; letter-spacing: 0.2px;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close input panel');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showCleanInputPanel: closed by user', 'log');
            stopCleanResponsibility();
        };
        header.appendChild(title);
        header.appendChild(closeButton);
        var description = document.createElement('p');
        description.textContent = 'Paste the raw responsibility list below. Items should start with a number followed by . or ) and text.';
        description.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;';
        var textareaLabel = document.createElement('label');
        textareaLabel.setAttribute('for', 'clean-input-textarea');
        textareaLabel.textContent = 'Responsibilities text';
        textareaLabel.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        var textarea = document.createElement('textarea');
        textarea.id = 'clean-input-textarea';
        textarea.placeholder = '1. First responsibility\n2. Second responsibility\n3. Third responsibility';
        textarea.style.cssText = 'width: 100%; height: 200px; padding: 12px 14px; border: 2px solid rgba(255, 255, 255, 0.35); border-radius: 10px; background: rgba(255, 255, 255, 0.95); color: #1e293b; font-size: 14px; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; resize: vertical; outline: none; transition: all 0.25s ease; box-shadow: 0 2px 0 rgba(0,0,0,0.04) inset; box-sizing: border-box;';
        textarea.onfocus = function() {
            textarea.style.borderColor = '#8ea0ff';
            textarea.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.25)';
        };
        textarea.onblur = function() {
            textarea.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            textarea.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04) inset';
        };
        var confirmButton = document.createElement('button');
        confirmButton.textContent = CLEAN_LABELS.confirm;
        confirmButton.disabled = true;
        confirmButton.setAttribute('aria-label', 'Confirm and parse responsibilities');
        confirmButton.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; transition: all 0.25s ease; opacity: 0.5;';
        var updateConfirmState = function() {
            var hasInput = textarea.value.trim().length > 0;
            confirmButton.disabled = !hasInput;
            if (hasInput) {
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
            } else {
                confirmButton.style.opacity = '0.5';
                confirmButton.style.cursor = 'not-allowed';
            }
        };
        textarea.addEventListener('input', updateConfirmState);
        cleanState.eventListeners.push({ element: textarea, type: 'input', handler: updateConfirmState });
        confirmButton.onmouseover = function() {
            if (!confirmButton.disabled) {
                confirmButton.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)';
            }
        };
        confirmButton.onmouseout = function() {
            confirmButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        };
        confirmButton.onclick = function() {
            if (confirmButton.disabled) {
                return;
            }
            addLogMessage('showCleanInputPanel: Confirm clicked', 'log');
            var rawText = textarea.value;
            if (!rawText || !rawText.trim()) {
                addLogMessage('showCleanInputPanel: empty input after confirm', 'warn');
                return;
            }
            var parseResult = parseAndCleanResponsibilities(rawText);
            if (parseResult.items.length === 0) {
                addLogMessage('showCleanInputPanel: no items parsed, showing notice', 'warn');
                var notice = document.createElement('div');
                notice.textContent = 'No numbered items found. Ensure items start with a number followed by . or ) and text.';
                notice.style.cssText = 'color: #ffd93d; font-size: 13px; margin-top: 8px; padding: 8px; background: rgba(255, 217, 61, 0.15); border-radius: 6px;';
                notice.setAttribute('role', 'alert');
                var existingNotice = container.querySelector('[role="alert"]');
                if (existingNotice) {
                    container.removeChild(existingNotice);
                }
                container.appendChild(notice);
                return;
            }
            cleanState.parsedItems = parseResult;
            var outputModel = buildOutputModel(parseResult.items);
            cleanState.outputModel = outputModel;
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            showCleanResultsPanel(outputModel);
        };
        var clearButton = document.createElement('button');
        clearButton.textContent = CLEAN_LABELS.clear;
        clearButton.setAttribute('aria-label', 'Clear all input');
        clearButton.style.cssText = 'background: rgba(255, 255, 255, 0.18); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.25s ease; backdrop-filter: blur(2px);';
        clearButton.onmouseover = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.28)';
        };
        clearButton.onmouseout = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.18)';
        };
        clearButton.onclick = function() {
            addLogMessage('showCleanInputPanel: Clear All clicked', 'log');
            textarea.value = '';
            cleanState.parsedItems = null;
            cleanState.outputModel = null;
            updateConfirmState();
            textarea.focus();
        };
        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;';
        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(confirmButton);
        var ariaLiveRegion = document.createElement('div');
        ariaLiveRegion.id = 'clean-aria-live';
        ariaLiveRegion.setAttribute('aria-live', 'polite');
        ariaLiveRegion.setAttribute('aria-atomic', 'true');
        ariaLiveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        container.appendChild(header);
        container.appendChild(description);
        container.appendChild(textareaLabel);
        container.appendChild(textarea);
        container.appendChild(buttonContainer);
        container.appendChild(ariaLiveRegion);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        textarea.focus();
        addLogMessage('showCleanInputPanel: panel displayed', 'log');
        var escHandler = function(e) {
            if (e.key === 'Escape') {
                addLogMessage('showCleanInputPanel: Escape pressed', 'log');
                stopCleanResponsibility();
            }
        };
        document.addEventListener('keydown', escHandler);
        cleanState.eventListeners.push({ element: document, type: 'keydown', handler: escHandler });
    }

    function showCleanResultsPanel(model) {
        addLogMessage('showCleanResultsPanel: creating results panel', 'log');
        var modal = document.createElement('div');
        modal.id = 'clean-results-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 650px; max-width: 90%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'clean-results-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0;';
        var title = document.createElement('h3');
        title.id = 'clean-results-title';
        title.textContent = CLEAN_LABELS.resultsTitle;
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600; letter-spacing: 0.2px;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close results panel');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showCleanResultsPanel: closed by user', 'log');
            stopCleanResponsibility();
        };
        header.appendChild(title);
        header.appendChild(closeButton);
        var summaryBar = document.createElement('div');
        summaryBar.style.cssText = 'display: flex; gap: 12px; margin-bottom: 12px; flex-shrink: 0; flex-wrap: wrap;';
        var totalBadge = document.createElement('span');
        totalBadge.textContent = 'Total: ' + model.cleanLines.length;
        totalBadge.style.cssText = 'background: rgba(255, 255, 255, 0.15); color: white; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
        summaryBar.appendChild(totalBadge);
        if (model.tooLongCount > 0) {
            var longBadge = document.createElement('span');
            longBadge.textContent = 'Over ' + CLEAN_LIMITS.maxChars + ' chars: ' + model.tooLongCount;
            longBadge.style.cssText = 'background: rgba(255, 107, 107, 0.25); color: #ff6b6b; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
            summaryBar.appendChild(longBadge);
        }
        if (model.tooShortCount > 0) {
            var shortBadge = document.createElement('span');
            shortBadge.textContent = 'Under ' + CLEAN_LIMITS.maxChars + ' chars: ' + model.tooShortCount;
            shortBadge.style.cssText = 'background: rgba(107, 207, 127, 0.25); color: #6bcf7f; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
            summaryBar.appendChild(shortBadge);
        }
        var outputScrollStyle = document.createElement('style');
        outputScrollStyle.textContent = '.clean-results-output::-webkit-scrollbar { width: 6px; } .clean-results-output::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); border-radius: 3px; } .clean-results-output::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 3px; } .clean-results-output::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); } .clean-results-warning-icon { user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; pointer-events: auto; }';
        document.head.appendChild(outputScrollStyle);
        var outputArea = document.createElement('div');
        outputArea.style.cssText = 'background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 12px; overflow-y: auto; flex: 1; min-height: 100px; max-height: 400px;';
        outputArea.className = 'clean-results-output';
        var copyBlock = document.createElement('div');
        copyBlock.id = 'clean-copy-block';
        var headerLine = document.createElement('div');
        headerLine.textContent = model.headerLine;
        headerLine.style.cssText = 'color: white; font-size: 15px; font-weight: 700; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);';
        copyBlock.appendChild(headerLine);
        for (var i = 0; i < model.cleanLines.length; i++) {
            var row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: flex-start; gap: 6px; padding: 4px 0; color: white; font-size: 14px; line-height: 1.5;';
            var textSpan = document.createElement('span');
            textSpan.textContent = model.cleanLines[i];
            textSpan.style.cssText = 'flex: 1; word-break: break-word;';
            row.appendChild(textSpan);
            if (model.flags[i].tooLong) {
                var warnIcon = document.createElement('span');
                warnIcon.className = 'clean-results-warning-icon';
                warnIcon.textContent = '\u26A0';
                warnIcon.setAttribute('aria-hidden', 'true');
                warnIcon.setAttribute('title', 'Exceeds ' + CLEAN_LIMITS.maxChars + ' character limit. Length: ' + model.flags[i].length);
                warnIcon.style.cssText = 'color: #ffd93d; font-size: 14px; flex-shrink: 0; cursor: help; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;';
                row.appendChild(warnIcon);
            }
            outputArea.appendChild(row);
        }
        var hasXlsx = typeof window.XLSX !== 'undefined' && window.XLSX;
        var downloadButton = document.createElement('button');
        downloadButton.textContent = hasXlsx ? CLEAN_LABELS.downloadXlsx : CLEAN_LABELS.downloadCsv;
        downloadButton.setAttribute('aria-label', hasXlsx ? 'Download as Excel file' : 'Download as CSV file');
        downloadButton.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; transition: all 0.25s ease; flex: 1;';
        downloadButton.onmouseover = function() {
            downloadButton.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)';
        };
        downloadButton.onmouseout = function() {
            downloadButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        };
        downloadButton.onclick = function() {
            addLogMessage('showCleanResultsPanel: Download clicked', 'log');
            var success = exportResponsibilitiesToXlsxOrCsv(model);
            if (success) {
                addLogMessage('showCleanResultsPanel: export succeeded', 'log');
            } else {
                addLogMessage('showCleanResultsPanel: export failed', 'error');
                var exportNotice = document.createElement('div');
                exportNotice.textContent = CLEAN_LABELS.exportFailed;
                exportNotice.style.cssText = 'color: #ff6b6b; font-size: 13px; margin-top: 8px; padding: 8px; background: rgba(255, 107, 107, 0.15); border-radius: 6px;';
                exportNotice.setAttribute('role', 'alert');
                var existingNotice = container.querySelector('[role="alert"]');
                if (existingNotice) {
                    container.removeChild(existingNotice);
                }
                container.appendChild(exportNotice);
            }
        };
        var closeBtn = document.createElement('button');
        closeBtn.textContent = CLEAN_LABELS.close;
        closeBtn.setAttribute('aria-label', 'Close results');
        closeBtn.style.cssText = 'background: rgba(255, 255, 255, 0.18); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.25s ease; backdrop-filter: blur(2px); flex: 1;';
        closeBtn.onmouseover = function() {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.28)';
        };
        closeBtn.onmouseout = function() {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.18)';
        };
        closeBtn.onclick = function() {
            addLogMessage('showCleanResultsPanel: Close clicked', 'log');
            stopCleanResponsibility();
        };
        var bottomButtons = document.createElement('div');
        bottomButtons.style.cssText = 'display: flex; gap: 12px; margin-top: 16px; flex-shrink: 0;';
        bottomButtons.appendChild(downloadButton);
        bottomButtons.appendChild(closeBtn);
        var ariaLiveRegion = document.createElement('div');
        ariaLiveRegion.id = 'clean-aria-live';
        ariaLiveRegion.setAttribute('aria-live', 'polite');
        ariaLiveRegion.setAttribute('aria-atomic', 'true');
        ariaLiveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        container.appendChild(header);
        container.appendChild(summaryBar);
        container.appendChild(outputArea);
        container.appendChild(bottomButtons);
        container.appendChild(ariaLiveRegion);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        downloadButton.focus();
        addLogMessage('showCleanResultsPanel: panel displayed with ' + model.cleanLines.length + ' items', 'log');
        var escHandler = function(e) {
            if (e.key === 'Escape') {
                addLogMessage('showCleanResultsPanel: Escape pressed', 'log');
                stopCleanResponsibility();
            }
        };
        document.addEventListener('keydown', escHandler);
        cleanState.eventListeners.push({ element: document, type: 'keydown', handler: escHandler });
    }

    function cleanResponsibilityInit() {
        addLogMessage('cleanResponsibilityInit: starting feature', 'log');
        cleanState.focusReturnElement = document.getElementById('clean-resp-btn');
        resetCleanState();
        cleanState.isRunning = true;
        showCleanInputPanel();
    }

    function stopCleanResponsibility() {
        addLogMessage('stopCleanResponsibility: stopping', 'log');
        cleanState.stopRequested = true;
        cleanState.isRunning = false;
        for (var i = 0; i < cleanState.idleCallbackIds.length; i++) {
            try {
                if (typeof cancelIdleCallback === 'function') {
                    cancelIdleCallback(cleanState.idleCallbackIds[i]);
                }
            } catch (e) {
                addLogMessage('stopCleanResponsibility: error canceling idle callback: ' + e, 'error');
            }
        }
        cleanState.idleCallbackIds = [];
        for (var i2 = 0; i2 < cleanState.observers.length; i2++) {
            try {
                cleanState.observers[i2].disconnect();
            } catch (e2) {
                addLogMessage('stopCleanResponsibility: error disconnecting observer: ' + e2, 'error');
            }
        }
        cleanState.observers = [];
        for (var i3 = 0; i3 < cleanState.timeouts.length; i3++) {
            try {
                clearTimeout(cleanState.timeouts[i3]);
            } catch (e3) {
                addLogMessage('stopCleanResponsibility: error clearing timeout: ' + e3, 'error');
            }
        }
        cleanState.timeouts = [];
        for (var i4 = 0; i4 < cleanState.intervals.length; i4++) {
            try {
                clearInterval(cleanState.intervals[i4]);
            } catch (e4) {
                addLogMessage('stopCleanResponsibility: error clearing interval: ' + e4, 'error');
            }
        }
        cleanState.intervals = [];
        for (var i5 = 0; i5 < cleanState.eventListeners.length; i5++) {
            try {
                var l = cleanState.eventListeners[i5];
                l.element.removeEventListener(l.type, l.handler);
            } catch (e5) {
                addLogMessage('stopCleanResponsibility: error removing listener: ' + e5, 'error');
            }
        }
        cleanState.eventListeners = [];
        cleanSetAriaBusyOff();
        var im = document.getElementById('clean-input-modal');
        if (im && im.parentNode) {
            im.parentNode.removeChild(im);
        }
        var rm = document.getElementById('clean-results-modal');
        if (rm && rm.parentNode) {
            rm.parentNode.removeChild(rm);
        }
        if (cleanState.focusReturnElement) {
            cleanState.focusReturnElement.focus();
        }
        updateCleanAriaLive('Clean Responsibility stopped');
        resetCleanState();
        addLogMessage('stopCleanResponsibility: cleanup complete', 'log');
    }

    function resetDoAState() {
        addLogMessage('resetDoAState: resetting state', 'log');
        doaState.isRunning = false;
        doaState.observers = [];
        doaState.timeouts = [];
        doaState.intervals = [];
        doaState.eventListeners = [];
        doaState.idleCallbackIds = [];
        doaState.parsedCandidates = [];
        doaState.scannedNames = [];
        doaState.seenNormalizedNames = new Set();
        doaState.prevAriaBusy = null;
        doaState.scrollContainer = null;
        doaState.prevScrollTop = 0;
        doaState.userScrollHandler = null;
        doaState.userScrollPaused = false;
        doaState.idleCallbackId = null;
        doaState.leftPanelRowIndex = 0;
        doaState.lastAutoScrollTime = 0;
        doaState.addQueue = [];
        doaState.addQueueIndex = 0;
        doaState.existingPairs = new Set();
        doaState.counters = { total: 0, added: 0, duplicates: 0, failures: 0, pending: 0 };
        doaState.listScrollTop = 0;
        doaState.roleListScrollTop = 0;
        doaState.isAddingEntries = false;
        doaState.isPaused = false;
        doaState.activeDropdown = null;
    }

    function doaSetAriaBusyOn() {
        addLogMessage('doaSetAriaBusyOn: setting aria-busy', 'log');
        var target = document.querySelector(ELOG_ATTRS.ariaBusyTarget);
        if (target) {
            doaState.prevAriaBusy = target.getAttribute(ELOG_ATTRS.ariaBusyAttr);
            target.setAttribute(ELOG_ATTRS.ariaBusyAttr, 'true');
            addLogMessage('doaSetAriaBusyOn: prev=' + doaState.prevAriaBusy, 'log');
        }
    }

    function doaSetAriaBusyOff() {
        addLogMessage('doaSetAriaBusyOff: restoring aria-busy', 'log');
        var target = document.querySelector(ELOG_ATTRS.ariaBusyTarget);
        if (target) {
            if (doaState.prevAriaBusy !== null) {
                target.setAttribute(ELOG_ATTRS.ariaBusyAttr, doaState.prevAriaBusy);
            } else {
                target.removeAttribute(ELOG_ATTRS.ariaBusyAttr);
            }
            doaState.prevAriaBusy = null;
        }
    }

    function doaWaitForElement(selector, timeout) {
        addLogMessage('doaWaitForElement: waiting for ' + selector, 'log');
        return new Promise(function(resolve, reject) {
            var element = document.querySelector(selector);
            if (element) {
                addLogMessage('doaWaitForElement: found immediately', 'log');
                resolve(element);
                return;
            }
            var observer = new MutationObserver(function(mutations, obs) {
                var el = document.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    var idx = doaState.observers.indexOf(obs);
                    if (idx > -1) {
                        doaState.observers.splice(idx, 1);
                    }
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            doaState.observers.push(observer);
            var timeoutId = setTimeout(function() {
                observer.disconnect();
                var idx = doaState.observers.indexOf(observer);
                if (idx > -1) {
                    doaState.observers.splice(idx, 1);
                }
                addLogMessage('doaWaitForElement: timeout for ' + selector, 'warn');
                reject(new Error('Timeout waiting for ' + selector));
            }, timeout);
            doaState.timeouts.push(timeoutId);
        });
    }

    function doaDelay(ms) {
        return new Promise(function(resolve) {
            var tid = setTimeout(resolve, ms);
            doaState.timeouts.push(tid);
        });
    }

    function updateDoAAriaLive(message) {
        addLogMessage('updateDoAAriaLive: ' + message, 'log');
        var liveRegion = document.getElementById('doa-aria-live');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    function expandResponsibilityTokensToSet(tokens) {
        addLogMessage('expandResponsibilityTokensToSet: tokens count=' + tokens.length, 'log');
        var result = new Set();
        var i = 0;
        while (i < tokens.length) {
            var current = tokens[i];
            if (i + 2 < tokens.length && /^(to)$/i.test(tokens[i + 1])) {
                var start = parseInt(current, 10);
                var end = parseInt(tokens[i + 2], 10);
                if (!isNaN(start) && !isNaN(end)) {
                    var lo = Math.min(start, end);
                    var hi = Math.max(start, end);
                    for (var n = lo; n <= hi; n++) {
                        result.add(n);
                    }
                    i += 3;
                    continue;
                }
            }
            if (i + 1 < tokens.length) {
                var dashMatch = (current + tokens[i + 1]).match(/^(\d+)[\-\u2013\u2014](\d+)$/);
                if (dashMatch) {
                    var dStart = parseInt(dashMatch[1], 10);
                    var dEnd = parseInt(dashMatch[2], 10);
                    if (!isNaN(dStart) && !isNaN(dEnd)) {
                        var dLo = Math.min(dStart, dEnd);
                        var dHi = Math.max(dStart, dEnd);
                        for (var dn = dLo; dn <= dHi; dn++) {
                            result.add(dn);
                        }
                        i += 2;
                        continue;
                    }
                }
            }
            var singleDash = current.match(/^(\d+)[\-\u2013\u2014](\d+)$/);
            if (singleDash) {
                var sdStart = parseInt(singleDash[1], 10);
                var sdEnd = parseInt(singleDash[2], 10);
                if (!isNaN(sdStart) && !isNaN(sdEnd)) {
                    var sdLo = Math.min(sdStart, sdEnd);
                    var sdHi = Math.max(sdStart, sdEnd);
                    for (var sdn = sdLo; sdn <= sdHi; sdn++) {
                        result.add(sdn);
                    }
                    i++;
                    continue;
                }
            }
            var num = parseInt(current, 10);
            if (!isNaN(num)) {
                result.add(num);
            }
            i++;
        }
        addLogMessage('expandResponsibilityTokensToSet: result size=' + result.size, 'log');
        return result;
    }

    function parseDoAEntriesInput(rawText) {
        addLogMessage('parseDoAEntriesInput: starting parse', 'log');
        if (!rawText || !rawText.trim()) {
            addLogMessage('parseDoAEntriesInput: empty input', 'warn');
            return [];
        }
        var text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        text = text.replace(/[\u201c\u201d\u201e\u201f\u2018\u2019]+/g, '"');
        text = text.replace(/-\s*\n\s*/g, '-');
        var rawLines = text.split('\n');
        var mergedLines = [];
        var pendingQuote = false;
        var buffer = '';
        for (var li = 0; li < rawLines.length; li++) {
            var line = rawLines[li];
            if (pendingQuote) {
                buffer = buffer + ' ' + line;
                var quoteCount = 0;
                for (var ci = 0; ci < buffer.length; ci++) {
                    if (buffer[ci] === '"') {
                        quoteCount++;
                    }
                }
                if (quoteCount % 2 === 0) {
                    pendingQuote = false;
                    mergedLines.push(buffer);
                    buffer = '';
                }
                continue;
            }
            var qc = 0;
            for (var ci2 = 0; ci2 < line.length; ci2++) {
                if (line[ci2] === '"') {
                    qc++;
                }
            }
            if (qc % 2 !== 0) {
                pendingQuote = true;
                buffer = line;
                continue;
            }
            mergedLines.push(line);
        }
        if (buffer) {
            mergedLines.push(buffer);
        }
        addLogMessage('parseDoAEntriesInput: merged into ' + mergedLines.length + ' lines', 'log');
        var results = [];
        var seenPairKeys = new Set();
        for (var mi = 0; mi < mergedLines.length; mi++) {
            var mline = mergedLines[mi].trim();
            if (!mline) {
                continue;
            }
            mline = mline.replace(/"+/g, '');
            var parts = mline.split(/\t+/);
            if (parts.length < 2) {
                addLogMessage('parseDoAEntriesInput: line ' + mi + ' too few columns, skip', 'log');
                continue;
            }
            var emailIdx = -1;
            for (var pi = 0; pi < parts.length; pi++) {
                if (parts[pi].indexOf('@') !== -1) {
                    emailIdx = pi;
                    break;
                }
            }
            if (emailIdx === -1 || emailIdx + 1 >= parts.length) {
                addLogMessage('parseDoAEntriesInput: line ' + mi + ' no email column or no role after email, skip', 'log');
                continue;
            }
            var namePart = parts[0].trim();
            if (!namePart) {
                addLogMessage('parseDoAEntriesInput: line ' + mi + ' empty name, skip', 'log');
                continue;
            }
            var rolePart = parts[emailIdx + 1].trim();
            if (!rolePart) {
                addLogMessage('parseDoAEntriesInput: line ' + mi + ' empty role, skip', 'log');
                continue;
            }
            var numberPart = parts.slice(emailIdx + 2).join(' ');
            var numTokens = numberPart.replace(/,/g, ' ').split(/\s+/).filter(function(t) {
                return t.length > 0;
            });
            var numbersSet = expandResponsibilityTokensToSet(numTokens);
            if (numbersSet.size === 0) {
                addLogMessage('parseDoAEntriesInput: line ' + mi + ' no numbers for ' + namePart + ', skip', 'log');
                continue;
            }
            var displayName = namePart.replace(/\s+/g, ' ').trim();
            var nameTokens = displayName.split(' ');
            var normalizedDisplay = [];
            for (var nt = 0; nt < nameTokens.length; nt++) {
                var token = nameTokens[nt];
                if (token) {
                    normalizedDisplay.push(token.charAt(0).toUpperCase() + token.slice(1).toLowerCase());
                }
            }
            displayName = normalizedDisplay.join(' ');
            var normalized = elogNormalizeName(displayName);
            var pairKey = normalizeFirstLastPair(displayName);
            var roleNorm = normalizeRoleName(rolePart);
            if (!roleNorm.key) {
                addLogMessage('parseDoAEntriesInput: line ' + mi + ' role normalize failed for ' + rolePart + ', skip', 'log');
                continue;
            }
            var sortedNums = Array.from(numbersSet).sort(function(a, b) {
                return a - b;
            });
            addLogMessage('parseDoAEntriesInput: line ' + mi + ' name=' + displayName + ' role=' + roleNorm.display + ' nums=[' + sortedNums.join(',') + ']', 'log');
            results.push({
                display: displayName,
                normalized: normalized,
                pairKey: pairKey,
                roleDisplay: roleNorm.display,
                roleKey: roleNorm.key,
                numbersSet: numbersSet
            });
        }
        addLogMessage('parseDoAEntriesInput: parsed ' + results.length + ' candidates', 'log');
        return results;
    }

    function buildDoAQueueSorted(parsedCandidates) {
        addLogMessage('buildDoAQueueSorted: building from ' + parsedCandidates.length + ' candidates', 'log');
        var seenPairKeys = new Set();
        var unique = [];
        var duplicateIndices = [];
        for (var i = 0; i < parsedCandidates.length; i++) {
            var candidate = parsedCandidates[i];
            if (seenPairKeys.has(candidate.pairKey)) {
                addLogMessage('buildDoAQueueSorted: input duplicate pairKey=' + candidate.pairKey + ' display=' + candidate.display, 'log');
                duplicateIndices.push(i);
                continue;
            }
            seenPairKeys.add(candidate.pairKey);
            var doaCandidates = buildCandidatePairKeys(candidate.display);
            unique.push({
                display: candidate.display,
                normalized: candidate.normalized,
                pairKey: candidate.pairKey,
                candidatePairKeys: doaCandidates.pairKeys,
                roleDisplay: candidate.roleDisplay,
                roleKey: candidate.roleKey,
                numbersSet: candidate.numbersSet,
                status: DOA_LABELS.statusPending
            });
        }
        addLogMessage('buildDoAQueueSorted: unique=' + unique.length + ' duplicates=' + duplicateIndices.length, 'log');
        return { queue: unique, duplicateIndices: duplicateIndices };
    }

    function showDoAInputPanel() {
        addLogMessage('showDoAInputPanel: creating input panel', 'log');
        var modal = document.createElement('div');
        modal.id = 'doa-input-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 600px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'doa-input-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
        var title = document.createElement('h3');
        title.id = 'doa-input-title';
        title.textContent = DOA_LABELS.featureButton;
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600; letter-spacing: 0.2px;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close panel');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showDoAInputPanel: closed by user', 'warn');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopDoA();
            if (doaState.focusReturnElement) {
                doaState.focusReturnElement.focus();
            }
        };
        header.appendChild(title);
        header.appendChild(closeButton);
        var description = document.createElement('p');
        description.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;';
        description.append("Rules:");
        description.appendChild(document.createElement('br'));
        var lines = [
            'Paste the DoA staff table below. Each row should contain name, role, and responsibility numbers (tab-separated).',
            'After clicking Confirm, do not click anywhere else on the page, as this will impact the process.'
        ];

        for (var i = 0; i < lines.length; i++) {
            description.appendChild(document.createTextNode('• ' + lines[i]));
            if (i < lines.length - 1) {
                description.appendChild(document.createElement('br'));
            }
        }
        var textarea = document.createElement('textarea');
        textarea.id = 'doa-entries-input';
        textarea.placeholder = 'Paste tab-separated staff table here...\nExample:\nPETER WINKLE\tPW\tMD\tp.winkle@cenexel.com\tPrincipal Investigator\tPI\t1 to 8\t13\t14';
        textarea.setAttribute('aria-label', 'DoA staff entries input');
        textarea.style.cssText = 'width: 100%; height: 200px; padding: 12px 14px; border: 2px solid rgba(255, 255, 255, 0.35); border-radius: 10px; background: rgba(255, 255, 255, 0.95); color: #1e293b; font-size: 13px; font-family: Consolas, monospace, Segoe UI, Tahoma, Geneva, Verdana, sans-serif; resize: vertical; outline: none; transition: all 0.25s ease; box-shadow: 0 2px 0 rgba(0,0,0,0.04) inset; box-sizing: border-box;';
        textarea.onfocus = function() {
            textarea.style.borderColor = '#8ea0ff';
            textarea.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.25)';
        };
        textarea.onblur = function() {
            textarea.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            textarea.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04) inset';
        };
        var confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm';
        confirmButton.disabled = true;
        confirmButton.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; transition: all 0.25s ease; opacity: 0.5;';
        var updateConfirmState = function() {
            var parsed = parseDoAEntriesInput(textarea.value);
            if (parsed.length > 0) {
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
            } else {
                confirmButton.disabled = true;
                confirmButton.style.opacity = '0.5';
                confirmButton.style.cursor = 'not-allowed';
            }
        };
        textarea.oninput = updateConfirmState;
        confirmButton.onmouseover = function() {
            if (!confirmButton.disabled) {
                confirmButton.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)';
            }
        };
        confirmButton.onmouseout = function() {
            confirmButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        };
        confirmButton.onclick = function() {
            addLogMessage('showDoAInputPanel: Confirm clicked', 'log');
            var parsed = parseDoAEntriesInput(textarea.value);
            if (parsed.length === 0) {
                addLogMessage('showDoAInputPanel: no valid entries parsed', 'warn');
                return;
            }
            doaState.parsedCandidates = parsed;
            addLogMessage('showDoAInputPanel: parsed ' + parsed.length + ' candidates', 'log');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            doaState.isRunning = true;
            showCollectingDataPanel('doa', DOA_LABELS.featureButton);
            startDoAScan();
        };
        var clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All';
        clearButton.style.cssText = 'background: rgba(255, 255, 255, 0.18); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.25s ease; backdrop-filter: blur(2px);';
        clearButton.onmouseover = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.28)';
        };
        clearButton.onmouseout = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.18)';
        };
        clearButton.onclick = function() {
            addLogMessage('showDoAInputPanel: Clear All clicked', 'log');
            textarea.value = '';
            doaState.parsedCandidates = [];
            confirmButton.disabled = true;
            confirmButton.style.opacity = '0.5';
            confirmButton.style.cursor = 'not-allowed';
        };
        var keyHandler = function(e) {
            if (e.key === 'Escape') {
                addLogMessage('showDoAInputPanel: Escape pressed', 'log');
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
                stopDoA();
                if (doaState.focusReturnElement) {
                    doaState.focusReturnElement.focus();
                }
            }
        };
        document.addEventListener('keydown', keyHandler);
        doaState.eventListeners.push({ element: document, type: 'keydown', handler: keyHandler });
        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;';
        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(confirmButton);
        container.appendChild(header);
        container.appendChild(description);
        container.appendChild(textarea);
        container.appendChild(buttonContainer);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        textarea.focus();
        addLogMessage('showDoAInputPanel: input panel displayed', 'log');
    }

    function initializeDoARightPanel() {
        addLogMessage('initializeDoARightPanel: initializing with parsed candidates', 'log');
        var rightPanel = document.getElementById('doa-right-panel');
        if (!rightPanel) {
            addLogMessage('initializeDoARightPanel: right panel not found', 'error');
            return;
        }
        rightPanel.innerHTML = '';
        for (var i = 0; i < doaState.parsedCandidates.length; i++) {
            var candidate = doaState.parsedCandidates[i];
            var numsArr = Array.from(candidate.numbersSet).sort(function(a, b) {
                return a - b;
            });
            var labelText = candidate.display + ' | ' + candidate.roleDisplay + ' | [' + numsArr.join(', ') + ']';
            var item = createListItem(labelText, DOA_LABELS.statusPending, 'pending', i + 1);
            item.setAttribute('data-pairkey', candidate.pairKey);
            item.setAttribute('data-input-order', String(i + 1));
            item.setAttribute('data-sort-name', candidate.display);
            rightPanel.appendChild(item);
        }
        addLogMessage('initializeDoARightPanel: added ' + doaState.parsedCandidates.length + ' items', 'log');
    }

    function updateDoARightPanelStatus(pairKey, newStatus) {
        addLogMessage('updateDoARightPanelStatus: pairKey=' + pairKey + ' status=' + newStatus, 'log');
        var rightPanel = document.getElementById('doa-right-panel');
        if (!rightPanel) {
            addLogMessage('updateDoARightPanelStatus: right panel not found', 'error');
            return;
        }
        var items = rightPanel.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.getAttribute('data-pairkey') === pairKey) {
                var badge = item.querySelector('.elog-status-badge');
                if (badge) {
                    badge.textContent = newStatus;
                    var badgeColor = 'rgba(255, 255, 255, 0.7)';
                    var badgeBg = 'rgba(255, 255, 255, 0.1)';
                    if (newStatus === DOA_LABELS.statusAdded) {
                        badgeColor = '#6bcf7f';
                        badgeBg = 'rgba(107, 207, 127, 0.2)';
                    } else if (newStatus === DOA_LABELS.statusAlready) {
                        badgeColor = '#ffa500';
                        badgeBg = 'rgba(255, 165, 0, 0.2)';
                    } else if (newStatus === DOA_LABELS.statusDuplicate) {
                        badgeColor = '#ffa500';
                        badgeBg = 'rgba(255, 165, 0, 0.2)';
                    } else if (newStatus === DOA_LABELS.statusNotInDropdown || newStatus === DOA_LABELS.statusSelectionFailed || newStatus === DOA_LABELS.statusSaveFailed || newStatus === DOA_LABELS.statusRoleNotFound) {
                        badgeColor = '#ff6b6b';
                        badgeBg = 'rgba(255, 107, 107, 0.2)';
                    } else if (newStatus === DOA_LABELS.statusTasksApplied) {
                        badgeColor = '#6bcf7f';
                        badgeBg = 'rgba(107, 207, 127, 0.2)';
                    } else if (newStatus === DOA_LABELS.statusStopped) {
                        badgeColor = '#aaa';
                        badgeBg = 'rgba(170, 170, 170, 0.2)';
                    } else if (newStatus === DOA_LABELS.statusPending) {
                        badgeColor = '#ffd93d';
                        badgeBg = 'rgba(255, 217, 61, 0.2)';
                    }
                    badge.style.color = badgeColor;
                    badge.style.background = badgeBg;
                }
                break;
            }
        }
    }

    function updateDoARightPanelSummary(counters) {
        addLogMessage('updateDoARightPanelSummary: total=' + counters.total + ' added=' + counters.added + ' dup=' + counters.duplicates + ' fail=' + counters.failures + ' pending=' + counters.pending, 'log');
        var totalEl = document.getElementById('doa-summary-total');
        var addedEl = document.getElementById('doa-summary-added');
        var dupEl = document.getElementById('doa-summary-duplicates');
        var failEl = document.getElementById('doa-summary-failures');
        var pendingEl = document.getElementById('doa-summary-pending');
        var percentEl = document.getElementById('doa-summary-percent');
        if (totalEl) {
            totalEl.textContent = String(counters.total);
        }
        if (addedEl) {
            addedEl.textContent = String(counters.added);
        }
        if (dupEl) {
            dupEl.textContent = String(counters.duplicates);
        }
        if (failEl) {
            failEl.textContent = String(counters.failures);
        }
        if (pendingEl) {
            pendingEl.textContent = String(counters.pending);
        }
        if (percentEl) {
            var processed = counters.total - counters.pending;
            var pct = counters.total > 0 ? Math.round((processed / counters.total) * 100) : 0;
            percentEl.textContent = pct + '%';
        }
        updateDoAAriaLive('Added: ' + counters.added + ', Duplicates: ' + counters.duplicates + ', Pending: ' + counters.pending);
    }

    function updateDoAScanStatus(statusText, statusType) {
        addLogMessage('updateDoAScanStatus: ' + statusText, 'log');
        var badge = document.getElementById('doa-status-badge');
        var titleEl = document.getElementById('doa-progress-title');
        if (badge) {
            badge.textContent = statusText;
            if (statusType === 'complete') {
                badge.style.background = 'rgba(107, 207, 127, 0.3)';
                badge.style.color = '#6bcf7f';
            } else if (statusType === 'error') {
                badge.style.background = 'rgba(255, 107, 107, 0.3)';
                badge.style.color = '#ff6b6b';
            } else if (statusType === 'stopped') {
                badge.style.background = 'rgba(170, 170, 170, 0.3)';
                badge.style.color = '#aaa';
            } else {
                badge.style.background = 'rgba(255, 217, 61, 0.3)';
                badge.style.color = '#ffd93d';
            }
        }
        if (titleEl && statusType === 'complete') {
            titleEl.textContent = 'DoA Log Staff Entries - Complete';
        }
    }

    function showDoAProgressPanel() {
        addLogMessage('showDoAProgressPanel: creating progress panel', 'log');
        doaState.isRunning = true;
        var modal = document.createElement('div');
        modal.id = 'doa-progress-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.id = 'doa-progress-container';
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 900px; max-width: 95%; max-height: 80vh; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative; display: flex; flex-direction: column;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'doa-progress-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0;';
        var titleContainer = document.createElement('div');
        titleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
        var titleEl = document.createElement('h3');
        titleEl.id = 'doa-progress-title';
        titleEl.textContent = 'DoA Log Staff Entries - Review';
        titleEl.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var statusBadge = document.createElement('span');
        statusBadge.id = 'doa-status-badge';
        statusBadge.textContent = 'In Progress';
        statusBadge.style.cssText = 'background: rgba(255, 255, 255, 0.3); color: #ffd93d; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
        titleContainer.appendChild(titleEl);
        titleContainer.appendChild(statusBadge);
        var headerButtons = document.createElement('div');
        headerButtons.style.cssText = 'display: flex; gap: 8px; align-items: center;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close and stop');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showDoAProgressPanel: closed by user', 'warn');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopDoA();
            if (doaState.focusReturnElement) {
                doaState.focusReturnElement.focus();
            }
        };
        var pauseButton = document.createElement('button');
        pauseButton.textContent = 'Pause';
        pauseButton.id = 'doa-pause-btn';
        pauseButton.setAttribute('aria-label', 'Pause or resume adding entries');
        pauseButton.style.cssText = 'background: rgba(255, 193, 7, 0.25); border: 2px solid rgba(255, 193, 7, 0.5); color: #ffd93d; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.25s ease;';
        pauseButton.onmouseover = function() { pauseButton.style.background = 'rgba(255, 193, 7, 0.4)'; };
        pauseButton.onmouseout = function() {
            if (doaState.isPaused) {
                pauseButton.style.background = 'rgba(76, 175, 80, 0.25)';
            } else {
                pauseButton.style.background = 'rgba(255, 193, 7, 0.25)';
            }
        };
        pauseButton.onclick = function() {
            if (doaState.isPaused) {
                addLogMessage('showDoAProgressPanel: Resume clicked', 'log');
                doaState.isPaused = false;
                pauseButton.textContent = 'Pause';
                pauseButton.style.background = 'rgba(255, 193, 7, 0.25)';
                pauseButton.style.borderColor = 'rgba(255, 193, 7, 0.5)';
                pauseButton.style.color = '#ffd93d';
                updateDoAScanStatus('Adding Entries', 'progress');
                var title = document.getElementById('doa-progress-title');
                if (title) {
                    title.textContent = 'DoA Log Staff Entries - Adding Entries';
                }
                processNextDoAFromQueue();
            } else {
                addLogMessage('showDoAProgressPanel: Pause clicked', 'log');
                doaState.isPaused = true;
                pauseButton.textContent = 'Resume';
                pauseButton.style.background = 'rgba(76, 175, 80, 0.25)';
                pauseButton.style.borderColor = 'rgba(76, 175, 80, 0.5)';
                pauseButton.style.color = '#6bcf7f';
                updateDoAScanStatus('Paused', 'paused');
                var title = document.getElementById('doa-progress-title');
                if (title) {
                    title.textContent = 'DoA Log Staff Entries - Paused';
                }
            }
        };
        headerButtons.appendChild(pauseButton);
        headerButtons.appendChild(closeButton);
        header.appendChild(titleContainer);
        header.appendChild(headerButtons);
        var panelsContainer = document.createElement('div');
        panelsContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; overflow: hidden;';
        var leftPanel = createSubpanel('Scanned Log Entries', 'doa-left-panel', 'doa-left-search');
        var rightPanel = createSubpanel('DoA Entries Status', 'doa-right-panel', 'doa-right-search');
        addSortToggleToSubpanel(rightPanel, 'doa-right-panel', 'doa-sort-toggle', 'doa-failure-filter', [DOA_LABELS.statusNotInDropdown, DOA_LABELS.statusRoleNotFound, DOA_LABELS.statusSelectionFailed, DOA_LABELS.statusSaveFailed]);
        panelsContainer.appendChild(leftPanel);
        panelsContainer.appendChild(rightPanel);
        var summaryFooter = document.createElement('div');
        summaryFooter.id = 'doa-summary-footer';
        summaryFooter.setAttribute('aria-label', 'Processing summary');
        summaryFooter.style.cssText = 'display: flex; justify-content: space-around; align-items: center; padding: 10px 16px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; margin-top: 12px; flex-shrink: 0;';
        var summaryItems = [
            { id: 'doa-summary-total', label: 'Total', value: '0' },
            { id: 'doa-summary-added', label: 'Added', value: '0' },
            { id: 'doa-summary-duplicates', label: 'Duplicates', value: '0' },
            { id: 'doa-summary-failures', label: 'Failures', value: '0' },
            { id: 'doa-summary-pending', label: 'Pending', value: '0' },
            { id: 'doa-summary-percent', label: 'Progress', value: '0%' }
        ];
        for (var si = 0; si < summaryItems.length; si++) {
            var summaryItem = document.createElement('div');
            summaryItem.style.cssText = 'text-align: center;';
            var valSpan = document.createElement('span');
            valSpan.id = summaryItems[si].id;
            valSpan.textContent = summaryItems[si].value;
            valSpan.style.cssText = 'display: block; color: white; font-size: 16px; font-weight: 700;';
            var labelSpan = document.createElement('span');
            labelSpan.textContent = summaryItems[si].label;
            labelSpan.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.6); font-size: 11px; font-weight: 500; margin-top: 2px;';
            summaryItem.appendChild(valSpan);
            summaryItem.appendChild(labelSpan);
            summaryFooter.appendChild(summaryItem);
        }
        var ariaLiveRegion = document.createElement('div');
        ariaLiveRegion.id = 'doa-aria-live';
        ariaLiveRegion.setAttribute('aria-live', 'polite');
        ariaLiveRegion.setAttribute('aria-atomic', 'true');
        ariaLiveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        container.appendChild(header);
        container.appendChild(panelsContainer);
        container.appendChild(summaryFooter);
        container.appendChild(ariaLiveRegion);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        initializeDoARightPanel();
        populateDoALeftPanel();
        closeButton.focus();
        addLogMessage('showDoAProgressPanel: progress panel displayed with all data populated', 'log');
        updateDoAScanStatus('Scan Complete', 'complete');
        var progressTitle = document.getElementById('doa-progress-title');
        if (progressTitle) {
            progressTitle.textContent = 'DoA Log Staff Entries - Adding Entries';
        }
        beginAddDoALogEntries();
    }

    function updateDoALeftPanelList(name, rowNumber) {
        var leftPanel = document.getElementById('doa-left-panel');
        if (!leftPanel) {
            return;
        }
        var item = createListItem(name, null, null, rowNumber);
        leftPanel.appendChild(item);
        var searchInput = document.getElementById('doa-left-search');
        if (searchInput && searchInput.value.trim()) {
            filterSubpanelList('doa-left-panel', searchInput.value);
        }
    }

    function populateDoALeftPanel() {
        addLogMessage('populateDoALeftPanel: populating with ' + doaState.scannedNames.length + ' names', 'log');
        var leftPanel = document.getElementById('doa-left-panel');
        if (!leftPanel) {
            addLogMessage('populateDoALeftPanel: left panel not found', 'error');
            return;
        }
        leftPanel.innerHTML = '';
        for (var i = 0; i < doaState.scannedNames.length; i++) {
            var item = createListItem(doaState.scannedNames[i], null, null, i + 1);
            leftPanel.appendChild(item);
        }
        addLogMessage('populateDoALeftPanel: populated ' + doaState.scannedNames.length + ' items', 'log');
    }

    function checkAndUpdateDoARightPanel(scannedName) {
    }

    function doaScanVisibleRowsOnce(onRow) {
        var gridTable = document.querySelector(DOA_SELECTORS.mainGridTable);
        if (!gridTable) {
            return 0;
        }
        var rows = gridTable.querySelectorAll(DOA_SELECTORS.mainGridRow);
        var newCount = 0;
        var batchNames = [];
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (row.getAttribute('role') === 'columnheader') {
                continue;
            }
            var cells = row.querySelectorAll(DOA_SELECTORS.mainGridCell);
            if (cells.length <= ELOG_SELECTORS.nameCellIndex) {
                continue;
            }
            var targetCell = cells[ELOG_SELECTORS.nameCellIndex];
            var primaryElement = targetCell.querySelector(ELOG_SELECTORS.namePrimary);
            var extractedName = null;
            if (primaryElement) {
                var brElement = primaryElement.querySelector('br');
                if (brElement) {
                    var nameText = '';
                    for (var ni = 0; ni < primaryElement.childNodes.length; ni++) {
                        var node = primaryElement.childNodes[ni];
                        if (node.nodeName === 'BR') {
                            break;
                        }
                        if (node.nodeType === Node.TEXT_NODE) {
                            nameText += node.textContent;
                        }
                    }
                    extractedName = nameText.trim().replace(/\s+/g, ' ');
                } else {
                    extractedName = primaryElement.textContent.trim().replace(/\s+/g, ' ');
                }
            }
            if (!extractedName) {
                var fallbackElement = targetCell.querySelector(ELOG_SELECTORS.nameFallback);
                if (fallbackElement) {
                    extractedName = fallbackElement.textContent.trim().replace(/\s+/g, ' ');
                }
            }
            if (!extractedName) {
                continue;
            }
            var normalized = elogNormalizeName(extractedName);
            if (doaState.seenNormalizedNames.has(normalized)) {
                continue;
            }
            doaState.seenNormalizedNames.add(normalized);
            doaState.scannedNames.push(extractedName);
            newCount++;
            batchNames.push(extractedName);
            if (onRow) {
                onRow(extractedName, normalized);
            }
        }
        if (batchNames.length > 0) {
            addLogMessage('doaScanVisibleRowsOnce: batch of ' + batchNames.length + ' new names', 'log');
        }
        return newCount;
    }

    function doaObserveUserScrollPause(container) {
        if (!container || doaState.userScrollHandler) {
            return;
        }
        doaState.userScrollHandler = function() {
            var timeSinceAuto = Date.now() - doaState.lastAutoScrollTime;
            if (timeSinceAuto > 50 && !doaState.userScrollPaused) {
                doaState.userScrollPaused = true;
                var resumeTimeout = setTimeout(function() {
                    doaState.userScrollPaused = false;
                }, ELOG_SCROLL.userScrollPauseMs);
                doaState.timeouts.push(resumeTimeout);
            }
        };
        container.addEventListener('scroll', doaState.userScrollHandler);
        doaState.eventListeners.push({ element: container, type: 'scroll', handler: doaState.userScrollHandler });
    }

    function doaAwaitSettle(container) {
        return new Promise(function(resolve) {
            var gridTable = document.querySelector(DOA_SELECTORS.mainGridTable);
            var resolved = false;
            var observer = null;
            var debounceTimer = null;
            function finish() {
                if (resolved) { return; }
                resolved = true;
                if (debounceTimer) { clearTimeout(debounceTimer); }
                if (observer) {
                    observer.disconnect();
                    var idx = doaState.observers.indexOf(observer);
                    if (idx > -1) { doaState.observers.splice(idx, 1); }
                }
                resolve();
            }
            var maxTimeoutId = setTimeout(function() {
                addLogMessage('doaAwaitSettle: max timeout reached, finishing', 'log');
                finish();
            }, ELOG_SCROLL.settleDelayMs * 5);
            doaState.timeouts.push(maxTimeoutId);
            if (gridTable) {
                observer = new MutationObserver(function() {
                    if (resolved) { return; }
                    if (debounceTimer) { clearTimeout(debounceTimer); }
                    debounceTimer = setTimeout(function() {
                        finish();
                    }, ELOG_SCROLL.settleDelayMs);
                    doaState.timeouts.push(debounceTimer);
                });
                observer.observe(gridTable, { childList: true, subtree: true });
                doaState.observers.push(observer);
            }
            debounceTimer = setTimeout(function() {
                finish();
            }, ELOG_SCROLL.settleDelayMs);
            doaState.timeouts.push(debounceTimer);
        });
    }

    function doaGetRenderedLastRowKey() {
        var gridTable = document.querySelector(DOA_SELECTORS.mainGridTable);
        if (!gridTable) {
            return '';
        }
        var rows = gridTable.querySelectorAll(DOA_SELECTORS.mainGridRow);
        var lastDataRow = null;
        for (var i = rows.length - 1; i >= 0; i--) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                lastDataRow = rows[i];
                break;
            }
        }
        if (!lastDataRow) {
            return '';
        }
        var cells = lastDataRow.querySelectorAll(DOA_SELECTORS.mainGridCell);
        if (cells.length > 0) {
            var firstCellText = cells[0].textContent.trim();
            if (firstCellText) {
                return firstCellText;
            }
        }
        var hash = 0;
        var content = lastDataRow.textContent || '';
        for (var ci = 0; ci < content.length; ci++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(ci);
            hash = hash & hash;
        }
        return 'hash_' + hash;
    }

    function doaGetRenderedRowCount() {
        var gridTable = document.querySelector(DOA_SELECTORS.mainGridTable);
        if (!gridTable) {
            return 0;
        }
        var rows = gridTable.querySelectorAll(DOA_SELECTORS.mainGridRow);
        var count = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                count++;
            }
        }
        return count;
    }

    function startDoAScan() {
        addLogMessage('startDoAScan: beginning scan with auto-scroll', 'log');
        doaState.scannedNames = [];
        doaState.seenNormalizedNames = new Set();
        doaWaitForElement(DOA_SELECTORS.mainTableContainer, ELOG_TIMEOUTS.waitTableMs)
            .then(function() {
            addLogMessage('startDoAScan: main table found', 'log');
            return doaWaitForElement(DOA_SELECTORS.mainGridTable, ELOG_TIMEOUTS.waitGridMs);
        })
            .then(function(gridTable) {
            addLogMessage('startDoAScan: grid table found, starting auto-scroll scan', 'log');
            doaAutoScrollScan({
                onRow: function(name, normalized) {
                },
                onProgress: function(data) {
                },
                onDone: function(data) {
                    addLogMessage('startDoAScan: done - total=' + data.total + ' reason=' + data.reason, 'log');
                    removeCollectingDataPanel('doa');
                    if (data.reason !== 'stopped' && doaState.isRunning) {
                        addLogMessage('startDoAScan: scan complete, showing progress panel', 'log');
                        showDoAProgressPanel();
                    }
                },
                onError: function(error) {
                    addLogMessage('startDoAScan: error - ' + error.message, 'error');
                    removeCollectingDataPanel('doa');
                    showDoAProgressPanel();
                    updateDoAScanStatus('Error', 'error');
                }
            });
        })
            .catch(function(error) {
            addLogMessage('startDoAScan: error during scan: ' + error, 'error');
            removeCollectingDataPanel('doa');
            showDoAProgressPanel();
            updateDoAScanStatus('Error', 'error');
        });
    }

    function doaAutoScrollScan(options) {
        addLogMessage('doaAutoScrollScan: starting', 'log');
        var onRow = options.onRow || function() {};
        var onProgress = options.onProgress || function() {};
        var onDone = options.onDone || function() {};
        var onError = options.onError || function() {};
        var gridTable = document.querySelector(DOA_SELECTORS.mainGridTable);
        if (!gridTable) {
            addLogMessage('doaAutoScrollScan: grid not found', 'error');
            onError(new Error('Grid table not found'));
            return;
        }
        var container = findScrollableContainer(gridTable);
        if (!container) {
            addLogMessage('doaAutoScrollScan: container not found', 'error');
            onError(new Error('Container not found'));
            return;
        }
        doaState.scrollContainer = container;
        doaState.prevScrollTop = container.scrollTop;
        doaState.seenNormalizedNames = new Set();
        doaState.leftPanelRowIndex = 0;
        doaSetAriaBusyOn();
        doaObserveUserScrollPause(container);
        addLogMessage('doaAutoScrollScan: scrolling to top before scan', 'log');
        container.scrollTo({ top: 0, behavior: 'auto' });
        var startTime = Date.now();
        var noProgress = 0;
        var prevScrollHeight = container.scrollHeight;
        function initialScan() {
            doaScanVisibleRowsOnce(function(name) {
                doaState.leftPanelRowIndex++;
            });
            onProgress({ scanned: doaState.scannedNames.length });
            prevScrollHeight = container.scrollHeight;
            var initScrollTimeout = setTimeout(scrollLoop, ELOG_SCROLL.idleDelayMs);
            doaState.timeouts.push(initScrollTimeout);
        }
        function scrollLoop() {
            if (!doaState.isRunning) {
                updateDoAAriaLive('Scan stopped');
                finishScan('Scan stopped', 'stopped');
                return;
            }
            if (Date.now() - startTime > ELOG_SCROLL.maxDurationMs) {
                finishScan('Scan complete', 'timeout');
                return;
            }
            if (doaState.userScrollPaused) {
                var pt = setTimeout(scrollLoop, 100);
                doaState.timeouts.push(pt);
                return;
            }
            var currentScrollHeight = container.scrollHeight;
            if (currentScrollHeight > prevScrollHeight) {
                addLogMessage('doaAutoScrollScan: scrollHeight grew from ' + prevScrollHeight + ' to ' + currentScrollHeight + ', resetting noProgress', 'log');
                noProgress = 0;
                prevScrollHeight = currentScrollHeight;
            }
            var priorKey = doaGetRenderedLastRowKey();
            var priorCount = doaGetRenderedRowCount();
            var currTop = container.scrollTop;
            var maxScroll = container.scrollHeight - container.clientHeight;
            var newTop = Math.min(currTop + ELOG_SCROLL.stepPx, maxScroll);
            doaState.lastAutoScrollTime = Date.now();
            container.scrollTo({ top: newTop, behavior: 'auto' });
            doaAwaitSettle(container).then(function() {
                var attempts = 0;
                function attemptScan() {
                    var rc = doaGetRenderedRowCount();
                    if (rc === 0 && attempts < ELOG_SCROLL.retryScanAttempts) {
                        attempts++;
                        var rt = setTimeout(attemptScan, ELOG_SCROLL.retryScanDelayMs);
                        doaState.timeouts.push(rt);
                        return;
                    }
                    doaScanVisibleRowsOnce(function(name) {
                        doaState.leftPanelRowIndex++;
                    });
                    onProgress({ scanned: doaState.scannedNames.length });
                    var currKey = doaGetRenderedLastRowKey();
                    var currCount = doaGetRenderedRowCount();
                    var postScrollHeight = container.scrollHeight;
                    if (postScrollHeight > prevScrollHeight) {
                        addLogMessage('doaAutoScrollScan: scrollHeight grew after scan from ' + prevScrollHeight + ' to ' + postScrollHeight + ', resetting noProgress', 'log');
                        noProgress = 0;
                        prevScrollHeight = postScrollHeight;
                    } else if (currKey === priorKey && currCount === priorCount) {
                        noProgress++;
                    } else {
                        noProgress = 0;
                    }
                    if (computeEndReached(container, noProgress)) {
                        finishScan('Scan complete', 'endReached');
                        return;
                    }
                    if (noProgress >= ELOG_SCROLL.maxNoProgressIterations) {
                        finishScan('Scan complete', 'noProgress');
                        return;
                    }
                    if (typeof requestIdleCallback === 'function') {
                        var icbId = requestIdleCallback(function() {
                            var idx = doaState.idleCallbackIds.indexOf(icbId);
                            if (idx > -1) {
                                doaState.idleCallbackIds.splice(idx, 1);
                            }
                            scrollLoop();
                        }, { timeout: ELOG_SCROLL.idleDelayMs * 2 });
                        doaState.idleCallbackIds.push(icbId);
                    } else {
                        var it = setTimeout(scrollLoop, ELOG_SCROLL.idleDelayMs);
                        doaState.timeouts.push(it);
                    }
                }
                attemptScan();
            });
        }
        function finishScan(label, reason) {
            addLogMessage('doaAutoScrollScan: done reason=' + reason + ' total=' + doaState.scannedNames.length, 'log');
            doaSetAriaBusyOff();
            onDone({ total: doaState.scannedNames.length, reason: reason });
        }
        function waitForStableScrollHeight(callback) {
            var checks = 0;
            var maxChecks = 5;
            var lastHeight = container.scrollHeight;
            var stableCount = 0;
            function checkHeight() {
                if (!doaState.isRunning) { return; }
                var currentHeight = container.scrollHeight;
                if (currentHeight === lastHeight) {
                    stableCount++;
                } else {
                    addLogMessage('doaAutoScrollScan: scrollHeight changed from ' + lastHeight + ' to ' + currentHeight + ' during stabilization', 'log');
                    stableCount = 0;
                    lastHeight = currentHeight;
                }
                checks++;
                if (stableCount >= 2 || checks >= maxChecks) {
                    addLogMessage('doaAutoScrollScan: scrollHeight stabilized at ' + currentHeight + ' after ' + checks + ' checks', 'log');
                    callback();
                    return;
                }
                var tid = setTimeout(checkHeight, 500);
                doaState.timeouts.push(tid);
            }
            var tid = setTimeout(checkHeight, 500);
            doaState.timeouts.push(tid);
        }
        doaAwaitSettle(container).then(function() {
            waitForStableScrollHeight(function() {
                initialScan();
            });
        });
    }

    function ensureDoAAddEntryFormOpen() {
        addLogMessage('ensureDoAAddEntryFormOpen: checking form state', 'log');
        return new Promise(function(resolve, reject) {
            var memberInput = document.querySelector(DOA_SELECTORS.memberInput);
            if (memberInput) {
                addLogMessage('ensureDoAAddEntryFormOpen: member input already present', 'log');
                resolve(memberInput);
                return;
            }
            var addBtn = document.querySelector(DOA_SELECTORS.addEntryBtn);
            if (addBtn) {
                addLogMessage('ensureDoAAddEntryFormOpen: clicking Add Entry button', 'log');
                addBtn.click();
            } else {
                addLogMessage('ensureDoAAddEntryFormOpen: Add Entry button not found', 'warn');
            }
            doaWaitForElement(DOA_SELECTORS.memberInput, DOA_TIMEOUTS.waitOpenMs)
                .then(function(el) {
                addLogMessage('ensureDoAAddEntryFormOpen: member input found', 'log');
                resolve(el);
            })
                .catch(function(err) {
                addLogMessage('ensureDoAAddEntryFormOpen: timeout: ' + err, 'error');
                reject(err);
            });
        });
    }

    function ensureDoAMemberDropdownOpen() {
        addLogMessage('ensureDoAMemberDropdownOpen: checking dropdown', 'log');
        return new Promise(function(resolve, reject) {
            var retries = 0;
            function tryOpen() {
                var listEl = document.querySelector(DOA_SELECTORS.listContainer);
                if (listEl) {
                    addLogMessage('ensureDoAMemberDropdownOpen: list already open', 'log');
                    doaState.activeDropdown = { inputSelector: DOA_SELECTORS.memberInput, listSelector: DOA_SELECTORS.listContainer };
                    resolve(listEl);
                    return;
                }
                var inputEl = document.querySelector(DOA_SELECTORS.memberInput);
                if (inputEl) {
                    addLogMessage('ensureDoAMemberDropdownOpen: clicking input to open list', 'log');
                    inputEl.click();
                    inputEl.focus();
                }
                doaWaitForElement(DOA_SELECTORS.listContainer, DOA_TIMEOUTS.waitListMs)
                    .then(function(el) {
                    addLogMessage('ensureDoAMemberDropdownOpen: list opened', 'log');
                    doaState.activeDropdown = { inputSelector: DOA_SELECTORS.memberInput, listSelector: DOA_SELECTORS.listContainer };
                    resolve(el);
                })
                    .catch(function(err) {
                    retries++;
                    if (retries < DOA_RETRY.openListRetries) {
                        addLogMessage('ensureDoAMemberDropdownOpen: retry ' + retries, 'warn');
                        var tid = setTimeout(tryOpen, 300);
                        doaState.timeouts.push(tid);
                    } else {
                        addLogMessage('ensureDoAMemberDropdownOpen: exhausted retries', 'error');
                        reject(err);
                    }
                });
            }
            tryOpen();
        });
    }

    function findDoADropdownViewportElement() {
        var el = document.querySelector(DOA_SELECTORS.virtualViewport);
        if (el) {
            addLogMessage('findDoADropdownViewportElement: found', 'log');
        } else {
            addLogMessage('findDoADropdownViewportElement: not found', 'warn');
        }
        return el;
    }

    function rememberDoAListScrollPosition(viewportEl) {
        if (viewportEl) {
            doaState.listScrollTop = viewportEl.scrollTop;
        }
    }

    function restoreDoAListScrollPosition(viewportEl) {
        if (viewportEl && doaState.listScrollTop > 0) {
            viewportEl.scrollTop = doaState.listScrollTop;
        }
    }

    function attemptDoASelectByScrollingForName(targetDisplay, targetPairKey, candidatePairKeys) {
        var searchInfo = buildCandidatePairKeys(targetDisplay);
        var candidates = candidatePairKeys && candidatePairKeys.length > 0 ? candidatePairKeys : searchInfo.pairKeys;
        var searchTerms = searchInfo.searchTerms;
        addLogMessage('[Florence] attemptDoASelectByScrollingForName: target=' + targetDisplay + ' searchTerms=[' + searchTerms.join(', ') + '] candidates=[' + candidates.join(', ') + ']', 'log');
        return new Promise(function(resolve) {
            var inputEl = document.querySelector(DOA_SELECTORS.memberInput);
            if (!inputEl) {
                addLogMessage('attemptDoASelectByScrollingForName: member input not found', 'error');
                resolve(false);
                return;
            }
            tryNameSearchTermsSequentially(searchTerms, 0, inputEl, targetPairKey, DOA_SELECTORS, DOA_TIMEOUTS, doaState, candidates, 'attemptDoASelectByScrollingForName', resolve);
        });
    }

    function clearDoARoleSelection() {
        addLogMessage('clearDoARoleSelection: looking for clear button in Study Role field', 'log');
        var roleInput = document.querySelector(DOA_SELECTORS.roleSearchInput);
        if (!roleInput) {
            addLogMessage('clearDoARoleSelection: role search input not found, skipping', 'log');
            return Promise.resolve();
        }
        var container = roleInput.closest('.filtered-select');
        if (!container) {
            addLogMessage('clearDoARoleSelection: filtered-select container not found, skipping', 'log');
            return Promise.resolve();
        }
        var clearBtn = container.querySelector(DOA_SELECTORS.roleClearBtn);
        if (clearBtn) {
            addLogMessage('clearDoARoleSelection: clear button found in Study Role container, clicking', 'log');
            clearBtn.click();
            return doaDelay(DOA_TIMEOUTS.settleMs);
        }
        addLogMessage('clearDoARoleSelection: no clear button in Study Role container, skipping', 'log');
        return Promise.resolve();
    }

    function clickDoASaveAndAddAnother() {
        addLogMessage('clickDoASaveAndAddAnother: looking for Save button', 'log');
        return new Promise(function(resolve) {
            var saveBtn = document.querySelector('button.btn.btn-primary.test-submitBtn');
            if (!saveBtn) {
                var buttons = document.querySelectorAll(DOA_SELECTORS.saveAndAddAnotherBtn);
                for (var bi = 0; bi < buttons.length; bi++) {
                    var btnText = buttons[bi].textContent.trim();
                    if (btnText.indexOf('Save') !== -1) {
                        saveBtn = buttons[bi];
                        break;
                    }
                }
            }
            if (!saveBtn) {
                addLogMessage('clickDoASaveAndAddAnother: button not found', 'warn');
                resolve(false);
                return;
            }
            addLogMessage('clickDoASaveAndAddAnother: button found, clicking', 'log');
            saveBtn.click();
            var saveTid = setTimeout(function() {
                addLogMessage('clickDoASaveAndAddAnother: save settle complete', 'log');
                resolve(true);
            }, DOA_TIMEOUTS.waitAfterSaveMs);
            doaState.timeouts.push(saveTid);
        });
    }

    function selectRoleForCandidate(roleDisplay, roleKey) {
        addLogMessage('selectRoleForCandidate: roleDisplay=' + roleDisplay + ' roleKey=' + roleKey, 'log');
        return new Promise(function(resolve) {
            var roleInput = document.querySelector(DOA_SELECTORS.roleSearchInput);
            if (!roleInput) {
                addLogMessage('selectRoleForCandidate: role search input not found', 'warn');
                resolve(false);
                return;
            }
            roleInput.click();
            roleInput.focus();
            doaWaitForElement(DOA_SELECTORS.listContainer, DOA_TIMEOUTS.waitRoleListMs)
                .then(function() {
                addLogMessage('selectRoleForCandidate: role list opened', 'log');
                doaState.activeDropdown = { inputSelector: DOA_SELECTORS.roleSearchInput, listSelector: DOA_SELECTORS.listContainer };
                var viewportEl = document.querySelector(DOA_SELECTORS.virtualViewport);
                if (viewportEl && doaState.roleListScrollTop > 0) {
                    viewportEl.scrollTop = doaState.roleListScrollTop;
                }
                var passCount = 0;
                var lastScrollTop = -1;
                var lastOptionSnapshot = '';
                var startTime = Date.now();
                function scanRoles() {
                    if (!doaState.isRunning) {
                        resolve(false);
                        return;
                    }
                    if (Date.now() - startTime > DOA_TIMEOUTS.maxSelectDurationMs) {
                        addLogMessage('selectRoleForCandidate: max duration exceeded', 'warn');
                        resolve(false);
                        return;
                    }
                    if (passCount >= DOA_RETRY.maxScrollPasses) {
                        addLogMessage('selectRoleForCandidate: max passes reached', 'warn');
                        resolve(false);
                        return;
                    }
                    reopenDropdownIfClosed(doaState).then(function() {
                        var freshVp = document.querySelector(DOA_SELECTORS.virtualViewport);
                        if (freshVp) {
                            viewportEl = freshVp;
                        }
                        doScanRoles();
                    });
                }
                function doScanRoles() {
                    var roleOptions = document.querySelectorAll(DOA_SELECTORS.roleOptionItem);
                    var found = false;
                    var optionTexts = [];
                    for (var ri = 0; ri < roleOptions.length; ri++) {
                        var textEl = roleOptions[ri].querySelector(DOA_SELECTORS.roleOptionText);
                        var optText = textEl ? textEl.textContent.trim() : roleOptions[ri].textContent.trim();
                        optionTexts.push(optText);
                        var normalized = normalizeRoleName(optText);
                        if (normalized.key === roleKey) {
                            addLogMessage('selectRoleForCandidate: match found at index ' + ri + ' text=' + optText, 'log');
                            doaState.activeDropdown = null;
                            roleOptions[ri].click();
                            found = true;
                            var vp = document.querySelector(DOA_SELECTORS.virtualViewport);
                            if (vp) {
                                doaState.roleListScrollTop = vp.scrollTop;
                            }
                            var verifyTid = setTimeout(function() {
                                resolve(true);
                            }, DOA_TIMEOUTS.settleMs);
                            doaState.timeouts.push(verifyTid);
                            break;
                        }
                    }
                    if (!found) {
                        var vp2 = document.querySelector(DOA_SELECTORS.virtualViewport);
                        if (!vp2) {
                            addLogMessage('selectRoleForCandidate: no viewport for role scroll', 'warn');
                            resolve(false);
                            return;
                        }
                        var currentSnapshot = optionTexts.join('|');
                        var currentTop = vp2.scrollTop;
                        var noProgressFlag = (currentTop === lastScrollTop && currentSnapshot === lastOptionSnapshot);
                        if (noProgressFlag) {
                            passCount++;
                        }
                        lastScrollTop = currentTop;
                        lastOptionSnapshot = currentSnapshot;
                        var stepSize = Math.round(vp2.clientHeight * 0.7);
                        var maxScroll = vp2.scrollHeight - vp2.clientHeight;
                        var newTop = Math.min(currentTop + stepSize, maxScroll);
                        if (newTop <= currentTop && currentTop > 0) {
                            newTop = 0;
                            lastScrollTop = -1;
                            lastOptionSnapshot = '';
                            passCount++;
                        }
                        vp2.scrollTop = newTop;
                        var scrollTid = setTimeout(scanRoles, DOA_TIMEOUTS.scrollIdleMs);
                        doaState.timeouts.push(scrollTid);
                    }
                }
                var initTid = setTimeout(scanRoles, DOA_TIMEOUTS.scrollIdleMs);
                doaState.timeouts.push(initTid);
            })
                .catch(function(err) {
                addLogMessage('selectRoleForCandidate: timeout opening role list: ' + err, 'error');
                resolve(false);
            });
        });
    }

    function openAndApplyStudyTasks(numbersSet) {
        addLogMessage('openAndApplyStudyTasks: numbersSet size=' + numbersSet.size, 'log');
        return new Promise(function(resolve) {
            var toggleBtn = document.querySelector(DOA_SELECTORS.tasksToggleBtn);
            if (!toggleBtn) {
                addLogMessage('openAndApplyStudyTasks: toggle button not found', 'warn');
                resolve(false);
                return;
            }
            addLogMessage('openAndApplyStudyTasks: clicking toggle button', 'log');
            toggleBtn.click();
            doaWaitForElement(DOA_SELECTORS.tasksMenu, DOA_TIMEOUTS.waitTasksMenuMs)
                .then(function(menu) {
                addLogMessage('openAndApplyStudyTasks: tasks menu opened', 'log');
                var items = menu.querySelectorAll(DOA_SELECTORS.tasksItem);
                addLogMessage('openAndApplyStudyTasks: found ' + items.length + ' task items', 'log');
                var toggleQueue = [];
                for (var ti = 0; ti < items.length; ti++) {
                    var itemText = items[ti].textContent.trim();
                    var leadingNumMatch = itemText.match(/^(\d+)\./);
                    if (!leadingNumMatch) {
                        continue;
                    }
                    var taskNum = parseInt(leadingNumMatch[1], 10);
                    var checkbox = items[ti].querySelector(DOA_SELECTORS.tasksItemCheckbox);
                    if (!checkbox) {
                        continue;
                    }
                    var isChecked = checkbox.checked;
                    var shouldBeChecked = numbersSet.has(taskNum);
                    if (shouldBeChecked && !isChecked) {
                        toggleQueue.push({ element: checkbox, taskNum: taskNum, action: 'check' });
                    } else if (!shouldBeChecked && isChecked) {
                        toggleQueue.push({ element: checkbox, taskNum: taskNum, action: 'uncheck' });
                    }
                }
                addLogMessage('openAndApplyStudyTasks: ' + toggleQueue.length + ' toggles needed', 'log');
                var tqi = 0;
                function processNextToggle() {
                    if (!doaState.isRunning) {
                        resolve(false);
                        return;
                    }
                    if (tqi >= toggleQueue.length) {
                        addLogMessage('openAndApplyStudyTasks: all toggles applied', 'log');
                        var closeBtn = document.querySelector(DOA_SELECTORS.tasksToggleBtn);
                        if (closeBtn) {
                            closeBtn.click();
                        }
                        var closeTid = setTimeout(function() {
                            resolve(true);
                        }, DOA_TIMEOUTS.waitAfterTasksToggleMs);
                        doaState.timeouts.push(closeTid);
                        return;
                    }
                    var toggleItem = toggleQueue[tqi];
                    toggleItem.element.click();
                    tqi++;
                    var nextTid = setTimeout(processNextToggle, DOA_TIMEOUTS.waitAfterTasksToggleMs);
                    doaState.timeouts.push(nextTid);
                }
                var startTid = setTimeout(processNextToggle, DOA_TIMEOUTS.waitAfterTasksToggleMs);
                doaState.timeouts.push(startTid);
            })
                .catch(function(err) {
                addLogMessage('openAndApplyStudyTasks: timeout opening tasks menu: ' + err, 'error');
                resolve(false);
            });
        });
    }

    function processNextDoAFromQueue() {
        addLogMessage('processNextDoAFromQueue: index=' + doaState.addQueueIndex + ' of ' + doaState.addQueue.length, 'log');
        if (doaState.isPaused) {
            addLogMessage('processNextDoAFromQueue: paused, waiting for resume', 'log');
            return;
        }
        if (!doaState.isRunning) {
            addLogMessage('processNextDoAFromQueue: stopped, marking remaining as Stopped', 'warn');
            for (var si = doaState.addQueueIndex; si < doaState.addQueue.length; si++) {
                if (doaState.addQueue[si].status === DOA_LABELS.statusPending) {
                    doaState.addQueue[si].status = DOA_LABELS.statusStopped;
                    updateDoARightPanelStatus(doaState.addQueue[si].pairKey, DOA_LABELS.statusStopped);
                    doaState.counters.pending--;
                }
            }
            updateDoARightPanelSummary(doaState.counters);
            doaState.isAddingEntries = false;
            updateDoAScanStatus('Stopped', 'stopped');
            var titleEl = document.getElementById('doa-progress-title');
            if (titleEl) {
                titleEl.textContent = 'DoA Log Staff Entries - Stopped';
            }
            var pauseBtn = document.getElementById('doa-pause-btn');
            if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.style.opacity = '0.4'; pauseBtn.style.cursor = 'default'; }
            return;
        }
        if (doaState.addQueueIndex >= doaState.addQueue.length) {
            addLogMessage('processNextDoAFromQueue: all candidates processed', 'log');
            doaState.isAddingEntries = false;
            updateDoAScanStatus('Complete', 'complete');
            var titleEl2 = document.getElementById('doa-progress-title');
            if (titleEl2) {
                titleEl2.textContent = 'DoA Log Staff Entries - Complete';
            }
            var pauseBtnDone = document.getElementById('doa-pause-btn');
            if (pauseBtnDone) { pauseBtnDone.disabled = true; pauseBtnDone.style.opacity = '0.4'; pauseBtnDone.style.cursor = 'default'; }
            updateDoARightPanelSummary(doaState.counters);
            updateDoAAriaLive('Processing complete. Added: ' + doaState.counters.added + ', Duplicates: ' + doaState.counters.duplicates + ', Failures: ' + doaState.counters.failures);
            return;
        }
        var candidate = doaState.addQueue[doaState.addQueueIndex];
        addLogMessage('processNextDoAFromQueue: processing ' + candidate.display + ' role=' + candidate.roleDisplay, 'log');
        if (doaState.existingPairs.has(candidate.pairKey)) {
            addLogMessage('processNextDoAFromQueue: already exists in table', 'log');
            candidate.status = DOA_LABELS.statusAlready;
            doaState.counters.duplicates++;
            doaState.counters.pending--;
            updateDoARightPanelStatus(candidate.pairKey, DOA_LABELS.statusAlready);
            updateDoARightPanelSummary(doaState.counters);
            doaState.addQueueIndex++;
            var tid1 = setTimeout(processNextDoAFromQueue, 50);
            doaState.timeouts.push(tid1);
            return;
        }
        ensureDoAAddEntryFormOpen()
            .then(function() {
            if (doaState.isPaused) { addLogMessage('processNextDoAFromQueue: paused after form open', 'log'); return Promise.reject('__paused__'); }
            addLogMessage('processNextDoAFromQueue: form open, opening dropdown', 'log');
            return ensureDoAMemberDropdownOpen();
        })
            .then(function() {
            if (doaState.isPaused) { addLogMessage('processNextDoAFromQueue: paused after dropdown open', 'log'); return Promise.reject('__paused__'); }
            addLogMessage('processNextDoAFromQueue: dropdown open, selecting name', 'log');
            return attemptDoASelectByScrollingForName(candidate.display, candidate.pairKey, candidate.candidatePairKeys);
        })
            .then(function(selected) {
            if (doaState.isPaused) { addLogMessage('processNextDoAFromQueue: paused after name selection', 'log'); return; }
            if (!selected) {
                addLogMessage('processNextDoAFromQueue: not found in dropdown', 'warn');
                candidate.status = DOA_LABELS.statusNotInDropdown;
                doaState.counters.failures++;
                doaState.counters.pending--;
                updateDoARightPanelStatus(candidate.pairKey, DOA_LABELS.statusNotInDropdown);
                updateDoARightPanelSummary(doaState.counters);
                doaState.addQueueIndex++;
                var tid2 = setTimeout(processNextDoAFromQueue, 50);
                doaState.timeouts.push(tid2);
                return;
            }
            addLogMessage('processNextDoAFromQueue: name selected, clearing role field', 'log');
            if (doaState.isPaused) { addLogMessage('processNextDoAFromQueue: paused before role selection', 'log'); return; }
            return doaDelay(DOA_TIMEOUTS.settleMs).then(function() {
                return clearDoARoleSelection();
            }).then(function() {
                if (doaState.isPaused) { addLogMessage('processNextDoAFromQueue: paused after role clear', 'log'); return Promise.reject('__paused__'); }
                addLogMessage('processNextDoAFromQueue: role field cleared, selecting role', 'log');
                return selectRoleForCandidate(candidate.roleDisplay, candidate.roleKey);
            }).then(function(roleSelected) {
                if (!roleSelected) {
                    addLogMessage('processNextDoAFromQueue: role not found', 'warn');
                    candidate.status = DOA_LABELS.statusRoleNotFound;
                    doaState.counters.failures++;
                    doaState.counters.pending--;
                    updateDoARightPanelStatus(candidate.pairKey, DOA_LABELS.statusRoleNotFound);
                    updateDoARightPanelSummary(doaState.counters);
                    doaState.addQueueIndex++;
                    var tid3 = setTimeout(processNextDoAFromQueue, 50);
                    doaState.timeouts.push(tid3);
                    return;
                }
                addLogMessage('processNextDoAFromQueue: role selected, applying tasks', 'log');
                if (doaState.isPaused) { addLogMessage('processNextDoAFromQueue: paused before tasks', 'log'); return Promise.reject('__paused__'); }
                return doaDelay(DOA_TIMEOUTS.settleMs).then(function() {
                    return openAndApplyStudyTasks(candidate.numbersSet);
                }).then(function(tasksApplied) {
                    if (!tasksApplied) {
                        addLogMessage('processNextDoAFromQueue: tasks failed', 'warn');
                        candidate.status = DOA_LABELS.statusSelectionFailed;
                        doaState.counters.failures++;
                        doaState.counters.pending--;
                        updateDoARightPanelStatus(candidate.pairKey, DOA_LABELS.statusSelectionFailed);
                        updateDoARightPanelSummary(doaState.counters);
                        doaState.addQueueIndex++;
                        var tid4a = setTimeout(processNextDoAFromQueue, 50);
                        doaState.timeouts.push(tid4a);
                        return;
                    }
                    addLogMessage('processNextDoAFromQueue: tasks applied, saving entry', 'log');
                    if (doaState.isPaused) { addLogMessage('processNextDoAFromQueue: paused before save', 'log'); return Promise.reject('__paused__'); }
                    return clickDoASaveAndAddAnother().then(function(saved) {
                        if (!saved) {
                            addLogMessage('processNextDoAFromQueue: save failed', 'warn');
                            candidate.status = DOA_LABELS.statusSaveFailed;
                            doaState.counters.failures++;
                            doaState.counters.pending--;
                            updateDoARightPanelStatus(candidate.pairKey, DOA_LABELS.statusSaveFailed);
                        } else {
                            addLogMessage('processNextDoAFromQueue: entry saved successfully', 'log');
                            candidate.status = DOA_LABELS.statusTasksApplied;
                            doaState.counters.added++;
                            doaState.counters.pending--;
                            updateDoARightPanelStatus(candidate.pairKey, DOA_LABELS.statusTasksApplied);
                        }
                        updateDoARightPanelSummary(doaState.counters);
                        doaState.addQueueIndex++;
                        var tid4b = setTimeout(processNextDoAFromQueue, 50);
                        doaState.timeouts.push(tid4b);
                    });
                });
            });
        })
            .catch(function(err) {
            if (err === '__paused__') { return; }
            addLogMessage('processNextDoAFromQueue: error: ' + err, 'error');
            candidate.status = DOA_LABELS.statusSelectionFailed;
            doaState.counters.failures++;
            doaState.counters.pending--;
            updateDoARightPanelStatus(candidate.pairKey, DOA_LABELS.statusSelectionFailed);
            updateDoARightPanelSummary(doaState.counters);
            doaState.addQueueIndex++;
            var tid5 = setTimeout(processNextDoAFromQueue, 50);
            doaState.timeouts.push(tid5);
        });
    }

    function beginAddDoALogEntries() {
        addLogMessage('beginAddDoALogEntries: starting', 'log');
        doaState.existingPairs = buildExistingPairsFromScan(doaState.scannedNames);
        addLogMessage('beginAddDoALogEntries: existingPairs count=' + doaState.existingPairs.size, 'log');
        var result = buildDoAQueueSorted(doaState.parsedCandidates);
        doaState.addQueue = result.queue;
        doaState.addQueueIndex = 0;
        doaState.listScrollTop = 0;
        doaState.roleListScrollTop = 0;
        doaState.isAddingEntries = true;
        for (var di = 0; di < result.duplicateIndices.length; di++) {
            var dupIdx = result.duplicateIndices[di];
            var dupCandidate = doaState.parsedCandidates[dupIdx];
            if (dupCandidate) {
                updateDoARightPanelStatus(dupCandidate.pairKey, DOA_LABELS.statusDuplicate);
            }
        }
        doaState.counters = {
            total: doaState.addQueue.length,
            added: 0,
            duplicates: 0,
            failures: 0,
            pending: doaState.addQueue.length
        };
        updateDoARightPanelSummary(doaState.counters);
        updateDoAScanStatus('Adding Entries', 'progress');
        var titleEl = document.getElementById('doa-progress-title');
        if (titleEl) {
            titleEl.textContent = 'DoA Log Staff Entries - Adding Entries';
        }
        updateDoAAriaLive('Starting to add ' + doaState.addQueue.length + ' entries');
        addLogMessage('beginAddDoALogEntries: queue size=' + doaState.addQueue.length + ', starting processing', 'log');
        processNextDoAFromQueue();
    }

    function addDoALogStaffEntriesInit() {
        addLogMessage('addDoALogStaffEntriesInit: starting feature', 'log');
        doaState.focusReturnElement = document.getElementById('doa-staff-entries-btn');
        doaState.abortController = new AbortController();
        resetDoAState();
        var mainTable = document.querySelector(DOA_SELECTORS.mainTableContainer);
        addLogMessage('addDoALogStaffEntriesInit: checking for main table', 'log');
        if (!mainTable) {
            addLogMessage('addDoALogStaffEntriesInit: main table not found, showing warning', 'warn');
            showDoAWarning();
            return;
        }
        addLogMessage('addDoALogStaffEntriesInit: main table found, showing input panel', 'log');
        showDoAInputPanel();
    }

    function showDoAWarning() {
        addLogMessage('showDoAWarning: creating warning popup', 'log');
        var modal = document.createElement('div');
        modal.id = 'doa-warning-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 30000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 12px; padding: 24px; width: 450px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'alertdialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'doa-warning-title');
        container.setAttribute('aria-describedby', 'doa-warning-message');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        var title = document.createElement('h3');
        title.id = 'doa-warning-title';
        title.textContent = 'Document Log Not Found';
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close warning');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        var closeWarning = function() {
            addLogMessage('showDoAWarning: closing warning', 'log');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopDoA();
            if (doaState.focusReturnElement) {
                doaState.focusReturnElement.focus();
            }
        };
        closeButton.onclick = closeWarning;
        header.appendChild(title);
        header.appendChild(closeButton);
        var messageDiv = document.createElement('p');
        messageDiv.id = 'doa-warning-message';
        messageDiv.textContent = 'The current page does not contain the Document Log Entries table. Please navigate to a page with the DoA Log before using this feature.';
        messageDiv.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px; line-height: 1.5;';
        var okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; margin-top: 20px; width: 100%;';
        okButton.onmouseover = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        okButton.onmouseout = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        okButton.onclick = closeWarning;
        var keyHandler = function(e) {
            if (e.key === 'Escape') {
                closeWarning();
            }
        };
        document.addEventListener('keydown', keyHandler);
        doaState.eventListeners.push({ element: document, type: 'keydown', handler: keyHandler });
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
        okButton.focus();
        addLogMessage('showDoAWarning: warning displayed', 'log');
    }

    function stopDoA() {
        addLogMessage('stopDoA: stopping all DoA processes', 'log');
        doaState.isRunning = false;
        for (var i = 0; i < doaState.idleCallbackIds.length; i++) {
            try {
                if (typeof cancelIdleCallback === 'function') {
                    cancelIdleCallback(doaState.idleCallbackIds[i]);
                }
            } catch (e) {
                addLogMessage('stopDoA: error canceling idle callback: ' + e, 'error');
            }
        }
        doaState.idleCallbackIds = [];
        if (doaState.idleCallbackId && typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(doaState.idleCallbackId);
            doaState.idleCallbackId = null;
        }
        for (var i2 = 0; i2 < doaState.observers.length; i2++) {
            try {
                doaState.observers[i2].disconnect();
            } catch (e2) {
                addLogMessage('stopDoA: error disconnecting observer: ' + e2, 'error');
            }
        }
        doaState.observers = [];
        for (var i3 = 0; i3 < doaState.timeouts.length; i3++) {
            try {
                clearTimeout(doaState.timeouts[i3]);
            } catch (e3) {
                addLogMessage('stopDoA: error clearing timeout: ' + e3, 'error');
            }
        }
        doaState.timeouts = [];
        for (var i4 = 0; i4 < doaState.intervals.length; i4++) {
            try {
                clearInterval(doaState.intervals[i4]);
            } catch (e4) {
                addLogMessage('stopDoA: error clearing interval: ' + e4, 'error');
            }
        }
        doaState.intervals = [];
        for (var i5 = 0; i5 < doaState.eventListeners.length; i5++) {
            try {
                var listener = doaState.eventListeners[i5];
                listener.element.removeEventListener(listener.type, listener.handler);
            } catch (e5) {
                addLogMessage('stopDoA: error removing event listener: ' + e5, 'error');
            }
        }
        doaState.eventListeners = [];
        if (doaState.abortController) {
            doaState.abortController.abort();
            doaState.abortController = null;
        }
        doaSetAriaBusyOff();
        if (doaState.scrollContainer && doaState.prevScrollTop !== undefined) {
            addLogMessage('stopDoA: restoring viewport', 'log');
            restoreViewport(doaState.scrollContainer, doaState.prevScrollTop);
        }
        doaState.scrollContainer = null;
        doaState.userScrollHandler = null;
        doaState.userScrollPaused = false;
        if (doaState.isAddingEntries) {
            addLogMessage('stopDoA: was adding entries, marking remaining as Stopped', 'log');
            for (var qi = doaState.addQueueIndex; qi < doaState.addQueue.length; qi++) {
                if (doaState.addQueue[qi].status === DOA_LABELS.statusPending) {
                    doaState.addQueue[qi].status = DOA_LABELS.statusStopped;
                    doaState.counters.pending--;
                }
            }
            doaState.isAddingEntries = false;
        }
        doaState.addQueue = [];
        doaState.addQueueIndex = 0;
        doaState.existingPairs = new Set();
        doaState.listScrollTop = 0;
        doaState.roleListScrollTop = 0;
        var inputModal = document.getElementById('doa-input-modal');
        if (inputModal && inputModal.parentNode) {
            inputModal.parentNode.removeChild(inputModal);
        }
        var progressModal = document.getElementById('doa-progress-modal');
        if (progressModal && progressModal.parentNode) {
            progressModal.parentNode.removeChild(progressModal);
        }
        var warningModal = document.getElementById('doa-warning-modal');
        if (warningModal && warningModal.parentNode) {
            warningModal.parentNode.removeChild(warningModal);
        }
        removeCollectingDataPanel('doa');
        if (doaState.focusReturnElement) {
            doaState.focusReturnElement.focus();
        }
        resetDoAState();
        addLogMessage('stopDoA: cleanup complete', 'log');
    }

    function stopResponsibilities() {
        addLogMessage('stopResponsibilities: stopping', 'log');
        respState.stopRequested = true;
        respState.isRunning = false;
        for (var i = 0; i < respState.idleCallbackIds.length; i++) {
            try {
                if (typeof cancelIdleCallback === 'function') {
                    cancelIdleCallback(respState.idleCallbackIds[i]);
                }
            } catch (e) {
                addLogMessage('stopResponsibilities: error canceling idle callback: ' + e, 'error');
            }
        }
        respState.idleCallbackIds = [];
        for (var i2 = 0; i2 < respState.observers.length; i2++) {
            try {
                respState.observers[i2].disconnect();
            } catch (e2) {
                addLogMessage('stopResponsibilities: error disconnecting observer: ' + e2, 'error');
            }
        }
        respState.observers = [];
        for (var i3 = 0; i3 < respState.timeouts.length; i3++) {
            try {
                clearTimeout(respState.timeouts[i3]);
            } catch (e3) {
                addLogMessage('stopResponsibilities: error clearing timeout: ' + e3, 'error');
            }
        }
        respState.timeouts = [];
        for (var i4 = 0; i4 < respState.intervals.length; i4++) {
            try {
                clearInterval(respState.intervals[i4]);
            } catch (e4) {
                addLogMessage('stopResponsibilities: error clearing interval: ' + e4, 'error');
            }
        }
        respState.intervals = [];
        for (var i5 = 0; i5 < respState.eventListeners.length; i5++) {
            try {
                var l = respState.eventListeners[i5];
                l.element.removeEventListener(l.type, l.handler);
            } catch (e5) {
                addLogMessage('stopResponsibilities: error removing listener: ' + e5, 'error');
            }
        }
        respState.eventListeners = [];
        respSetAriaBusyOff();
        var im = document.getElementById('resp-input-modal');
        if (im && im.parentNode) {
            im.parentNode.removeChild(im);
        }
        var pm = document.getElementById('resp-progress-modal');
        if (pm && pm.parentNode) {
            pm.parentNode.removeChild(pm);
        }
        var wm = document.getElementById('resp-warning-modal');
        if (wm && wm.parentNode) {
            wm.parentNode.removeChild(wm);
        }
        if (respState.focusReturnElement) {
            respState.focusReturnElement.focus();
        }
        resetRespState();
        addLogMessage('stopResponsibilities: cleanup complete', 'log');
    }

    const CB_SELECT_SELECTORS = {
        featureButtonTarget: '.main-gui-panel',
        presenceCheck: '.document-log-entries.document-log-entries__table',
        gridTable: '.document-log-entries__grid-table[role="table"]',
        row: 'log-entry-row[role="row"], .document-log-entries__grid-table__row[role="row"]',
        cell: '[role="cell"]',
        nameCellIndex: 3,
        namePrimary: '.u-text-overflow-ellipsis',
        nameFallback: '.test-logEntrySignature span',
        checkboxCellIndex: 1,
        checkboxInCell: '[role="checkbox"], .checkbox-icon',
        ariaLiveRegion: '.aria-live-region'
    };

    const CB_SELECT_TIMEOUTS = {
        waitInputPanelMs: 10000,
        waitProgressPanelMs: 10000,
        scanSettleMs: 250,
        idleBetweenBatchesMs: 140,
        clickSettleMs: 200,
        verifySettleMs: 200,
        maxScanDurationMs: 120000
    };

    const CB_SELECT_RETRY = {
        scanEmptyRetries: 2,
        clickRetries: 2,
        maxNoProgressIterations: 8
    };

    const CB_SELECT_SCROLL = {
        stepPx: 500,
        overscanPx: 400
    };

    const CB_SELECT_LABELS = {
        featureButton: 'Select Checkboxes',
        inputTitle: 'Select Checkboxes Input',
        progressTitle: 'Selecting Checkboxes',
        toggleSelectAll: 'Select All',
        statusPending: 'Pending',
        statusSelected: 'Selected',
        statusAlready: 'Already Checked',
        statusNotInTable: 'Not In Table',
        statusFailed: 'Failed',
        statusStrikethrough: 'Strikethrough',
        statusStopped: 'Stopped',
        parsing: 'Parsing input',
        scanning: 'Scanning table',
        selecting: 'Selecting checkboxes',
        done: 'Completed'
    };

    const CB_SELECT_COUNTERS = {
        total: 0,
        selected: 0,
        alreadyChecked: 0,
        notFound: 0,
        strikethrough: 0,
        failures: 0,
        pending: 0
    };

    const CB_SELECT_ATTRS = {
        ariaBusyTarget: 'body',
        ariaBusyAttr: 'aria-busy'
    };

    let cbSelectState = {
        isRunning: false,
        stopRequested: false,
        selectAllOn: false,
        observers: [],
        timeouts: [],
        intervals: [],
        eventListeners: [],
        idleCallbackIds: [],
        rafIds: [],
        parsedNames: [],
        scannedRows: [],
        seenNormalizedNames: new Set(),
        targets: [],
        targetIndex: 0,
        counters: { total: 0, selected: 0, alreadyChecked: 0, notFound: 0, failures: 0, pending: 0 },
        focusReturnElement: null,
        prevAriaBusy: null,
        scrollContainer: null,
        prevScrollTop: 0,
        userScrollHandler: null,
        userScrollPaused: false,
        lastAutoScrollTime: 0,
        leftPanelRowIndex: 0
    };

    function resetCbSelectState() {
        cbSelectState.isRunning = false;
        cbSelectState.stopRequested = false;
        cbSelectState.selectAllOn = false;
        cbSelectState.observers = [];
        cbSelectState.timeouts = [];
        cbSelectState.intervals = [];
        cbSelectState.eventListeners = [];
        cbSelectState.idleCallbackIds = [];
        cbSelectState.rafIds = [];
        cbSelectState.parsedNames = [];
        cbSelectState.scannedRows = [];
        cbSelectState.seenNormalizedNames = new Set();
        cbSelectState.targets = [];
        cbSelectState.targetIndex = 0;
        cbSelectState.counters = { total: 0, selected: 0, alreadyChecked: 0, notFound: 0, strikethrough: 0, failures: 0, pending: 0 };
        cbSelectState.prevAriaBusy = null;
        cbSelectState.scrollContainer = null;
        cbSelectState.prevScrollTop = 0;
        cbSelectState.userScrollHandler = null;
        cbSelectState.userScrollPaused = false;
        cbSelectState.lastAutoScrollTime = 0;
        cbSelectState.leftPanelRowIndex = 0;
    }

    function selectCheckboxesInit() {
        addLogMessage('selectCheckboxesInit: starting feature', 'log');
        cbSelectState.focusReturnElement = document.getElementById('cb-select-btn');
        resetCbSelectState();
        var presenceEl = document.querySelector(CB_SELECT_SELECTORS.presenceCheck);
        if (!presenceEl) {
            addLogMessage('selectCheckboxesInit: page check failed', 'warn');
            showCbSelectWarning();
            return;
        }
        addLogMessage('selectCheckboxesInit: page valid, showing input panel', 'log');
        showSelectCheckboxesInputPanel();
    }

    function showCbSelectWarning() {
        addLogMessage('showCbSelectWarning: creating warning popup', 'log');
        var modal = document.createElement('div');
        modal.id = 'cb-select-warning-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 30000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 450px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'alertdialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'cb-select-warning-title');
        container.setAttribute('aria-describedby', 'cb-select-warning-message');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        var title = document.createElement('h3');
        title.id = 'cb-select-warning-title';
        title.textContent = 'Document Log Not Found';
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close warning');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        var closeWarning = function() {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopCheckboxSelect();
        };
        closeButton.onclick = closeWarning;
        header.appendChild(title);
        header.appendChild(closeButton);
        var messageDiv = document.createElement('p');
        messageDiv.id = 'cb-select-warning-message';
        messageDiv.textContent = 'You are not on the Document Log page. Please navigate to a page with the Document Log Entries grid before using this feature.';
        messageDiv.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px; line-height: 1.5;';
        var okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; margin-top: 20px; width: 100%;';
        okButton.onmouseover = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        okButton.onmouseout = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        okButton.onclick = closeWarning;
        var keyHandler = function(e) {
            if (e.key === 'Escape') {
                closeWarning();
            }
        };
        document.addEventListener('keydown', keyHandler);
        cbSelectState.eventListeners.push({ element: document, type: 'keydown', handler: keyHandler });
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
        okButton.focus();
        addLogMessage('showCbSelectWarning: warning displayed', 'log');
    }

    function parseNamesInputForCheckboxSelect(text) {
        if (!text || !text.trim()) {
            return [];
        }
        var results = [];
        var seenKeys = new Set();
        var lines = text.split('\n');
        for (var li = 0; li < lines.length; li++) {
            var parts = lines[li].split(',');
            for (var pi = 0; pi < parts.length; pi++) {
                var name = parts[pi].trim().replace(/,+$/, '').trim();
                if (!name) {
                    continue;
                }
                name = name.replace(/\s+/g, ' ');
                var pairKey = normalizeFirstLastPair(name);
                if (!pairKey) {
                    continue;
                }
                if (seenKeys.has(pairKey)) {
                    continue;
                }
                seenKeys.add(pairKey);
                results.push({
                    display: name,
                    pairKey: pairKey,
                    status: CB_SELECT_LABELS.statusPending
                });
            }
        }
        return results;
    }

    function showSelectCheckboxesInputPanel() {
        addLogMessage('showSelectCheckboxesInputPanel: creating input panel', 'log');
        var modal = document.createElement('div');
        modal.id = 'cb-select-input-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 500px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'cb-select-input-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
        var titleEl = document.createElement('h3');
        titleEl.id = 'cb-select-input-title';
        titleEl.textContent = CB_SELECT_LABELS.inputTitle;
        titleEl.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600; letter-spacing: 0.2px;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close panel');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showSelectCheckboxesInputPanel: closed by user', 'warn');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopCheckboxSelect();
        };
        header.appendChild(titleEl);
        header.appendChild(closeButton);
        var description = document.createElement('p');
        description.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;';
        description.append("Rules:");
        description.appendChild(document.createElement('br'));
        var lines = [
            'Enter names to select their checkboxes in the Document Log. Separate names with commas or place each name on a new line.',
            'Use the Select All toggle to select all checkboxes instead.',
            'After clicking Confirm, do not click anywhere else on the page, as this will impact the process.'
        ];
        for (var i = 0; i < lines.length; i++) {
            description.appendChild(document.createTextNode('• ' + lines[i]));
            if (i < lines.length - 1) {
                description.appendChild(document.createElement('br'));
            }
        }
        var toggleContainer = document.createElement('div');
        toggleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 10px 14px; background: rgba(0, 0, 0, 0.15); border-radius: 8px;';
        var toggleLabel = document.createElement('span');
        toggleLabel.textContent = CB_SELECT_LABELS.toggleSelectAll;
        toggleLabel.style.cssText = 'color: white; font-size: 14px; font-weight: 500;';
        toggleLabel.id = 'cb-select-toggle-label';
        var toggleSwitch = document.createElement('button');
        toggleSwitch.id = 'cb-select-toggle';
        toggleSwitch.setAttribute('role', 'switch');
        toggleSwitch.setAttribute('aria-checked', 'false');
        toggleSwitch.setAttribute('aria-labelledby', 'cb-select-toggle-label');
        toggleSwitch.tabIndex = 0;
        toggleSwitch.style.cssText = 'position: relative; width: 48px; height: 26px; border-radius: 13px; border: 2px solid rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.15); cursor: pointer; transition: all 0.3s ease; padding: 0; flex-shrink: 0;';
        var toggleKnob = document.createElement('span');
        toggleKnob.style.cssText = 'position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.3s ease; pointer-events: none;';
        toggleSwitch.appendChild(toggleKnob);
        var selectAllOn = false;
        var textarea = document.createElement('textarea');
        textarea.id = 'cb-select-names-input';
        textarea.placeholder = 'Name1, Name2, Name3\nor\nName1\nName2\nName3';
        textarea.setAttribute('aria-label', 'Names input for checkbox selection');
        textarea.style.cssText = 'width: 100%; height: 160px; padding: 12px 14px; border: 2px solid rgba(255, 255, 255, 0.35); border-radius: 10px; background: rgba(255, 255, 255, 0.95); color: #1e293b; font-size: 14px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; resize: vertical; outline: none; transition: all 0.25s ease; box-shadow: 0 2px 0 rgba(0,0,0,0.04) inset; box-sizing: border-box;';
        textarea.onfocus = function() {
            textarea.style.borderColor = '#8ea0ff';
            textarea.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.25)';
        };
        textarea.onblur = function() {
            textarea.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            textarea.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04) inset';
        };
        var confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm';
        confirmButton.disabled = true;
        confirmButton.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; transition: all 0.25s ease; opacity: 0.5;';
        var updateConfirmState = function() {
            if (selectAllOn) {
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
                return;
            }
            var parsed = parseNamesInputForCheckboxSelect(textarea.value);
            if (parsed.length > 0) {
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
            } else {
                confirmButton.disabled = true;
                confirmButton.style.opacity = '0.5';
                confirmButton.style.cursor = 'not-allowed';
            }
        };
        textarea.oninput = updateConfirmState;
        toggleSwitch.onclick = function() {
            selectAllOn = !selectAllOn;
            toggleSwitch.setAttribute('aria-checked', String(selectAllOn));
            if (selectAllOn) {
                toggleSwitch.style.background = 'rgba(107, 207, 127, 0.6)';
                toggleSwitch.style.borderColor = 'rgba(107, 207, 127, 0.8)';
                toggleKnob.style.transform = 'translateX(22px)';
                textarea.disabled = true;
                textarea.style.opacity = '0.4';
                textarea.style.cursor = 'not-allowed';
            } else {
                toggleSwitch.style.background = 'rgba(255, 255, 255, 0.15)';
                toggleSwitch.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                toggleKnob.style.transform = 'translateX(0)';
                textarea.disabled = false;
                textarea.style.opacity = '1';
                textarea.style.cursor = 'text';
            }
            updateConfirmState();
        };
        toggleSwitch.onkeydown = function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggleSwitch.click();
            }
        };
        confirmButton.onmouseover = function() {
            if (!confirmButton.disabled) {
                confirmButton.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)';
            }
        };
        confirmButton.onmouseout = function() {
            confirmButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        };
        confirmButton.onclick = function() {
            addLogMessage('showSelectCheckboxesInputPanel: Confirm clicked, selectAll=' + selectAllOn, 'log');
            cbSelectState.selectAllOn = selectAllOn;
            if (!selectAllOn) {
                var parsed = parseNamesInputForCheckboxSelect(textarea.value);
                if (parsed.length === 0) {
                    addLogMessage('showSelectCheckboxesInputPanel: no valid names parsed', 'warn');
                    return;
                }
                cbSelectState.parsedNames = parsed;
                addLogMessage('showSelectCheckboxesInputPanel: parsed ' + parsed.length + ' names', 'log');
            } else {
                cbSelectState.parsedNames = [];
            }
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            cbSelectState.isRunning = true;
            beginCheckboxSelectionRun();
        };
        var clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All';
        clearButton.style.cssText = 'background: rgba(255, 255, 255, 0.18); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.25s ease;';
        clearButton.onmouseover = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.28)';
        };
        clearButton.onmouseout = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.18)';
        };
        clearButton.onclick = function() {
            addLogMessage('showSelectCheckboxesInputPanel: Clear All clicked', 'log');
            textarea.value = '';
            cbSelectState.parsedNames = [];
            updateConfirmState();
        };
        toggleContainer.appendChild(toggleLabel);
        toggleContainer.appendChild(toggleSwitch);
        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;';
        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(confirmButton);
        container.appendChild(header);
        container.appendChild(description);
        container.appendChild(toggleContainer);
        container.appendChild(textarea);
        container.appendChild(buttonContainer);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        textarea.focus();
        addLogMessage('showSelectCheckboxesInputPanel: input panel displayed', 'log');
    }

    function openCheckboxSelectProgressPanel() {
        addLogMessage('openCheckboxSelectProgressPanel: creating progress panel', 'log');
        var modal = document.createElement('div');
        modal.id = 'cb-select-progress-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.id = 'cb-select-progress-container';
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 900px; max-width: 95%; max-height: 80vh; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative; display: flex; flex-direction: column;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'cb-select-progress-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0;';
        var titleContainer = document.createElement('div');
        titleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
        var title = document.createElement('h3');
        title.id = 'cb-select-progress-title';
        title.textContent = CB_SELECT_LABELS.progressTitle;
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var statusBadge = document.createElement('span');
        statusBadge.id = 'cb-select-status-badge';
        statusBadge.textContent = 'In Progress';
        statusBadge.style.cssText = 'background: rgba(255, 255, 255, 0.3); color: #ffd93d; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
        titleContainer.appendChild(title);
        titleContainer.appendChild(statusBadge);
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close and stop');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('openCheckboxSelectProgressPanel: closed by user', 'warn');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopCheckboxSelect();
        };
        header.appendChild(titleContainer);
        header.appendChild(closeButton);
        var panelsContainer = document.createElement('div');
        panelsContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; overflow: hidden;';
        var leftPanel = createSubpanel('Scanned Log Entries', 'cb-select-left-panel', 'cb-select-left-search');
        var rightPanel = createSubpanel('Checkbox Selection Status', 'cb-select-right-panel', 'cb-select-right-search');
        panelsContainer.appendChild(leftPanel);
        panelsContainer.appendChild(rightPanel);
        var summaryFooter = document.createElement('div');
        summaryFooter.id = 'cb-select-summary-footer';
        summaryFooter.setAttribute('aria-label', 'Selection summary');
        summaryFooter.style.cssText = 'display: flex; justify-content: space-around; align-items: center; padding: 10px 16px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; margin-top: 12px; flex-shrink: 0;';
        var summaryItems = [
            { id: 'cb-select-summary-total', label: 'Total', value: '0' },
            { id: 'cb-select-summary-selected', label: 'Selected', value: '0' },
            { id: 'cb-select-summary-already', label: 'Already', value: '0' },
            { id: 'cb-select-summary-notfound', label: 'Not Found', value: '0' },
            { id: 'cb-select-summary-strikethrough', label: 'Strikethrough', value: '0' },
            { id: 'cb-select-summary-failures', label: 'Failed', value: '0' },
            { id: 'cb-select-summary-pending', label: 'Pending', value: '0' },
            { id: 'cb-select-summary-percent', label: 'Progress', value: '0%' }
        ];
        for (var si = 0; si < summaryItems.length; si++) {
            var sItem = document.createElement('div');
            sItem.style.cssText = 'text-align: center;';
            var vSpan = document.createElement('span');
            vSpan.id = summaryItems[si].id;
            vSpan.textContent = summaryItems[si].value;
            vSpan.style.cssText = 'display: block; color: white; font-size: 16px; font-weight: 700;';
            var lSpan = document.createElement('span');
            lSpan.textContent = summaryItems[si].label;
            lSpan.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.6); font-size: 11px; font-weight: 500; margin-top: 2px;';
            sItem.appendChild(vSpan);
            sItem.appendChild(lSpan);
            summaryFooter.appendChild(sItem);
        }
        var ariaLiveRegion = document.createElement('div');
        ariaLiveRegion.id = 'cb-select-aria-live';
        ariaLiveRegion.setAttribute('aria-live', 'polite');
        ariaLiveRegion.setAttribute('aria-atomic', 'true');
        ariaLiveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        container.appendChild(header);
        container.appendChild(panelsContainer);
        container.appendChild(summaryFooter);
        container.appendChild(ariaLiveRegion);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        closeButton.focus();
        addLogMessage('openCheckboxSelectProgressPanel: displayed', 'log');
    }

    function cbStripEmailAndCleanName(rawName) {
        if (!rawName) {
            return '';
        }
        var cleaned = rawName.replace(/\S+@\S+\.\S+/g, '').trim();
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }

    function mapRowToNameAndCheckbox(rowEl) {
        try {
            var cells = rowEl.querySelectorAll(CB_SELECT_SELECTORS.cell);
            if (cells.length <= CB_SELECT_SELECTORS.nameCellIndex) {
                return null;
            }
            var nameCell = cells[CB_SELECT_SELECTORS.nameCellIndex];
            var extractedName = null;
            var primaryEl = nameCell.querySelector(CB_SELECT_SELECTORS.namePrimary);
            if (primaryEl) {
                extractedName = primaryEl.textContent.trim().replace(/\s+/g, ' ');
            }
            if (!extractedName) {
                var fallbackEl = nameCell.querySelector(CB_SELECT_SELECTORS.nameFallback);
                if (fallbackEl) {
                    extractedName = fallbackEl.textContent.trim().replace(/\s+/g, ' ');
                }
            }
            if (!extractedName) {
                return null;
            }
            var cleanedName = cbStripEmailAndCleanName(extractedName);
            if (!cleanedName) {
                return null;
            }
            var checkboxEl = null;
            if (cells.length > CB_SELECT_SELECTORS.checkboxCellIndex) {
                var cbCell = cells[CB_SELECT_SELECTORS.checkboxCellIndex];
                checkboxEl = cbCell.querySelector(CB_SELECT_SELECTORS.checkboxInCell);
            }
            var isChecked = false;
            if (checkboxEl) {
                var ariaChecked = checkboxEl.getAttribute('aria-checked');
                if (ariaChecked === 'true') {
                    isChecked = true;
                } else if (checkboxEl.classList && checkboxEl.classList.contains('checkbox-icon--selected')) {
                    isChecked = true;
                }
            }
            return {
                display: cleanedName,
                pairKey: normalizeFirstLastPair(cleanedName),
                checkboxEl: checkboxEl,
                checked: isChecked,
                rowEl: rowEl
            };
        } catch (err) {
            return null;
        }
    }

    function cbScanVisibleRows(gridTable) {
        var rows = gridTable.querySelectorAll(CB_SELECT_SELECTORS.row);
        var leftPanel = document.getElementById('cb-select-left-panel');
        var fragment = document.createDocumentFragment();
        var newCount = 0;
        for (var ri = 0; ri < rows.length; ri++) {
            var row = rows[ri];
            if (row.getAttribute('role') === 'columnheader') {
                continue;
            }
            var mapped = mapRowToNameAndCheckbox(row);
            if (!mapped) {
                continue;
            }
            var normKey = elogNormalizeName(mapped.display);
            if (cbSelectState.seenNormalizedNames.has(normKey)) {
                continue;
            }
            cbSelectState.seenNormalizedNames.add(normKey);
            cbSelectState.scannedRows.push(mapped);
            newCount++;
            cbSelectState.leftPanelRowIndex++;
            if (leftPanel) {
                var item = createListItem(mapped.display, null, null, cbSelectState.leftPanelRowIndex);
                fragment.appendChild(item);
            }
        }
        if (leftPanel && fragment.childNodes.length > 0) {
            leftPanel.appendChild(fragment);
        }
        return newCount;
    }

    function cbGetRenderedRowCount(gridTable) {
        var rows = gridTable.querySelectorAll(CB_SELECT_SELECTORS.row);
        var count = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                count++;
            }
        }
        return count;
    }

    function cbGetRenderedLastRowKey(gridTable) {
        var rows = gridTable.querySelectorAll(CB_SELECT_SELECTORS.row);
        var lastDataRow = null;
        for (var i = rows.length - 1; i >= 0; i--) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                lastDataRow = rows[i];
                break;
            }
        }
        if (!lastDataRow) {
            return '';
        }
        var cells = lastDataRow.querySelectorAll(CB_SELECT_SELECTORS.cell);
        if (cells.length > 0) {
            var txt = cells[0].textContent.trim();
            if (txt) {
                return txt;
            }
        }
        var hash = 0;
        var content = lastDataRow.textContent || '';
        for (var ci = 0; ci < content.length; ci++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(ci);
            hash = hash & hash;
        }
        return 'hash_' + hash;
    }

    function cbAwaitSettle(gridTable) {
        return new Promise(function(resolve) {
            var resolved = false;
            var observer = null;
            var timeoutId = setTimeout(function() {
                if (!resolved) {
                    resolved = true;
                    if (observer) {
                        observer.disconnect();
                        var idx = cbSelectState.observers.indexOf(observer);
                        if (idx > -1) {
                            cbSelectState.observers.splice(idx, 1);
                        }
                    }
                    resolve();
                }
            }, CB_SELECT_TIMEOUTS.scanSettleMs);
            cbSelectState.timeouts.push(timeoutId);
            if (gridTable) {
                observer = new MutationObserver(function() {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        observer.disconnect();
                        var idx = cbSelectState.observers.indexOf(observer);
                        if (idx > -1) {
                            cbSelectState.observers.splice(idx, 1);
                        }
                        resolve();
                    }
                });
                observer.observe(gridTable, { childList: true, subtree: true });
                cbSelectState.observers.push(observer);
            }
        });
    }

    function cbObserveUserScrollPause(container) {
        if (!container || cbSelectState.userScrollHandler) {
            return;
        }
        cbSelectState.userScrollHandler = function() {
            var timeSinceAuto = Date.now() - cbSelectState.lastAutoScrollTime;
            if (timeSinceAuto > 50 && !cbSelectState.userScrollPaused) {
                cbSelectState.userScrollPaused = true;
                var resumeTimeout = setTimeout(function() {
                    cbSelectState.userScrollPaused = false;
                }, 800);
                cbSelectState.timeouts.push(resumeTimeout);
            }
        };
        container.addEventListener('scroll', cbSelectState.userScrollHandler);
        cbSelectState.eventListeners.push({ element: container, type: 'scroll', handler: cbSelectState.userScrollHandler });
    }

    function enqueueTargets(selectAllOn, parsedNames, discoveredRows) {
        addLogMessage('enqueueTargets: selectAll=' + selectAllOn + ' parsed=' + parsedNames.length + ' discovered=' + discoveredRows.length, 'log');
        var targets = [];
        var seenKeys = new Set();
        if (selectAllOn) {
            for (var di = 0; di < discoveredRows.length; di++) {
                var row = discoveredRows[di];
                if (seenKeys.has(row.pairKey)) {
                    continue;
                }
                seenKeys.add(row.pairKey);
                targets.push({
                    display: row.display,
                    pairKey: row.pairKey,
                    status: CB_SELECT_LABELS.statusPending,
                    checkboxEl: row.checkboxEl,
                    checked: row.checked,
                    rowEl: row.rowEl
                });
            }
        } else {
            var discoveredMap = new Map();
            for (var ri = 0; ri < discoveredRows.length; ri++) {
                if (!discoveredMap.has(discoveredRows[ri].pairKey)) {
                    discoveredMap.set(discoveredRows[ri].pairKey, discoveredRows[ri]);
                }
            }
            for (var pi = 0; pi < parsedNames.length; pi++) {
                var parsed = parsedNames[pi];
                if (seenKeys.has(parsed.pairKey)) {
                    continue;
                }
                seenKeys.add(parsed.pairKey);
                var match = discoveredMap.get(parsed.pairKey);
                if (match) {
                    targets.push({
                        display: parsed.display,
                        pairKey: parsed.pairKey,
                        status: CB_SELECT_LABELS.statusPending,
                        checkboxEl: match.checkboxEl,
                        checked: match.checked,
                        rowEl: match.rowEl
                    });
                } else {
                    targets.push({
                        display: parsed.display,
                        pairKey: parsed.pairKey,
                        status: CB_SELECT_LABELS.statusNotInTable,
                        checkboxEl: null,
                        checked: false,
                        rowEl: null
                    });
                }
            }
        }
        addLogMessage('enqueueTargets: built ' + targets.length + ' targets', 'log');
        return targets;
    }

    function selectCheckboxForRow(target, attempt, callback) {
        if (!target.checkboxEl || !target.checkboxEl.isConnected) {
            callback(false);
            return;
        }
        if (target.checkboxEl.disabled || target.checkboxEl.getAttribute('aria-disabled') === 'true') {
            callback(false);
            return;
        }
        try {
            target.checkboxEl.click();
        } catch (err) {
            addLogMessage('selectCheckboxForRow: click error: ' + err, 'error');
            if (attempt < CB_SELECT_RETRY.clickRetries) {
                var tid = setTimeout(function() {
                    selectCheckboxForRow(target, attempt + 1, callback);
                }, CB_SELECT_TIMEOUTS.clickSettleMs);
                cbSelectState.timeouts.push(tid);
                return;
            }
            callback(false);
            return;
        }
        var verifyTid = setTimeout(function() {
            var ariaChecked = target.checkboxEl.getAttribute('aria-checked');
            if (ariaChecked === 'true') {
                callback(true);
                return;
            }
            if (target.checkboxEl.classList && target.checkboxEl.classList.contains('checkbox-icon--selected')) {
                callback(true);
                return;
            }
            if (attempt < CB_SELECT_RETRY.clickRetries) {
                selectCheckboxForRow(target, attempt + 1, callback);
                return;
            }
            callback(false);
        }, CB_SELECT_TIMEOUTS.verifySettleMs);
        cbSelectState.timeouts.push(verifyTid);
    }

    function cbUpdateRightPanelStatus(pairKey, newStatus) {
        var rightPanel = document.getElementById('cb-select-right-panel');
        if (!rightPanel) {
            return;
        }
        var items = rightPanel.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var itemPairKey = item.getAttribute('data-pairkey');
            if (itemPairKey === pairKey) {
                var badge = item.querySelector('.elog-status-badge');
                if (badge) {
                    badge.textContent = newStatus;
                    var badgeColor = 'rgba(255, 255, 255, 0.7)';
                    var badgeBg = 'rgba(255, 255, 255, 0.1)';
                    if (newStatus === CB_SELECT_LABELS.statusPending) {
                        badgeColor = '#ffd93d';
                        badgeBg = 'rgba(255, 217, 61, 0.2)';
                    } else if (newStatus === CB_SELECT_LABELS.statusSelected) {
                        badgeColor = '#6bcf7f';
                        badgeBg = 'rgba(107, 207, 127, 0.2)';
                    } else if (newStatus === CB_SELECT_LABELS.statusAlready) {
                        badgeColor = '#64b5f6';
                        badgeBg = 'rgba(100, 181, 246, 0.2)';
                    } else if (newStatus === CB_SELECT_LABELS.statusNotInTable) {
                        badgeColor = '#ff6b6b';
                        badgeBg = 'rgba(255, 107, 107, 0.2)';
                    } else if (newStatus === CB_SELECT_LABELS.statusFailed) {
                        badgeColor = '#ff6b6b';
                        badgeBg = 'rgba(255, 107, 107, 0.2)';
                    } else if (newStatus === CB_SELECT_LABELS.statusStopped) {
                        badgeColor = '#ffa500';
                        badgeBg = 'rgba(255, 165, 0, 0.2)';
                    }
                    badge.style.color = badgeColor;
                    badge.style.background = badgeBg;
                }
                break;
            }
        }
    }

    function cbUpdateRightPanelSummary() {
        var c = cbSelectState.counters;
        var el1 = document.getElementById('cb-select-summary-total');
        var el2 = document.getElementById('cb-select-summary-selected');
        var el3 = document.getElementById('cb-select-summary-already');
        var el4 = document.getElementById('cb-select-summary-notfound');
        var el5 = document.getElementById('cb-select-summary-failures');
        var elStrike = document.getElementById('cb-select-summary-strikethrough');
        var el6 = document.getElementById('cb-select-summary-pending');
        var el7 = document.getElementById('cb-select-summary-percent');
        if (el1) {
            el1.textContent = String(c.total);
        }
        if (el2) {
            el2.textContent = String(c.selected);
        }
        if (el3) {
            el3.textContent = String(c.alreadyChecked);
        }
        if (el4) {
            el4.textContent = String(c.notFound);
        }
        if (el5) {
            el5.textContent = String(c.failures);
        }
        if (elStrike) {
            elStrike.textContent = String(c.strikethrough);
        }
        if (el6) {
            el6.textContent = String(c.pending);
        }
        if (el7) {
            var processed = c.selected + c.alreadyChecked + c.notFound + c.strikethrough + c.failures;
            var pct = c.total > 0 ? Math.round((processed / c.total) * 100) : 0;
            el7.textContent = pct + '%';
        }
    }

    function cbUpdateAriaLive(message) {
        var lr = document.getElementById('cb-select-aria-live');
        if (lr) {
            lr.textContent = message;
        }
    }

    function cbSetAriaBusyOn() {
        var target = document.querySelector(CB_SELECT_ATTRS.ariaBusyTarget);
        if (target) {
            cbSelectState.prevAriaBusy = target.getAttribute(CB_SELECT_ATTRS.ariaBusyAttr);
            target.setAttribute(CB_SELECT_ATTRS.ariaBusyAttr, 'true');
        }
    }

    function cbSetAriaBusyOff() {
        var target = document.querySelector(CB_SELECT_ATTRS.ariaBusyTarget);
        if (target) {
            if (cbSelectState.prevAriaBusy !== null) {
                target.setAttribute(CB_SELECT_ATTRS.ariaBusyAttr, cbSelectState.prevAriaBusy);
            } else {
                target.removeAttribute(CB_SELECT_ATTRS.ariaBusyAttr);
            }
            cbSelectState.prevAriaBusy = null;
        }
    }

    function beginCheckboxSelectionRun() {
        addLogMessage('beginCheckboxSelectionRun: starting scan', 'log');
        openCheckboxSelectProgressPanel();
        cbSetAriaBusyOn();
        cbUpdateAriaLive('Scan started');
        if (!cbSelectState.selectAllOn) {
            var rightPanel = document.getElementById('cb-select-right-panel');
            if (rightPanel) {
                rightPanel.innerHTML = '';
                for (var ni = 0; ni < cbSelectState.parsedNames.length; ni++) {
                    var nameObj = cbSelectState.parsedNames[ni];
                    var item = createListItem(nameObj.display, CB_SELECT_LABELS.statusPending, 'pending', ni + 1);
                    item.setAttribute('data-pairkey', nameObj.pairKey);
                    rightPanel.appendChild(item);
                }
            }
            cbSelectState.counters.total = cbSelectState.parsedNames.length;
            cbSelectState.counters.pending = cbSelectState.parsedNames.length;
            cbUpdateRightPanelSummary();
        }
        var gridTable = document.querySelector(CB_SELECT_SELECTORS.gridTable);
        if (!gridTable) {
            addLogMessage('beginCheckboxSelectionRun: grid table not found', 'error');
            cbSetAriaBusyOff();
            var badge = document.getElementById('cb-select-status-badge');
            if (badge) {
                badge.textContent = 'Error';
                badge.style.color = '#ff6b6b';
            }
            cbUpdateAriaLive('Grid table not found');
            return;
        }
        var scrollContainer = findScrollableContainer(gridTable);
        if (!scrollContainer) {
            addLogMessage('beginCheckboxSelectionRun: scrollable container not found', 'error');
            cbSetAriaBusyOff();
            return;
        }
        cbSelectState.scrollContainer = scrollContainer;
        cbSelectState.prevScrollTop = scrollContainer.scrollTop;
        cbSelectState.seenNormalizedNames = new Set();
        cbSelectState.scannedRows = [];
        cbSelectState.leftPanelRowIndex = 0;
        cbObserveUserScrollPause(scrollContainer);
        var startTime = Date.now();
        var noProgress = 0;
        var prevScrollHeight = scrollContainer.scrollHeight;
        function initialScan() {
            cbScanVisibleRows(gridTable);
            prevScrollHeight = scrollContainer.scrollHeight;
            var initScrollTimeout = setTimeout(scrollLoop, CB_SELECT_TIMEOUTS.idleBetweenBatchesMs);
            cbSelectState.timeouts.push(initScrollTimeout);
        }
        function scrollLoop() {
            if (cbSelectState.stopRequested || !cbSelectState.isRunning) {
                finishScan('stopped');
                return;
            }
            if (Date.now() - startTime > CB_SELECT_TIMEOUTS.maxScanDurationMs) {
                finishScan('timeout');
                return;
            }
            if (cbSelectState.userScrollPaused) {
                var pt = setTimeout(scrollLoop, 100);
                cbSelectState.timeouts.push(pt);
                return;
            }
            var currentScrollHeight = scrollContainer.scrollHeight;
            if (currentScrollHeight > prevScrollHeight) {
                addLogMessage('beginCheckboxSelectionRun: scrollHeight grew from ' + prevScrollHeight + ' to ' + currentScrollHeight + ', resetting noProgress', 'log');
                noProgress = 0;
                prevScrollHeight = currentScrollHeight;
            }
            var priorKey = cbGetRenderedLastRowKey(gridTable);
            var priorCount = cbGetRenderedRowCount(gridTable);
            var currTop = scrollContainer.scrollTop;
            var maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
            var newTop = Math.min(currTop + CB_SELECT_SCROLL.stepPx, maxScroll);
            cbSelectState.lastAutoScrollTime = Date.now();
            scrollContainer.scrollTo({ top: newTop, behavior: 'auto' });
            cbAwaitSettle(gridTable).then(function() {
                var attempts = 0;
                function attemptScan() {
                    var rc = cbGetRenderedRowCount(gridTable);
                    if (rc === 0 && attempts < CB_SELECT_RETRY.scanEmptyRetries) {
                        attempts++;
                        var rt = setTimeout(attemptScan, CB_SELECT_TIMEOUTS.scanSettleMs);
                        cbSelectState.timeouts.push(rt);
                        return;
                    }
                    cbScanVisibleRows(gridTable);
                    var currKey = cbGetRenderedLastRowKey(gridTable);
                    var currCount = cbGetRenderedRowCount(gridTable);
                    var postScrollHeight = scrollContainer.scrollHeight;
                    if (postScrollHeight > prevScrollHeight) {
                        addLogMessage('beginCheckboxSelectionRun: scrollHeight grew after scan from ' + prevScrollHeight + ' to ' + postScrollHeight + ', resetting noProgress', 'log');
                        noProgress = 0;
                        prevScrollHeight = postScrollHeight;
                    } else if (currKey === priorKey && currCount === priorCount) {
                        noProgress++;
                    } else {
                        noProgress = 0;
                    }
                    var atBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 1;
                    if (atBottom && noProgress >= 3) {
                        finishScan('endReached');
                        return;
                    }
                    if (noProgress >= CB_SELECT_RETRY.maxNoProgressIterations) {
                        finishScan('noProgress');
                        return;
                    }
                    if (typeof requestIdleCallback === 'function') {
                        var icbId = requestIdleCallback(function() {
                            var idx = cbSelectState.idleCallbackIds.indexOf(icbId);
                            if (idx > -1) {
                                cbSelectState.idleCallbackIds.splice(idx, 1);
                            }
                            scrollLoop();
                        }, { timeout: CB_SELECT_TIMEOUTS.idleBetweenBatchesMs * 2 });
                        cbSelectState.idleCallbackIds.push(icbId);
                    } else {
                        var it = setTimeout(scrollLoop, CB_SELECT_TIMEOUTS.idleBetweenBatchesMs);
                        cbSelectState.timeouts.push(it);
                    }
                }
                attemptScan();
            });
        }
        function finishScan(reason) {
            addLogMessage('beginCheckboxSelectionRun: scan done reason=' + reason + ' scanned=' + cbSelectState.scannedRows.length, 'log');
            cbUpdateAriaLive('Scan complete, found ' + cbSelectState.scannedRows.length + ' rows');
            var targets = enqueueTargets(cbSelectState.selectAllOn, cbSelectState.parsedNames, cbSelectState.scannedRows);
            cbSelectState.targets = targets;
            cbSelectState.targetIndex = 0;
            if (cbSelectState.selectAllOn) {
                var rPanel = document.getElementById('cb-select-right-panel');
                if (rPanel) {
                    rPanel.innerHTML = '';
                    for (var ti = 0; ti < targets.length; ti++) {
                        var tItem = createListItem(targets[ti].display, CB_SELECT_LABELS.statusPending, 'pending', ti + 1);
                        tItem.setAttribute('data-pairkey', targets[ti].pairKey);
                        rPanel.appendChild(tItem);
                    }
                }
            } else {
                for (var ti2 = 0; ti2 < targets.length; ti2++) {
                    if (targets[ti2].status === CB_SELECT_LABELS.statusNotInTable) {
                        cbUpdateRightPanelStatus(targets[ti2].pairKey, CB_SELECT_LABELS.statusNotInTable);
                    }
                }
            }
            var pendingCount = 0;
            var notFoundCount = 0;
            for (var ci = 0; ci < targets.length; ci++) {
                if (targets[ci].status === CB_SELECT_LABELS.statusPending) {
                    pendingCount++;
                } else if (targets[ci].status === CB_SELECT_LABELS.statusNotInTable) {
                    notFoundCount++;
                }
            }
            cbSelectState.counters.total = targets.length;
            cbSelectState.counters.pending = pendingCount;
            cbSelectState.counters.notFound = notFoundCount;
            cbUpdateRightPanelSummary();
            if (cbSelectState.scrollContainer && cbSelectState.prevScrollTop !== undefined) {
                cbSelectState.scrollContainer.scrollTo({ top: cbSelectState.prevScrollTop, behavior: 'auto' });
            }
            if (pendingCount > 0) {
                addLogMessage('beginCheckboxSelectionRun: starting selection for ' + pendingCount + ' entries', 'log');
                cbUpdateAriaLive('Starting checkbox selection for ' + pendingCount + ' entries');
                processNextCheckboxTarget();
            } else {
                finishRun();
            }
        }
        function processNextCheckboxTarget() {
            if (cbSelectState.stopRequested || !cbSelectState.isRunning) {
                markRemainingStopped();
                finishRun();
                return;
            }
            var target = null;
            while (cbSelectState.targetIndex < cbSelectState.targets.length) {
                var candidate = cbSelectState.targets[cbSelectState.targetIndex];
                if (candidate.status === CB_SELECT_LABELS.statusPending) {
                    target = candidate;
                    break;
                }
                cbSelectState.targetIndex++;
            }
            if (!target) {
                finishRun();
                return;
            }
            if (target.checked || (target.checkboxEl && target.checkboxEl.getAttribute('aria-checked') === 'true')) {
                target.status = CB_SELECT_LABELS.statusAlready;
                cbSelectState.counters.alreadyChecked++;
                cbSelectState.counters.pending--;
                cbUpdateRightPanelStatus(target.pairKey, CB_SELECT_LABELS.statusAlready);
                cbUpdateRightPanelSummary();
                cbSelectState.targetIndex++;
                var tid1 = setTimeout(processNextCheckboxTarget, 20);
                cbSelectState.timeouts.push(tid1);
                return;
            }
            if (target.rowEl && target.rowEl.querySelector('.log-entry--struckThrough')) {
                addLogMessage('processNextCheckboxTarget: skipping strikethrough entry: ' + target.display, 'log');
                target.status = CB_SELECT_LABELS.statusStrikethrough;
                cbSelectState.counters.strikethrough++;
                cbSelectState.counters.pending--;
                cbUpdateRightPanelStatus(target.pairKey, CB_SELECT_LABELS.statusStrikethrough);
                cbUpdateRightPanelSummary();
                cbSelectState.targetIndex++;
                var tidStrike = setTimeout(processNextCheckboxTarget, 20);
                cbSelectState.timeouts.push(tidStrike);
                return;
            }
            selectCheckboxForRow(target, 0, function(success) {
                if (success) {
                    target.status = CB_SELECT_LABELS.statusSelected;
                    cbSelectState.counters.selected++;
                    cbSelectState.counters.pending--;
                    cbUpdateRightPanelStatus(target.pairKey, CB_SELECT_LABELS.statusSelected);
                } else {
                    target.status = CB_SELECT_LABELS.statusFailed;
                    cbSelectState.counters.failures++;
                    cbSelectState.counters.pending--;
                    cbUpdateRightPanelStatus(target.pairKey, CB_SELECT_LABELS.statusFailed);
                }
                cbUpdateRightPanelSummary();
                cbSelectState.targetIndex++;
                var tid2 = setTimeout(processNextCheckboxTarget, CB_SELECT_TIMEOUTS.clickSettleMs);
                cbSelectState.timeouts.push(tid2);
            });
        }
        function markRemainingStopped() {
            for (var si2 = cbSelectState.targetIndex; si2 < cbSelectState.targets.length; si2++) {
                if (cbSelectState.targets[si2].status === CB_SELECT_LABELS.statusPending) {
                    cbSelectState.targets[si2].status = CB_SELECT_LABELS.statusStopped;
                    cbSelectState.counters.pending--;
                    cbUpdateRightPanelStatus(cbSelectState.targets[si2].pairKey, CB_SELECT_LABELS.statusStopped);
                }
            }
            cbUpdateRightPanelSummary();
        }
        function finishRun() {
            addLogMessage('beginCheckboxSelectionRun: finished - selected=' + cbSelectState.counters.selected + ' already=' + cbSelectState.counters.alreadyChecked + ' failed=' + cbSelectState.counters.failures + ' notFound=' + cbSelectState.counters.notFound, 'log');
            cbSetAriaBusyOff();
            var badge = document.getElementById('cb-select-status-badge');
            if (badge) {
                badge.textContent = CB_SELECT_LABELS.done;
                badge.style.color = '#6bcf7f';
            }
            var titleEl = document.getElementById('cb-select-progress-title');
            if (titleEl) {
                titleEl.textContent = CB_SELECT_LABELS.progressTitle + ' - Complete';
            }
            cbUpdateAriaLive('Selection complete. Selected: ' + cbSelectState.counters.selected + ', Already checked: ' + cbSelectState.counters.alreadyChecked + ', Not found: ' + cbSelectState.counters.notFound + ', Failed: ' + cbSelectState.counters.failures);
            cbSelectState.isRunning = false;
        }
        function waitForStableScrollHeight(callback) {
            var checks = 0;
            var maxChecks = 5;
            var lastHeight = scrollContainer.scrollHeight;
            var stableCount = 0;
            function checkHeight() {
                if (!cbSelectState.isRunning) { return; }
                var currentHeight = scrollContainer.scrollHeight;
                if (currentHeight === lastHeight) {
                    stableCount++;
                } else {
                    addLogMessage('beginCheckboxSelectionRun: scrollHeight changed from ' + lastHeight + ' to ' + currentHeight + ' during stabilization', 'log');
                    stableCount = 0;
                    lastHeight = currentHeight;
                }
                checks++;
                if (stableCount >= 2 || checks >= maxChecks) {
                    addLogMessage('beginCheckboxSelectionRun: scrollHeight stabilized at ' + currentHeight + ' after ' + checks + ' checks', 'log');
                    callback();
                    return;
                }
                var tid = setTimeout(checkHeight, 500);
                cbSelectState.timeouts.push(tid);
            }
            var tid = setTimeout(checkHeight, 500);
            cbSelectState.timeouts.push(tid);
        }
        waitForStableScrollHeight(function() {
            initialScan();
        });
    }

    function stopCheckboxSelect() {
        addLogMessage('stopCheckboxSelect: stopping', 'log');
        cbSelectState.isRunning = false;
        cbSelectState.stopRequested = true;
        for (var i = 0; i < cbSelectState.idleCallbackIds.length; i++) {
            if (typeof cancelIdleCallback === 'function') {
                cancelIdleCallback(cbSelectState.idleCallbackIds[i]);
            }
        }
        cbSelectState.idleCallbackIds = [];
        for (var i2 = 0; i2 < cbSelectState.rafIds.length; i2++) {
            cancelAnimationFrame(cbSelectState.rafIds[i2]);
        }
        cbSelectState.rafIds = [];
        for (var i3 = 0; i3 < cbSelectState.observers.length; i3++) {
            try {
                cbSelectState.observers[i3].disconnect();
            } catch (e) {
                addLogMessage('stopCheckboxSelect: error disconnecting observer: ' + e, 'error');
            }
        }
        cbSelectState.observers = [];
        for (var i4 = 0; i4 < cbSelectState.timeouts.length; i4++) {
            try {
                clearTimeout(cbSelectState.timeouts[i4]);
            } catch (e2) {
                addLogMessage('stopCheckboxSelect: error clearing timeout: ' + e2, 'error');
            }
        }
        cbSelectState.timeouts = [];
        for (var i5 = 0; i5 < cbSelectState.intervals.length; i5++) {
            try {
                clearInterval(cbSelectState.intervals[i5]);
            } catch (e3) {
                addLogMessage('stopCheckboxSelect: error clearing interval: ' + e3, 'error');
            }
        }
        cbSelectState.intervals = [];
        for (var i6 = 0; i6 < cbSelectState.eventListeners.length; i6++) {
            try {
                var l = cbSelectState.eventListeners[i6];
                l.element.removeEventListener(l.type, l.handler);
            } catch (e4) {
                addLogMessage('stopCheckboxSelect: error removing listener: ' + e4, 'error');
            }
        }
        cbSelectState.eventListeners = [];
        cbSetAriaBusyOff();
        var inputModal = document.getElementById('cb-select-input-modal');
        if (inputModal && inputModal.parentNode) {
            inputModal.parentNode.removeChild(inputModal);
        }
        var progressModal = document.getElementById('cb-select-progress-modal');
        if (progressModal && progressModal.parentNode) {
            progressModal.parentNode.removeChild(progressModal);
        }
        var warningModal = document.getElementById('cb-select-warning-modal');
        if (warningModal && warningModal.parentNode) {
            warningModal.parentNode.removeChild(warningModal);
        }
        if (cbSelectState.focusReturnElement) {
            cbSelectState.focusReturnElement.focus();
        }
        resetCbSelectState();
        addLogMessage('stopCheckboxSelect: cleanup complete', 'log');
    }


    const SSIG_SELECTORS = {
        featureButtonTarget: '.main-gui-panel',
        presenceCheck: '.document-log-entries__grid-table[role="table"], .document-log-entries__grid-table.w-100',
        mainTableContainer: '.document-log-entries.document-log-entries__table',
        gridTable: '.document-log-entries__grid-table[role="table"], .document-log-entries__grid-table.w-100',
        row: 'log-entry-row[role="row"], .document-log-entries__grid-table__row[role="row"]',
        cell: '[role="cell"]',
        headerRow: '[role="columnheader"]',
        checkboxCellIndex: 1,
        checkboxInCell: '[role="checkbox"], .checkbox-icon',
        nameCellIndex: 3,
        namePrimary: '.u-text-overflow-ellipsis',
        nameFallback: '.test-logEntrySignature span',
        staffSigColIndex: 7,
        piSigColIndex: 8,
        sigSignedBlock: '.test-logEntrySignature',
        sigSignedName: '.test-logEntrySignature span, .u-text-overflow-ellipsis span, .u-text-overflow-ellipsis',
        sigUnsignedBlock: '.entry-signature',
        progressAriaLive: '.aria-live-region'
    };

    const SSIG_TIMEOUTS = {
        waitProgressPanelMs: 10000,
        waitTableMs: 10000,
        waitGridMs: 10000,
        settleScanMs: 250,
        idleBetweenBatchesMs: 140,
        clickSettleMs: 200,
        verifySettleMs: 200,
        maxScanDurationMs: 120000
    };

    const SSIG_RETRY = {
        scanEmptyRetries: 2,
        clickRetries: 2,
        maxNoProgressIterations: 8
    };

    const SSIG_SCROLL = {
        stepPx: 500,
        overscanPx: 400
    };

    const SSIG_LABELS = {
        featureButton: 'Select Signed Checkbox',
        progressTitle: 'Select Signed Checkbox',
        scanning: 'Scanning table',
        selecting: 'Selecting eligible rows',
        statusPending: 'Pending',
        statusSelected: 'Selected',
        statusAlready: 'Already Checked',
        statusPISigned: 'Skipped (PI Signed)',
        statusNotEligible: 'Skipped (Unsigned Staff/Blocked)',
        statusFailed: 'Failed',
        statusStrikethrough: 'Strikethrough',
        statusStopped: 'Stopped',
        done: 'Completed'
    };

    const SSIG_COUNTERS = {
        total: 0,
        selected: 0,
        already: 0,
        skippedPISigned: 0,
        skippedNotEligible: 0,
        strikethrough: 0,
        failures: 0,
        pending: 0
    };

    const SSIG_REGEX = {
        unsignedKeywords: /\b(unrequested|pending other user|pending|not requested|awaiting|unsigned)\b/i,
        hasNameToken: /[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\-]+/
    };

    const SSIG_ATTRS = {
        ariaBusyTarget: 'body',
        ariaBusyAttr: 'aria-busy'
    };

    let ssigState = {
        isRunning: false,
        stopRequested: false,
        observers: [],
        timeouts: [],
        intervals: [],
        eventListeners: [],
        idleCallbackIds: [],
        rafIds: [],
        seenKeys: new Set(),
        rowStates: [],
        counters: { total: 0, selected: 0, already: 0, skippedPISigned: 0, skippedNotEligible: 0, strikethrough: 0, failures: 0, pending: 0 },
        focusReturnElement: null,
        prevAriaBusy: null,
        scrollContainer: null,
        prevScrollTop: 0,
        userScrollHandler: null,
        userScrollPaused: false,
        lastAutoScrollTime: 0,
        leftPanelRowIndex: 0,
        detectedStaffSigColIndex: null,
        detectedPiSigColIndex: null
    };

    function resetSsigState() {
        addLogMessage('resetSsigState: resetting state', 'log');
        ssigState.isRunning = false;
        ssigState.stopRequested = false;
        ssigState.observers = [];
        ssigState.timeouts = [];
        ssigState.intervals = [];
        ssigState.eventListeners = [];
        ssigState.idleCallbackIds = [];
        ssigState.rafIds = [];
        ssigState.seenKeys = new Set();
        ssigState.rowStates = [];
        ssigState.counters = { total: 0, selected: 0, already: 0, skippedPISigned: 0, skippedNotEligible: 0, strikethrough: 0, failures: 0, pending: 0 };
        ssigState.prevAriaBusy = null;
        ssigState.scrollContainer = null;
        ssigState.prevScrollTop = 0;
        ssigState.userScrollHandler = null;
        ssigState.userScrollPaused = false;
        ssigState.lastAutoScrollTime = 0;
        ssigState.leftPanelRowIndex = 0;
        ssigState.detectedStaffSigColIndex = null;
        ssigState.detectedPiSigColIndex = null;
    }

    function ssigWaitForElement(selector, timeout) {
        addLogMessage('ssigWaitForElement: waiting for ' + selector, 'log');
        return new Promise(function(resolve, reject) {
            var element = document.querySelector(selector);
            if (element) {
                addLogMessage('ssigWaitForElement: found immediately', 'log');
                resolve(element);
                return;
            }
            var observer = new MutationObserver(function(mutations, obs) {
                var el = document.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    var idx = ssigState.observers.indexOf(obs);
                    if (idx > -1) {
                        ssigState.observers.splice(idx, 1);
                    }
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            ssigState.observers.push(observer);
            var timeoutId = setTimeout(function() {
                observer.disconnect();
                var idx = ssigState.observers.indexOf(observer);
                if (idx > -1) {
                    ssigState.observers.splice(idx, 1);
                }
                addLogMessage('ssigWaitForElement: timeout for ' + selector, 'warn');
                reject(new Error('Timeout waiting for ' + selector));
            }, timeout);
            ssigState.timeouts.push(timeoutId);
        });
    }

    function ssigSetAriaBusyOn() {
        addLogMessage('ssigSetAriaBusyOn: setting aria-busy', 'log');
        var target = document.querySelector(SSIG_ATTRS.ariaBusyTarget);
        if (target) {
            ssigState.prevAriaBusy = target.getAttribute(SSIG_ATTRS.ariaBusyAttr);
            target.setAttribute(SSIG_ATTRS.ariaBusyAttr, 'true');
        }
    }

    function ssigSetAriaBusyOff() {
        addLogMessage('ssigSetAriaBusyOff: clearing aria-busy', 'log');
        var target = document.querySelector(SSIG_ATTRS.ariaBusyTarget);
        if (target) {
            if (ssigState.prevAriaBusy !== null) {
                target.setAttribute(SSIG_ATTRS.ariaBusyAttr, ssigState.prevAriaBusy);
            } else {
                target.removeAttribute(SSIG_ATTRS.ariaBusyAttr);
            }
            ssigState.prevAriaBusy = null;
        }
    }

    function ssigUpdateAriaLive(message) {
        var lr = document.getElementById('ssig-aria-live');
        if (lr) {
            lr.textContent = message;
        }
    }

    function ssigDetectSignatureColumns() {
        addLogMessage('ssigDetectSignatureColumns: attempting dynamic detection', 'log');
        var gridTable = document.querySelector(SSIG_SELECTORS.gridTable);
        if (!gridTable) {
            addLogMessage('ssigDetectSignatureColumns: grid not found, using defaults', 'warn');
            return;
        }
        var rows = gridTable.querySelectorAll(SSIG_SELECTORS.row);
        var dataRow = null;
        for (var ri = 0; ri < rows.length; ri++) {
            if (rows[ri].getAttribute('role') !== 'columnheader') {
                dataRow = rows[ri];
                break;
            }
        }
        if (!dataRow) {
            addLogMessage('ssigDetectSignatureColumns: no data row found, using defaults', 'warn');
            return;
        }
        var cells = dataRow.querySelectorAll(SSIG_SELECTORS.cell);
        var foundStaff = -1;
        var foundPi = -1;
        var sigCount = 0;
        for (var ci = 0; ci < cells.length; ci++) {
            var cell = cells[ci];
            var hasSigned = cell.querySelector(SSIG_SELECTORS.sigSignedBlock);
            var hasUnsigned = cell.querySelector(SSIG_SELECTORS.sigUnsignedBlock);
            if (hasSigned || hasUnsigned) {
                sigCount++;
                if (sigCount === 1) {
                    foundStaff = ci;
                } else if (sigCount === 2) {
                    foundPi = ci;
                    break;
                }
            }
        }
        if (foundStaff >= 0 && foundPi >= 0) {
            addLogMessage('ssigDetectSignatureColumns: detected staffSigCol=' + foundStaff + ' piSigCol=' + foundPi, 'log');
            ssigState.detectedStaffSigColIndex = foundStaff;
            ssigState.detectedPiSigColIndex = foundPi;
        } else {
            addLogMessage('ssigDetectSignatureColumns: could not detect both columns, using defaults staffSig=' + SSIG_SELECTORS.staffSigColIndex + ' piSig=' + SSIG_SELECTORS.piSigColIndex, 'warn');
        }
    }

    function ssigGetStaffSigColIndex() {
        if (ssigState.detectedStaffSigColIndex !== null) {
            return ssigState.detectedStaffSigColIndex;
        }
        return SSIG_SELECTORS.staffSigColIndex;
    }

    function ssigGetPiSigColIndex() {
        if (ssigState.detectedPiSigColIndex !== null) {
            return ssigState.detectedPiSigColIndex;
        }
        return SSIG_SELECTORS.piSigColIndex;
    }

    function ssigReadSignatureCell(cell) {
        if (!cell) {
            return { signed: false, text: '' };
        }
        var signedBlock = cell.querySelector(SSIG_SELECTORS.sigSignedBlock);
        if (signedBlock) {
            var nameEls = cell.querySelectorAll(SSIG_SELECTORS.sigSignedName);
            for (var ni = 0; ni < nameEls.length; ni++) {
                var nameText = nameEls[ni].textContent.trim().replace(/\s+/g, ' ');
                if (nameText && SSIG_REGEX.hasNameToken.test(nameText)) {
                    return { signed: true, text: nameText };
                }
            }
        }
        var unsignedBlock = cell.querySelector(SSIG_SELECTORS.sigUnsignedBlock);
        if (unsignedBlock) {
            var unsignedText = unsignedBlock.textContent.trim().replace(/\s+/g, ' ');
            if (SSIG_REGEX.unsignedKeywords.test(unsignedText)) {
                return { signed: false, text: unsignedText };
            }
        }
        var cellText = cell.textContent.trim().replace(/\s+/g, ' ');
        if (cellText && SSIG_REGEX.hasNameToken.test(cellText) && !SSIG_REGEX.unsignedKeywords.test(cellText)) {
            var signedEl = cell.querySelector(SSIG_SELECTORS.sigSignedBlock);
            if (signedEl) {
                return { signed: true, text: cellText };
            }
        }
        return { signed: false, text: cellText || '' };
    }

    function determineSignatureEligibility(staffSigText, piSigText, staffSigHasName, piSigHasName) {
        addLogMessage('determineSignatureEligibility: staffHasName=' + staffSigHasName + ' piHasName=' + piSigHasName + ' staffText=' + staffSigText + ' piText=' + piSigText, 'log');
        if (piSigHasName) {
            return { eligible: false, reason: 'piSigned' };
        }
        if (staffSigHasName && !piSigHasName) {
            return { eligible: true, reason: 'eligible' };
        }
        return { eligible: false, reason: 'notEligible' };
    }

    function extractRowState(rowEl) {
        try {
            var cells = rowEl.querySelectorAll(SSIG_SELECTORS.cell);
            var staffColIdx = ssigGetStaffSigColIndex();
            var piColIdx = ssigGetPiSigColIndex();
            var nameDisplay = '';
            if (cells.length > SSIG_SELECTORS.nameCellIndex) {
                var nameCell = cells[SSIG_SELECTORS.nameCellIndex];
                var primaryEl = nameCell.querySelector(SSIG_SELECTORS.namePrimary);
                if (primaryEl) {
                    nameDisplay = primaryEl.textContent.trim().replace(/\s+/g, ' ');
                }
                if (!nameDisplay) {
                    var fallbackEl = nameCell.querySelector(SSIG_SELECTORS.nameFallback);
                    if (fallbackEl) {
                        nameDisplay = fallbackEl.textContent.trim().replace(/\s+/g, ' ');
                    }
                }
            }
            var pairKey = normalizeFirstLastPair(nameDisplay);
            var checkboxEl = null;
            var isChecked = false;
            if (cells.length > SSIG_SELECTORS.checkboxCellIndex) {
                var cbCell = cells[SSIG_SELECTORS.checkboxCellIndex];
                checkboxEl = cbCell.querySelector(SSIG_SELECTORS.checkboxInCell);
            }
            if (checkboxEl) {
                var ariaChecked = checkboxEl.getAttribute('aria-checked');
                if (ariaChecked === 'true') {
                    isChecked = true;
                } else if (checkboxEl.classList && checkboxEl.classList.contains('checkbox-icon--selected')) {
                    isChecked = true;
                }
            }
            var staffSigCell = cells.length > staffColIdx ? cells[staffColIdx] : null;
            var piSigCell = cells.length > piColIdx ? cells[piColIdx] : null;
            var staffSig = ssigReadSignatureCell(staffSigCell);
            var piSig = ssigReadSignatureCell(piSigCell);
            var eligibility = determineSignatureEligibility(staffSig.text, piSig.text, staffSig.signed, piSig.signed);
            return {
                nameDisplay: nameDisplay,
                pairKey: pairKey,
                checkboxEl: checkboxEl,
                isChecked: isChecked,
                staffSig: staffSig,
                piSig: piSig,
                eligible: eligibility.eligible,
                reason: eligibility.reason,
                rowEl: rowEl
            };
        } catch (err) {
            addLogMessage('extractRowState: error: ' + err, 'error');
            return null;
        }
    }

    function selectRowCheckbox(rowState) {
        addLogMessage('selectRowCheckbox: name=' + rowState.nameDisplay + ' eligible=' + rowState.eligible + ' isChecked=' + rowState.isChecked, 'log');
        return new Promise(function(resolve) {
            if (!rowState.checkboxEl) {
                addLogMessage('selectRowCheckbox: no checkbox element', 'warn');
                resolve(false);
                return;
            }
            if (rowState.checkboxEl.disabled || rowState.checkboxEl.getAttribute('aria-disabled') === 'true') {
                addLogMessage('selectRowCheckbox: checkbox is disabled', 'warn');
                resolve(false);
                return;
            }
            if (rowState.isChecked) {
                addLogMessage('selectRowCheckbox: already checked', 'log');
                resolve('already');
                return;
            }
            var attempt = 0;
            function tryClick() {
                if (ssigState.stopRequested || !ssigState.isRunning) {
                    resolve(false);
                    return;
                }
                try {
                    rowState.checkboxEl.click();
                } catch (err) {
                    addLogMessage('selectRowCheckbox: click error attempt=' + attempt + ' err=' + err, 'error');
                    attempt++;
                    if (attempt < SSIG_RETRY.clickRetries) {
                        var retryTid = setTimeout(tryClick, SSIG_TIMEOUTS.clickSettleMs);
                        ssigState.timeouts.push(retryTid);
                        return;
                    }
                    resolve(false);
                    return;
                }
                var verifyTid = setTimeout(function() {
                    var ac = rowState.checkboxEl.getAttribute('aria-checked');
                    if (ac === 'true') {
                        addLogMessage('selectRowCheckbox: verified checked via aria-checked', 'log');
                        resolve(true);
                        return;
                    }
                    if (rowState.checkboxEl.classList && rowState.checkboxEl.classList.contains('checkbox-icon--selected')) {
                        addLogMessage('selectRowCheckbox: verified checked via class', 'log');
                        resolve(true);
                        return;
                    }
                    attempt++;
                    if (attempt < SSIG_RETRY.clickRetries) {
                        addLogMessage('selectRowCheckbox: verify failed, retrying attempt=' + attempt, 'warn');
                        tryClick();
                        return;
                    }
                    addLogMessage('selectRowCheckbox: exhausted retries', 'warn');
                    resolve(false);
                }, SSIG_TIMEOUTS.verifySettleMs);
                ssigState.timeouts.push(verifyTid);
            }
            tryClick();
        });
    }

    function updateRightPanelStatusSsig(rowKey, newStatus, detailsOptional) {
        var rightPanel = document.getElementById('ssig-right-panel');
        if (!rightPanel) {
            return;
        }
        if (ssigState.stopRequested) {
            return;
        }
        var items = rightPanel.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var itemKey = item.getAttribute('data-rowkey');
            if (itemKey === rowKey) {
                var badge = item.querySelector('.elog-status-badge');
                if (badge) {
                    badge.textContent = newStatus;
                    var badgeColor = 'rgba(255, 255, 255, 0.7)';
                    var badgeBg = 'rgba(255, 255, 255, 0.1)';
                    if (newStatus === SSIG_LABELS.statusPending) {
                        badgeColor = '#ffd93d';
                        badgeBg = 'rgba(255, 217, 61, 0.2)';
                    } else if (newStatus === SSIG_LABELS.statusSelected) {
                        badgeColor = '#6bcf7f';
                        badgeBg = 'rgba(107, 207, 127, 0.2)';
                    } else if (newStatus === SSIG_LABELS.statusAlready) {
                        badgeColor = '#64b5f6';
                        badgeBg = 'rgba(100, 181, 246, 0.2)';
                    } else if (newStatus === SSIG_LABELS.statusPISigned) {
                        badgeColor = '#ffa500';
                        badgeBg = 'rgba(255, 165, 0, 0.2)';
                    } else if (newStatus === SSIG_LABELS.statusNotEligible) {
                        badgeColor = '#aaa';
                        badgeBg = 'rgba(170, 170, 170, 0.2)';
                    } else if (newStatus === SSIG_LABELS.statusStrikethrough) {
                        badgeColor = '#ce93d8';
                        badgeBg = 'rgba(206, 147, 216, 0.2)';
                    } else if (newStatus === SSIG_LABELS.statusFailed) {
                        badgeColor = '#ff6b6b';
                        badgeBg = 'rgba(255, 107, 107, 0.2)';
                    } else if (newStatus === SSIG_LABELS.statusStopped) {
                        badgeColor = '#aaa';
                        badgeBg = 'rgba(170, 170, 170, 0.2)';
                    }
                    badge.style.color = badgeColor;
                    badge.style.background = badgeBg;
                    if (detailsOptional) {
                        badge.title = detailsOptional;
                    }
                }
                break;
            }
        }
        ssigUpdateAriaLive(newStatus + ': ' + rowKey);
    }

    function updateRightPanelSummarySsig(counters) {
        addLogMessage('updateRightPanelSummarySsig: total=' + counters.total + ' selected=' + counters.selected + ' already=' + counters.already + ' piSigned=' + counters.skippedPISigned + ' notEligible=' + counters.skippedNotEligible + ' strikethrough=' + counters.strikethrough + ' failures=' + counters.failures + ' pending=' + counters.pending, 'log');
        var el1 = document.getElementById('ssig-summary-total');
        var el2 = document.getElementById('ssig-summary-selected');
        var el3 = document.getElementById('ssig-summary-already');
        var el4 = document.getElementById('ssig-summary-pisigned');
        var el5 = document.getElementById('ssig-summary-noteligible');
        var elStrike = document.getElementById('ssig-summary-strikethrough');
        var el6 = document.getElementById('ssig-summary-failures');
        var el7 = document.getElementById('ssig-summary-pending');
        var el8 = document.getElementById('ssig-summary-percent');
        if (el1) {
            el1.textContent = String(counters.total);
        }
        if (el2) {
            el2.textContent = String(counters.selected);
        }
        if (el3) {
            el3.textContent = String(counters.already);
        }
        if (el4) {
            el4.textContent = String(counters.skippedPISigned);
        }
        if (el5) {
            el5.textContent = String(counters.skippedNotEligible);
        }
        if (elStrike) {
            elStrike.textContent = String(counters.strikethrough);
        }
        if (el6) {
            el6.textContent = String(counters.failures);
        }
        if (el7) {
            el7.textContent = String(counters.pending);
        }
        if (el8) {
            var processed = counters.total - counters.pending;
            var pct = counters.total > 0 ? Math.round((processed / counters.total) * 100) : 0;
            el8.textContent = pct + '%';
        }
    }

    function showSelectSignedCheckboxProgressPanel() {
        addLogMessage('showSelectSignedCheckboxProgressPanel: creating progress panel', 'log');
        var modal = document.createElement('div');
        modal.id = 'ssig-progress-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.id = 'ssig-progress-container';
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 900px; max-width: 95%; max-height: 80vh; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative; display: flex; flex-direction: column;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'ssig-progress-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0;';
        var titleContainer = document.createElement('div');
        titleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
        var title = document.createElement('h3');
        title.id = 'ssig-progress-title';
        title.textContent = SSIG_LABELS.progressTitle;
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var statusBadge = document.createElement('span');
        statusBadge.id = 'ssig-status-badge';
        statusBadge.textContent = 'In Progress';
        statusBadge.style.cssText = 'background: rgba(255, 255, 255, 0.3); color: #ffd93d; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
        titleContainer.appendChild(title);
        titleContainer.appendChild(statusBadge);
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.id = 'ssig-close-btn';
        closeButton.setAttribute('aria-label', 'Close and stop');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showSelectSignedCheckboxProgressPanel: closed by user', 'warn');
            stopSelectSignedCheckbox();
        };
        header.appendChild(titleContainer);
        header.appendChild(closeButton);
        var panelsContainer = document.createElement('div');
        panelsContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; overflow: hidden;';
        var leftPanel = createSubpanel('Scanned Log Entries', 'ssig-left-panel', 'ssig-left-search');
        var rightPanel = createSubpanel('Eligibility & Selection Status', 'ssig-right-panel', 'ssig-right-search');
        panelsContainer.appendChild(leftPanel);
        panelsContainer.appendChild(rightPanel);
        var summaryFooter = document.createElement('div');
        summaryFooter.id = 'ssig-summary-footer';
        summaryFooter.setAttribute('aria-label', 'Selection summary');
        summaryFooter.style.cssText = 'display: flex; justify-content: space-around; align-items: center; padding: 10px 16px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; margin-top: 12px; flex-shrink: 0;';
        var summaryItems = [
            { id: 'ssig-summary-total', label: 'Total', value: '0' },
            { id: 'ssig-summary-selected', label: 'Selected', value: '0' },
            { id: 'ssig-summary-already', label: 'Already', value: '0' },
            { id: 'ssig-summary-pisigned', label: 'PI Signed', value: '0' },
            { id: 'ssig-summary-noteligible', label: 'Not Eligible', value: '0' },
            { id: 'ssig-summary-strikethrough', label: 'Strikethrough', value: '0' },
            { id: 'ssig-summary-failures', label: 'Failed', value: '0' },
            { id: 'ssig-summary-pending', label: 'Pending', value: '0' },
            { id: 'ssig-summary-percent', label: 'Progress', value: '0%' }
        ];
        for (var si = 0; si < summaryItems.length; si++) {
            var sItem = document.createElement('div');
            sItem.style.cssText = 'text-align: center;';
            var vSpan = document.createElement('span');
            vSpan.id = summaryItems[si].id;
            vSpan.textContent = summaryItems[si].value;
            vSpan.style.cssText = 'display: block; color: white; font-size: 16px; font-weight: 700;';
            var lSpan = document.createElement('span');
            lSpan.textContent = summaryItems[si].label;
            lSpan.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.6); font-size: 11px; font-weight: 500; margin-top: 2px;';
            sItem.appendChild(vSpan);
            sItem.appendChild(lSpan);
            summaryFooter.appendChild(sItem);
        }
        var ariaLiveRegion = document.createElement('div');
        ariaLiveRegion.id = 'ssig-aria-live';
        ariaLiveRegion.setAttribute('aria-live', 'polite');
        ariaLiveRegion.setAttribute('aria-atomic', 'true');
        ariaLiveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        container.appendChild(header);
        container.appendChild(panelsContainer);
        container.appendChild(summaryFooter);
        container.appendChild(ariaLiveRegion);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        closeButton.focus();
        addLogMessage('showSelectSignedCheckboxProgressPanel: displayed', 'log');
    }

    function ssigAwaitSettle(gridTable) {
        return new Promise(function(resolve) {
            var resolved = false;
            var observer = null;
            var timeoutId = setTimeout(function() {
                if (!resolved) {
                    resolved = true;
                    if (observer) {
                        observer.disconnect();
                        var idx = ssigState.observers.indexOf(observer);
                        if (idx > -1) {
                            ssigState.observers.splice(idx, 1);
                        }
                    }
                    resolve();
                }
            }, SSIG_TIMEOUTS.settleScanMs);
            ssigState.timeouts.push(timeoutId);
            if (gridTable) {
                observer = new MutationObserver(function() {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        observer.disconnect();
                        var idx = ssigState.observers.indexOf(observer);
                        if (idx > -1) {
                            ssigState.observers.splice(idx, 1);
                        }
                        resolve();
                    }
                });
                observer.observe(gridTable, { childList: true, subtree: true });
                ssigState.observers.push(observer);
            }
        });
    }

    function ssigObserveUserScrollPause(container) {
        if (!container || ssigState.userScrollHandler) {
            return;
        }
        ssigState.userScrollHandler = function() {
            var timeSinceAuto = Date.now() - ssigState.lastAutoScrollTime;
            if (timeSinceAuto > 50 && !ssigState.userScrollPaused) {
                ssigState.userScrollPaused = true;
                var resumeTimeout = setTimeout(function() {
                    ssigState.userScrollPaused = false;
                }, 800);
                ssigState.timeouts.push(resumeTimeout);
            }
        };
        container.addEventListener('scroll', ssigState.userScrollHandler);
        ssigState.eventListeners.push({ element: container, type: 'scroll', handler: ssigState.userScrollHandler });
    }

    function ssigGetRenderedRowCount(gridTable) {
        var rows = gridTable.querySelectorAll(SSIG_SELECTORS.row);
        var count = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                count++;
            }
        }
        return count;
    }

    function ssigGetRenderedLastRowKey(gridTable) {
        var rows = gridTable.querySelectorAll(SSIG_SELECTORS.row);
        var lastDataRow = null;
        for (var i = rows.length - 1; i >= 0; i--) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                lastDataRow = rows[i];
                break;
            }
        }
        if (!lastDataRow) {
            return '';
        }
        var cells = lastDataRow.querySelectorAll(SSIG_SELECTORS.cell);
        if (cells.length > 0) {
            var txt = cells[0].textContent.trim();
            if (txt) {
                return txt;
            }
        }
        var hash = 0;
        var content = lastDataRow.textContent || '';
        for (var ci = 0; ci < content.length; ci++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(ci);
            hash = hash & hash;
        }
        return 'hash_' + hash;
    }

    function ssigScanVisibleRows(gridTable) {
        var rows = gridTable.querySelectorAll(SSIG_SELECTORS.row);
        var leftPanel = document.getElementById('ssig-left-panel');
        var rightPanel = document.getElementById('ssig-right-panel');
        var leftFragment = document.createDocumentFragment();
        var rightFragment = document.createDocumentFragment();
        var newCount = 0;
        for (var ri = 0; ri < rows.length; ri++) {
            var row = rows[ri];
            if (row.getAttribute('role') === 'columnheader') {
                continue;
            }
            var rs = extractRowState(row);
            if (!rs) {
                continue;
            }
            if (!rs.nameDisplay) {
                continue;
            }
            var normKey = elogNormalizeName(rs.nameDisplay);
            if (ssigState.seenKeys.has(normKey)) {
                continue;
            }
            ssigState.seenKeys.add(normKey);
            ssigState.leftPanelRowIndex++;
            var rowKey = rs.pairKey + '_' + ssigState.leftPanelRowIndex;
            rs._rowKey = rowKey;
            ssigState.rowStates.push(rs);
            newCount++;
            if (leftPanel) {
                var leftItem = createListItem(rs.nameDisplay, null, null, ssigState.leftPanelRowIndex);
                leftFragment.appendChild(leftItem);
            }
            if (rightPanel) {
                var eligHint = '';
                if (rs.reason === 'piSigned') {
                    eligHint = 'PI Signed';
                } else if (rs.reason === 'eligible') {
                    eligHint = 'Eligible';
                } else {
                    eligHint = 'Not Eligible';
                }
                var rightItem = createListItem(rs.nameDisplay, SSIG_LABELS.statusPending, 'pending', ssigState.leftPanelRowIndex);
                rightItem.setAttribute('data-rowkey', rowKey);
                rightItem.setAttribute('data-pairkey', rs.pairKey);
                rightItem.setAttribute('data-eligibility', eligHint);
                rightFragment.appendChild(rightItem);
            }
        }
        if (leftPanel && leftFragment.childNodes.length > 0) {
            requestAnimationFrame(function() {
                if (ssigState.stopRequested) {
                    return;
                }
                leftPanel.appendChild(leftFragment);
            });
        }
        if (rightPanel && rightFragment.childNodes.length > 0) {
            requestAnimationFrame(function() {
                if (ssigState.stopRequested) {
                    return;
                }
                rightPanel.appendChild(rightFragment);
            });
        }
        return newCount;
    }

    function ssigAutoScrollScan(options) {
        addLogMessage('ssigAutoScrollScan: starting', 'log');
        var onRow = options.onRow || function() {};
        var onProgress = options.onProgress || function() {};
        var onDone = options.onDone || function() {};
        var gridTable = document.querySelector(SSIG_SELECTORS.gridTable);
        if (!gridTable) {
            addLogMessage('ssigAutoScrollScan: grid not found', 'error');
            onDone({ total: 0, reason: 'error' });
            return;
        }
        var container = findScrollableContainer(gridTable);
        if (!container) {
            addLogMessage('ssigAutoScrollScan: container not found', 'error');
            onDone({ total: 0, reason: 'error' });
            return;
        }
        ssigState.scrollContainer = container;
        ssigState.prevScrollTop = container.scrollTop;
        ssigObserveUserScrollPause(container);
        container.scrollTo({ top: 0, behavior: 'auto' });
        var startTime = Date.now();
        var noProgress = 0;
        var prevScrollHeight = container.scrollHeight;
        function initialScan() {
            ssigScanVisibleRows(gridTable);
            onProgress({ scanned: ssigState.rowStates.length });
            prevScrollHeight = container.scrollHeight;
            var initScrollTimeout = setTimeout(scrollLoop, SSIG_TIMEOUTS.idleBetweenBatchesMs);
            ssigState.timeouts.push(initScrollTimeout);
        }
        function scrollLoop() {
            if (ssigState.stopRequested || !ssigState.isRunning) {
                finishScan('stopped');
                return;
            }
            if (Date.now() - startTime > SSIG_TIMEOUTS.maxScanDurationMs) {
                finishScan('timeout');
                return;
            }
            if (ssigState.userScrollPaused) {
                var pt = setTimeout(scrollLoop, 100);
                ssigState.timeouts.push(pt);
                return;
            }
            var currentScrollHeight = container.scrollHeight;
            if (currentScrollHeight > prevScrollHeight) {
                addLogMessage('ssigAutoScrollScan: scrollHeight grew from ' + prevScrollHeight + ' to ' + currentScrollHeight, 'log');
                noProgress = 0;
                prevScrollHeight = currentScrollHeight;
            }
            var priorKey = ssigGetRenderedLastRowKey(gridTable);
            var priorCount = ssigGetRenderedRowCount(gridTable);
            var currTop = container.scrollTop;
            var maxScroll = container.scrollHeight - container.clientHeight;
            var newTop = Math.min(currTop + SSIG_SCROLL.stepPx, maxScroll);
            ssigState.lastAutoScrollTime = Date.now();
            container.scrollTo({ top: newTop, behavior: 'auto' });
            ssigAwaitSettle(gridTable).then(function() {
                var attempts = 0;
                function attemptScan() {
                    var rc = ssigGetRenderedRowCount(gridTable);
                    if (rc === 0 && attempts < SSIG_RETRY.scanEmptyRetries) {
                        attempts++;
                        var rt = setTimeout(attemptScan, SSIG_TIMEOUTS.settleScanMs);
                        ssigState.timeouts.push(rt);
                        return;
                    }
                    ssigScanVisibleRows(gridTable);
                    onProgress({ scanned: ssigState.rowStates.length });
                    var currKey = ssigGetRenderedLastRowKey(gridTable);
                    var currCount = ssigGetRenderedRowCount(gridTable);
                    var postScrollHeight = container.scrollHeight;
                    if (postScrollHeight > prevScrollHeight) {
                        noProgress = 0;
                        prevScrollHeight = postScrollHeight;
                    } else if (currKey === priorKey && currCount === priorCount) {
                        noProgress++;
                    } else {
                        noProgress = 0;
                    }
                    var atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
                    if (atBottom && noProgress >= 3) {
                        finishScan('endReached');
                        return;
                    }
                    if (noProgress >= SSIG_RETRY.maxNoProgressIterations) {
                        finishScan('noProgress');
                        return;
                    }
                    if (typeof requestIdleCallback === 'function') {
                        var icbId = requestIdleCallback(function() {
                            var idx = ssigState.idleCallbackIds.indexOf(icbId);
                            if (idx > -1) {
                                ssigState.idleCallbackIds.splice(idx, 1);
                            }
                            scrollLoop();
                        }, { timeout: SSIG_TIMEOUTS.idleBetweenBatchesMs * 2 });
                        ssigState.idleCallbackIds.push(icbId);
                    } else {
                        var it = setTimeout(scrollLoop, SSIG_TIMEOUTS.idleBetweenBatchesMs);
                        ssigState.timeouts.push(it);
                    }
                }
                attemptScan();
            });
        }
        function finishScan(reason) {
            addLogMessage('ssigAutoScrollScan: done reason=' + reason + ' total=' + ssigState.rowStates.length, 'log');
            onDone({ total: ssigState.rowStates.length, reason: reason });
        }
        function waitForStableScrollHeight(callback) {
            var checks = 0;
            var maxChecks = 5;
            var lastHeight = container.scrollHeight;
            var stableCount = 0;
            function checkHeight() {
                if (!ssigState.isRunning) {
                    return;
                }
                var currentHeight = container.scrollHeight;
                if (currentHeight === lastHeight) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastHeight = currentHeight;
                }
                checks++;
                if (stableCount >= 2 || checks >= maxChecks) {
                    callback();
                    return;
                }
                var tid = setTimeout(checkHeight, 500);
                ssigState.timeouts.push(tid);
            }
            var tid = setTimeout(checkHeight, 500);
            ssigState.timeouts.push(tid);
        }
        waitForStableScrollHeight(function() {
            initialScan();
        });
    }

    function startSelectSignedScan() {
        addLogMessage('startSelectSignedScan: beginning scan', 'log');
        ssigState.seenKeys = new Set();
        ssigState.rowStates = [];
        ssigState.leftPanelRowIndex = 0;
        ssigState.counters = { total: 0, selected: 0, already: 0, skippedPISigned: 0, skippedNotEligible: 0, strikethrough: 0, failures: 0, pending: 0 };
        ssigDetectSignatureColumns();
        ssigAutoScrollScan({
            onRow: function(rowState) {
                addLogMessage('startSelectSignedScan: onRow name=' + rowState.nameDisplay, 'log');
            },
            onProgress: function(data) {
                addLogMessage('startSelectSignedScan: scanned ' + data.scanned + ' rows', 'log');
                ssigUpdateAriaLive('Scanned ' + data.scanned + ' rows');
            },
            onDone: function(data) {
                addLogMessage('startSelectSignedScan: scan done total=' + data.total + ' reason=' + data.reason, 'log');
                removeCollectingDataPanel('ssig');
                if (data.reason === 'stopped' || !ssigState.isRunning) {
                    addLogMessage('startSelectSignedScan: stopped during scan', 'warn');
                    return;
                }
                ssigState.counters.total = ssigState.rowStates.length;
                ssigState.counters.pending = ssigState.rowStates.length;
                updateRightPanelSummarySsig(ssigState.counters);
                var badge = document.getElementById('ssig-status-badge');
                if (badge) {
                    badge.textContent = SSIG_LABELS.selecting;
                }
                var titleEl = document.getElementById('ssig-progress-title');
                if (titleEl) {
                    titleEl.textContent = SSIG_LABELS.progressTitle + ' - Selecting';
                }
                ssigUpdateAriaLive('Scan complete. Processing ' + ssigState.rowStates.length + ' rows.');
                processNextSsigRow(0);
            }
        });
    }

    function processNextSsigRow(index) {
        if (ssigState.stopRequested || !ssigState.isRunning) {
            addLogMessage('processNextSsigRow: stopped at index=' + index, 'warn');
            for (var si = index; si < ssigState.rowStates.length; si++) {
                var stoppedRs = ssigState.rowStates[si];
                if (stoppedRs._status !== 'finalized') {
                    stoppedRs._status = 'finalized';
                    ssigState.counters.pending--;
                    updateRightPanelStatusSsig(stoppedRs._rowKey, SSIG_LABELS.statusStopped);
                }
            }
            updateRightPanelSummarySsig(ssigState.counters);
            finalizeSsigRun();
            return;
        }
        if (index >= ssigState.rowStates.length) {
            addLogMessage('processNextSsigRow: all rows processed', 'log');
            finalizeSsigRun();
            return;
        }
        var rs = ssigState.rowStates[index];
        addLogMessage('processNextSsigRow: index=' + index + ' name=' + rs.nameDisplay + ' eligible=' + rs.eligible + ' reason=' + rs.reason, 'log');
        if (rs.rowEl && rs.rowEl.querySelector('.log-entry--struckThrough')) {
            addLogMessage('processNextSsigRow: skipping strikethrough entry: ' + rs.nameDisplay, 'log');
            rs._status = 'finalized';
            ssigState.counters.strikethrough++;
            ssigState.counters.pending--;
            updateRightPanelStatusSsig(rs._rowKey, SSIG_LABELS.statusStrikethrough);
            updateRightPanelSummarySsig(ssigState.counters);
            var tidStrike = setTimeout(function() {
                processNextSsigRow(index + 1);
            }, 20);
            ssigState.timeouts.push(tidStrike);
            return;
        }
        if (rs.reason === 'piSigned') {
            rs._status = 'finalized';
            ssigState.counters.skippedPISigned++;
            ssigState.counters.pending--;
            updateRightPanelStatusSsig(rs._rowKey, SSIG_LABELS.statusPISigned, 'PI: ' + rs.piSig.text);
            updateRightPanelSummarySsig(ssigState.counters);
            var tid1 = setTimeout(function() {
                processNextSsigRow(index + 1);
            }, 20);
            ssigState.timeouts.push(tid1);
            return;
        }
        if (!rs.eligible) {
            rs._status = 'finalized';
            ssigState.counters.skippedNotEligible++;
            ssigState.counters.pending--;
            updateRightPanelStatusSsig(rs._rowKey, SSIG_LABELS.statusNotEligible, 'Staff: ' + rs.staffSig.text);
            updateRightPanelSummarySsig(ssigState.counters);
            var tid2 = setTimeout(function() {
                processNextSsigRow(index + 1);
            }, 20);
            ssigState.timeouts.push(tid2);
            return;
        }
        selectRowCheckbox(rs).then(function(result) {
            rs._status = 'finalized';
            if (result === 'already') {
                ssigState.counters.already++;
                ssigState.counters.pending--;
                updateRightPanelStatusSsig(rs._rowKey, SSIG_LABELS.statusAlready);
                addLogMessage('processNextSsigRow: already checked name=' + rs.nameDisplay, 'log');
            } else if (result === true) {
                ssigState.counters.selected++;
                ssigState.counters.pending--;
                updateRightPanelStatusSsig(rs._rowKey, SSIG_LABELS.statusSelected);
                addLogMessage('processNextSsigRow: selected name=' + rs.nameDisplay, 'log');
            } else {
                ssigState.counters.failures++;
                ssigState.counters.pending--;
                updateRightPanelStatusSsig(rs._rowKey, SSIG_LABELS.statusFailed);
                addLogMessage('processNextSsigRow: failed name=' + rs.nameDisplay, 'warn');
            }
            updateRightPanelSummarySsig(ssigState.counters);
            var tid3 = setTimeout(function() {
                processNextSsigRow(index + 1);
            }, SSIG_TIMEOUTS.clickSettleMs);
            ssigState.timeouts.push(tid3);
        });
    }

    function finalizeSsigRun() {
        addLogMessage('finalizeSsigRun: selected=' + ssigState.counters.selected + ' already=' + ssigState.counters.already + ' piSigned=' + ssigState.counters.skippedPISigned + ' notEligible=' + ssigState.counters.skippedNotEligible + ' strikethrough=' + ssigState.counters.strikethrough + ' failed=' + ssigState.counters.failures, 'log');
        ssigSetAriaBusyOff();
        var badge = document.getElementById('ssig-status-badge');
        if (badge) {
            badge.textContent = SSIG_LABELS.done;
            badge.style.color = '#6bcf7f';
        }
        var titleEl = document.getElementById('ssig-progress-title');
        if (titleEl) {
            titleEl.textContent = SSIG_LABELS.progressTitle + ' - Complete';
        }
        ssigUpdateAriaLive('Selection complete. Selected: ' + ssigState.counters.selected + ', Already: ' + ssigState.counters.already + ', PI Signed: ' + ssigState.counters.skippedPISigned + ', Not Eligible: ' + ssigState.counters.skippedNotEligible + ', Strikethrough: ' + ssigState.counters.strikethrough + ', Failed: ' + ssigState.counters.failures);
        ssigState.isRunning = false;
    }

    function selectSignedCheckboxInit() {
        addLogMessage('selectSignedCheckboxInit: starting feature', 'log');
        ssigState.focusReturnElement = document.getElementById('ssig-select-btn');
        resetSsigState();
        var presenceEl = document.querySelector(SSIG_SELECTORS.presenceCheck);
        if (!presenceEl) {
            addLogMessage('selectSignedCheckboxInit: page check failed, showing warning', 'warn');
            showSsigWarning();
            return;
        }
        addLogMessage('selectSignedCheckboxInit: page valid, opening progress panel', 'log');
        ssigState.isRunning = true;
        showSelectSignedCheckboxProgressPanel();
        ssigSetAriaBusyOn();
        ssigUpdateAriaLive(SSIG_LABELS.scanning);
        showCollectingDataPanel('ssig', SSIG_LABELS.progressTitle);
        startSelectSignedScan();
    }

    function showSsigWarning() {
        addLogMessage('showSsigWarning: creating warning popup', 'log');
        var modal = document.createElement('div');
        modal.id = 'ssig-warning-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 30000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 450px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'alertdialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'ssig-warning-title');
        container.setAttribute('aria-describedby', 'ssig-warning-message');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        var title = document.createElement('h3');
        title.id = 'ssig-warning-title';
        title.textContent = 'Document Log Not Found';
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close warning');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        var closeWarning = function() {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopSelectSignedCheckbox();
        };
        closeButton.onclick = closeWarning;
        header.appendChild(title);
        header.appendChild(closeButton);
        var messageDiv = document.createElement('p');
        messageDiv.id = 'ssig-warning-message';
        messageDiv.textContent = 'You are not on the Document Log page. Please navigate to a page with the Document Log Entries grid before using this feature.';
        messageDiv.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px; line-height: 1.5;';
        var okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; margin-top: 20px; width: 100%;';
        okButton.onmouseover = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        okButton.onmouseout = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        okButton.onclick = closeWarning;
        var keyHandler = function(e) {
            if (e.key === 'Escape') {
                closeWarning();
            }
        };
        document.addEventListener('keydown', keyHandler);
        ssigState.eventListeners.push({ element: document, type: 'keydown', handler: keyHandler });
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
        okButton.focus();
        addLogMessage('showSsigWarning: warning displayed', 'log');
    }

    function stopSelectSignedCheckbox() {
        addLogMessage('stopSelectSignedCheckbox: stopping', 'log');
        ssigState.isRunning = false;
        ssigState.stopRequested = true;
        for (var i = 0; i < ssigState.idleCallbackIds.length; i++) {
            if (typeof cancelIdleCallback === 'function') {
                cancelIdleCallback(ssigState.idleCallbackIds[i]);
            }
        }
        ssigState.idleCallbackIds = [];
        for (var i2 = 0; i2 < ssigState.rafIds.length; i2++) {
            cancelAnimationFrame(ssigState.rafIds[i2]);
        }
        ssigState.rafIds = [];
        for (var i3 = 0; i3 < ssigState.observers.length; i3++) {
            try {
                ssigState.observers[i3].disconnect();
            } catch (e) {
                addLogMessage('stopSelectSignedCheckbox: error disconnecting observer: ' + e, 'error');
            }
        }
        ssigState.observers = [];
        for (var i4 = 0; i4 < ssigState.timeouts.length; i4++) {
            try {
                clearTimeout(ssigState.timeouts[i4]);
            } catch (e2) {
                addLogMessage('stopSelectSignedCheckbox: error clearing timeout: ' + e2, 'error');
            }
        }
        ssigState.timeouts = [];
        for (var i5 = 0; i5 < ssigState.intervals.length; i5++) {
            try {
                clearInterval(ssigState.intervals[i5]);
            } catch (e3) {
                addLogMessage('stopSelectSignedCheckbox: error clearing interval: ' + e3, 'error');
            }
        }
        ssigState.intervals = [];
        for (var i6 = 0; i6 < ssigState.eventListeners.length; i6++) {
            try {
                var l = ssigState.eventListeners[i6];
                l.element.removeEventListener(l.type, l.handler);
            } catch (e4) {
                addLogMessage('stopSelectSignedCheckbox: error removing listener: ' + e4, 'error');
            }
        }
        ssigState.eventListeners = [];
        ssigSetAriaBusyOff();
        var progressModal = document.getElementById('ssig-progress-modal');
        if (progressModal && progressModal.parentNode) {
            progressModal.parentNode.removeChild(progressModal);
        }
        var warningModal = document.getElementById('ssig-warning-modal');
        if (warningModal && warningModal.parentNode) {
            warningModal.parentNode.removeChild(warningModal);
        }
        removeCollectingDataPanel('ssig');
        if (ssigState.focusReturnElement) {
            ssigState.focusReturnElement.focus();
        }
        resetSsigState();
        addLogMessage('stopSelectSignedCheckbox: cleanup complete', 'log');
    }

    const STARTDATE_SELECTORS = {
        mainTableContainer: '.document-log-entries.document-log-entries__table',
        mainGridTable: '.document-log-entries__grid-table[role="table"]',
        mainGridRow: 'log-entry-row[role="row"], .document-log-entries__grid-table__row[role="row"]',
        mainGridCell: '[role="cell"]',
        nameCellIndex: 3,
        namePrimary: '.u-text-overflow-ellipsis',
        nameFallback: '.test-logEntrySignature span',
        rowMenuToggle: 'a[dropdowntoggle], [dropdowntoggle]',
        rowMenuToggleFallbackIcon: '.fa-ellipsis-v',
        editMenuItemDirect: 'a.document-log-entries__log-entry-action--edit',
        editMenuItemFallback: '.dropdown-menu li a, .dropdown-menu .dropdown-item, .dropdown-menu button',
        startDateInputContainer: 'date-time-popup, .test-datetime-popup',
        startDateInputTrigger: 'input, a[dropdowntoggle], [dropdowntoggle]',
        datepickerContainer: 'date-time-popup .test-datetime-popup, date-time-popup .dropdown-menu, .test-datetime-popup.dropdown, datepicker, datepicker-inner',
        datepickerTitleBtn: 'button[id*="datepicker"][id*="title"], daypicker thead button[style*="width: 100%"], daypicker thead th[colspan] button',
        datepickerNavPrev: 'daypicker thead tr:first-child th:first-child button, .pull-left.float-left, button.pull-left',
        datepickerNavNext: 'daypicker thead tr:first-child th:last-child button, .pull-right.float-right, button.pull-right',
        datepickerDayCell: 'td[role="gridcell"] button',
        datepickerDaySpan: 'span',
        datepickerDayMutedClass: 'text-muted',
        ariaLiveRegion: '.aria-live-region',
        mainPanelButtonTarget: '.main-gui-panel',
        saveButton: 'button.btn.btn-primary.test-submitBtn, .log-entry-form button.btn.btn-primary',
        saveButtonTextFallback: 'button.btn.btn-primary',
        toastContainer: '.toast, .toastr, .alert',
        toastSuccess: '.toast-success, .alert-success, .toast.toast-success',
        editContextRoot: '.log-entry-form, form.log-entry-form, .document-log-entry-edit, .modal.show, body',
        memberDisplayInEdit: 'input.filtered-select__input[placeholder*="Team Member"], .filtered-select__input[readonly], .filtered-select__display, [data-test="member-display"], .log-entry-form__member .form-control[readonly]',
        startDateReadonlyInGrid: '.test-date-time-picker-3[placeholder*="Start Date"], input[placeholder="Start Date"]',
        gridDateCellText: '.u-text-overflow-ellipsis, span, div',
        overlayOrSpinner: '.loading, .spinner, .overlay, .cdk-overlay-container',
        reasonModal: 'section.test-reasonModal',
        reasonInput: 'textarea#reason-input, textarea.test-reason',
        reasonSubmitBtn: 'button.test-reasonSubmitBtn',
        reasonCancelBtn: 'button.test-reasonCancelBtn',
        reasonCloseBtn: 'section.test-reasonModal button.test-close-modal-button'
    };

    const STARTDATE_TIMEOUTS = {
        waitTableMs: 10000,
        waitGridMs: 10000,
        waitInputPanelMs: 10000,
        waitProgressPanelMs: 10000,
        waitMenuOpenMs: 1500,
        waitEditFormMs: 2500,
        waitDatepickerOpenMs: 1500,
        waitAfterYearChangeMs: 500,
        waitAfterMonthChangeMs: 500,
        waitAfterDayClickMs: 500,
        waitVerifyInputMs: 500,
        settleMs: 250,
        scanSettleMs: 250,
        idleBetweenBatchesMs: 80,
        maxScanDurationMs: 120000,
        retryScanDelayMs: 150,
        waitSaveButtonMs: 3000,
        waitSaveCompleteMs: 5000,
        waitToastMs: 2500,
        waitEditCloseMs: 4000,
        waitRowRequeryMs: 500,
        settleAfterSaveMs: 250,
        maxPerNameDurationMs: 90000,
        waitReasonModalMs: 3000,
        waitReasonSubmitEnabledMs: 1500,
        waitReasonModalCloseMs: 4000
    };

    const STARTDATE_LABELS = {
        featureButton: 'Add Start Date',
        inputTitle: 'Add Start Date',
        warningTitle: 'Document Log Not Found',
        warningMessage: 'The current page does not contain the Document Log Entries table. Please navigate to the Document Log before using this feature.',
        statusPending: 'Pending',
        statusSettingDate: 'Setting Date',
        statusCompleted: 'Completed',
        statusNotFound: 'Not Found',
        statusFailed: 'Failed',
        statusStopped: 'Stopped',
        scanComplete: 'Scan Complete',
        scanStopped: 'Scan Stopped',
        scanError: 'Scan Error',
        progressInProgress: 'In Progress',
        progressComplete: 'Complete',
        progressStopped: 'Stopped',
        statusSaving: 'Saving',
        statusSaved: 'Saved',
        statusAlreadySet: 'Already Set',
        statusSaveFailed: 'Save Failed',
        statusLocating: 'Locating',
        statusEditing: 'Editing',
        statusEditFailed: 'Edit Failed',
        statusMenuFailed: 'Menu Failed',
        statusDatepickerFailed: 'Datepicker Failed',
        statusDuplicate: 'Duplicate (ignored)',
        statusEnteringReason: 'Entering Reason',
        reasonText: 'Add Start Date'
    };

    const STARTDATE_REGEX = {
        whitespace: /\s+/g,
        commaSplit: /[,]+/,
        dateFormatDash: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        dateFormatSlash: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        dateFormatTextual: /^(\d{1,2})\s*([A-Za-z]+)\s*(\d{4})$/
    };

    const STARTDATE_MONTHS = [
        { index: 0, name: 'January', abbrev: 'Jan', aliases: ['january', 'jan'] },
        { index: 1, name: 'February', abbrev: 'Feb', aliases: ['february', 'feb'] },
        { index: 2, name: 'March', abbrev: 'Mar', aliases: ['march', 'mar'] },
        { index: 3, name: 'April', abbrev: 'Apr', aliases: ['april', 'apr'] },
        { index: 4, name: 'May', abbrev: 'May', aliases: ['may'] },
        { index: 5, name: 'June', abbrev: 'Jun', aliases: ['june', 'jun'] },
        { index: 6, name: 'July', abbrev: 'Jul', aliases: ['july', 'jul'] },
        { index: 7, name: 'August', abbrev: 'Aug', aliases: ['august', 'aug'] },
        { index: 8, name: 'September', abbrev: 'Sep', aliases: ['september', 'sep', 'sept'] },
        { index: 9, name: 'October', abbrev: 'Oct', aliases: ['october', 'oct'] },
        { index: 10, name: 'November', abbrev: 'Nov', aliases: ['november', 'nov'] },
        { index: 11, name: 'December', abbrev: 'Dec', aliases: ['december', 'dec'] }
    ];

    const STARTDATE_ATTRS = {
        ariaBusyTarget: 'body',
        ariaBusyAttr: 'aria-busy'
    };

    const STARTDATE_SCROLL = {
        stepPx: 500,
        maxNoProgressIterations: 8,
        retryScanAttempts: 3
    };

    const STARTDATE_COUNTERS = {
        total: 0,
        saved: 0,
        alreadySet: 0,
        notFound: 0,
        failures: 0,
        pending: 0
    };

    var startDateState = {
        isRunning: false,
        stopRequested: false,
        observers: [],
        timeouts: [],
        intervals: [],
        eventListeners: [],
        idleCallbackIds: [],
        focusReturnElement: null,
        prevAriaBusy: null,
        parsedNames: [],
        parsedDate: null,
        scannedNames: [],
        seenNormalizedNames: new Set(),
        scrollContainer: null,
        prevScrollTop: 0,
        userScrollHandler: null,
        userScrollPaused: false,
        lastAutoScrollTime: 0,
        leftPanelRowIndex: 0,
        counters: { total: 0, saved: 0, alreadySet: 0, notFound: 0, failures: 0, pending: 0 }
    };

    function resetStartDateState() {
        addLogMessage('resetStartDateState: resetting state', 'log');
        startDateState.isRunning = false;
        startDateState.stopRequested = false;
        startDateState.observers = [];
        startDateState.timeouts = [];
        startDateState.intervals = [];
        startDateState.eventListeners = [];
        startDateState.idleCallbackIds = [];
        startDateState.prevAriaBusy = null;
        startDateState.parsedNames = [];
        startDateState.parsedDate = null;
        startDateState.scannedNames = [];
        startDateState.seenNormalizedNames = new Set();
        startDateState.scrollContainer = null;
        startDateState.prevScrollTop = 0;
        startDateState.userScrollHandler = null;
        startDateState.userScrollPaused = false;
        startDateState.lastAutoScrollTime = 0;
        startDateState.leftPanelRowIndex = 0;
        startDateState.counters = {
            total: 0,
            saved: 0,
            alreadySet: 0,
            notFound: 0,
            failures: 0,
            pending: 0
        };
    }

    function startDateWaitForElement(selector, timeout) {
        addLogMessage('startDateWaitForElement: waiting for ' + selector, 'log');
        return new Promise(function(resolve, reject) {
            var element = document.querySelector(selector);
            if (element) {
                addLogMessage('startDateWaitForElement: found immediately', 'log');
                resolve(element);
                return;
            }
            var observer = new MutationObserver(function(mutations, obs) {
                var el = document.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    var idx = startDateState.observers.indexOf(obs);
                    if (idx > -1) {
                        startDateState.observers.splice(idx, 1);
                    }
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            startDateState.observers.push(observer);
            var timeoutId = setTimeout(function() {
                observer.disconnect();
                var idx = startDateState.observers.indexOf(observer);
                if (idx > -1) {
                    startDateState.observers.splice(idx, 1);
                }
                addLogMessage('startDateWaitForElement: timeout for ' + selector, 'warn');
                reject(new Error('Timeout waiting for ' + selector));
            }, timeout);
            startDateState.timeouts.push(timeoutId);
        });
    }

    function startDateDelay(ms) {
        return new Promise(function(resolve) {
            var tid = setTimeout(resolve, ms);
            startDateState.timeouts.push(tid);
        });
    }

    function startDateSetAriaBusyOn() {
        var target = document.querySelector(STARTDATE_ATTRS.ariaBusyTarget);
        if (target) {
            startDateState.prevAriaBusy = target.getAttribute(STARTDATE_ATTRS.ariaBusyAttr);
            target.setAttribute(STARTDATE_ATTRS.ariaBusyAttr, 'true');
            addLogMessage('startDateSetAriaBusyOn: set aria-busy=true', 'log');
        }
    }

    function startDateSetAriaBusyOff() {
        var target = document.querySelector(STARTDATE_ATTRS.ariaBusyTarget);
        if (target) {
            if (startDateState.prevAriaBusy !== null) {
                target.setAttribute(STARTDATE_ATTRS.ariaBusyAttr, startDateState.prevAriaBusy);
            } else {
                target.removeAttribute(STARTDATE_ATTRS.ariaBusyAttr);
            }
            startDateState.prevAriaBusy = null;
            addLogMessage('startDateSetAriaBusyOff: restored aria-busy', 'log');
        }
    }

    function updateStartDateAriaLive(message) {
        addLogMessage('updateStartDateAriaLive: ' + message, 'log');
        var lr = document.getElementById('startdate-aria-live');
        if (lr) {
            lr.textContent = message;
        }
    }

    function parseNamesInputForStartDate(text) {
        addLogMessage('parseNamesInputForStartDate: parsing input', 'log');
        if (!text || !text.trim()) {
            addLogMessage('parseNamesInputForStartDate: empty input', 'warn');
            return [];
        }
        var results = [];
        var seenKeys = new Set();
        var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        for (var li = 0; li < lines.length; li++) {
            var parts = lines[li].split(STARTDATE_REGEX.commaSplit);
            for (var pi = 0; pi < parts.length; pi++) {
                var name = parts[pi].trim();
                if (!name) {
                    continue;
                }
                name = name.replace(STARTDATE_REGEX.whitespace, ' ').trim();
                if (!name) {
                    continue;
                }
                var pairKey = normalizeFirstLastPair(name);
                if (!pairKey) {
                    addLogMessage('parseNamesInputForStartDate: could not normalize "' + name + '", skip', 'warn');
                    continue;
                }
                if (seenKeys.has(pairKey)) {
                    addLogMessage('parseNamesInputForStartDate: duplicate pairKey "' + pairKey + '" for "' + name + '"', 'log');
                    results.push({
                        display: name,
                        pairKey: pairKey,
                        status: STARTDATE_LABELS.statusDuplicate,
                        isDuplicate: true
                    });
                    continue;
                }
                seenKeys.add(pairKey);
                results.push({
                    display: name,
                    pairKey: pairKey,
                    status: STARTDATE_LABELS.statusPending
                });
            }
        }
        addLogMessage('parseNamesInputForStartDate: parsed ' + results.length + ' unique names', 'log');
        return results;
    }

    function parseStartDateValue(text) {
        addLogMessage('parseStartDateValue: parsing date "' + text + '"', 'log');
        if (!text || !text.trim()) {
            addLogMessage('parseStartDateValue: empty input', 'warn');
            return null;
        }
        var trimmed = text.trim();
        var month = -1;
        var day = -1;
        var year = -1;
        var dashMatch = trimmed.match(STARTDATE_REGEX.dateFormatDash);
        if (dashMatch) {
            month = parseInt(dashMatch[1], 10);
            day = parseInt(dashMatch[2], 10);
            year = parseInt(dashMatch[3], 10);
        }
        if (month === -1) {
            var slashMatch = trimmed.match(STARTDATE_REGEX.dateFormatSlash);
            if (slashMatch) {
                month = parseInt(slashMatch[1], 10);
                day = parseInt(slashMatch[2], 10);
                year = parseInt(slashMatch[3], 10);
            }
        }
        if (month !== -1 && day !== -1 && year !== -1) {
            if (month < 1 || month > 12) {
                addLogMessage('parseStartDateValue: invalid month ' + month, 'warn');
                return null;
            }
            var monthIndex0 = month - 1;
            var testDate = new Date(year, monthIndex0, day);
            if (testDate.getFullYear() !== year || testDate.getMonth() !== monthIndex0 || testDate.getDate() !== day) {
                addLogMessage('parseStartDateValue: invalid calendar date ' + month + '/' + day + '/' + year, 'warn');
                return null;
            }
            var monthInfo = STARTDATE_MONTHS[monthIndex0];
            addLogMessage('parseStartDateValue: parsed US format month=' + monthInfo.name + ' day=' + day + ' year=' + year, 'log');
            return {
                year: year,
                monthIndex0: monthIndex0,
                day: day,
                displayMonthName: monthInfo.name,
                displayMonthAbbrev: monthInfo.abbrev,
                original: trimmed
            };
        }
        var textMatch = trimmed.match(STARTDATE_REGEX.dateFormatTextual);
        if (textMatch) {
            var tDay = parseInt(textMatch[1], 10);
            var tMonthStr = textMatch[2].toLowerCase();
            var tYear = parseInt(textMatch[3], 10);
            var foundMonth = null;
            for (var mi = 0; mi < STARTDATE_MONTHS.length; mi++) {
                var monthEntry = STARTDATE_MONTHS[mi];
                for (var ai = 0; ai < monthEntry.aliases.length; ai++) {
                    if (tMonthStr === monthEntry.aliases[ai]) {
                        foundMonth = monthEntry;
                        break;
                    }
                }
                if (foundMonth) {
                    break;
                }
            }
            if (!foundMonth) {
                addLogMessage('parseStartDateValue: unrecognized month name "' + textMatch[2] + '"', 'warn');
                return null;
            }
            var testDate2 = new Date(tYear, foundMonth.index, tDay);
            if (testDate2.getFullYear() !== tYear || testDate2.getMonth() !== foundMonth.index || testDate2.getDate() !== tDay) {
                addLogMessage('parseStartDateValue: invalid calendar date ' + tDay + ' ' + foundMonth.name + ' ' + tYear, 'warn');
                return null;
            }
            addLogMessage('parseStartDateValue: parsed textual format month=' + foundMonth.name + ' day=' + tDay + ' year=' + tYear, 'log');
            return {
                year: tYear,
                monthIndex0: foundMonth.index,
                day: tDay,
                displayMonthName: foundMonth.name,
                displayMonthAbbrev: foundMonth.abbrev,
                original: trimmed
            };
        }
        addLogMessage('parseStartDateValue: no format matched for "' + trimmed + '"', 'warn');
        return null;
    }

    function showStartDateWarning() {
        addLogMessage('showStartDateWarning: creating warning popup', 'log');
        var modal = document.createElement('div');
        modal.id = 'startdate-warning-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 30000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 12px; padding: 24px; width: 450px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'alertdialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'startdate-warning-title');
        container.setAttribute('aria-describedby', 'startdate-warning-message');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        var title = document.createElement('h3');
        title.id = 'startdate-warning-title';
        title.textContent = STARTDATE_LABELS.warningTitle;
        title.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close warning');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        var closeWarning = function() {
            addLogMessage('showStartDateWarning: closing warning', 'log');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            if (startDateState.focusReturnElement) {
                startDateState.focusReturnElement.focus();
            }
        };
        closeButton.onclick = closeWarning;
        header.appendChild(title);
        header.appendChild(closeButton);
        var messageDiv = document.createElement('p');
        messageDiv.id = 'startdate-warning-message';
        messageDiv.textContent = STARTDATE_LABELS.warningMessage;
        messageDiv.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px; line-height: 1.5;';
        var okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; margin-top: 20px; width: 100%;';
        okButton.onmouseover = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.3)';
        };
        okButton.onmouseout = function() {
            okButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        okButton.onclick = closeWarning;
        var keyHandler = function(e) {
            if (e.key === 'Escape') {
                closeWarning();
            }
        };
        document.addEventListener('keydown', keyHandler);
        startDateState.eventListeners.push({ element: document, type: 'keydown', handler: keyHandler });
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
        okButton.focus();
        addLogMessage('showStartDateWarning: warning displayed', 'log');
    }

    function showStartDateInputPanel() {
        addLogMessage('showStartDateInputPanel: creating input panel', 'log');
        var modal = document.createElement('div');
        modal.id = 'startdate-input-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 550px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'startdate-input-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
        var titleEl = document.createElement('h3');
        titleEl.id = 'startdate-input-title';
        titleEl.textContent = STARTDATE_LABELS.inputTitle;
        titleEl.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600; letter-spacing: 0.2px;';
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close panel');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showStartDateInputPanel: closed by user', 'warn');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            stopStartDate();
        };
        header.appendChild(titleEl);
        header.appendChild(closeButton);
        var description = document.createElement('p');
        description.style.cssText = 'color: rgba(255, 255, 255, 0.9); margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;';
        description.append('Rules:');
        description.appendChild(document.createElement('br'));
        var lines = [
            'Enter staff names below, separated by commas or new lines.',
            'Enter the start date in one of these formats: MM-DD-YYYY, M/D/YYYY, or DDMonthYYYY (e.g. 15Jan2025).',
            'After clicking Continue, do not click anywhere else on the page.'
        ];
        for (var i = 0; i < lines.length; i++) {
            description.appendChild(document.createTextNode('\u2022 ' + lines[i]));
            if (i < lines.length - 1) {
                description.appendChild(document.createElement('br'));
            }
        }
        var namesLabel = document.createElement('label');
        namesLabel.setAttribute('for', 'startdate-names-input');
        namesLabel.textContent = 'Staff Names';
        namesLabel.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 600; margin-bottom: 6px; margin-top: 12px;';
        var textarea = document.createElement('textarea');
        textarea.id = 'startdate-names-input';
        textarea.placeholder = 'John Smith, Jane Doe\nor\nJohn Smith\nJane Doe';
        textarea.setAttribute('aria-label', 'Staff names input');
        textarea.style.cssText = 'width: 100%; height: 140px; padding: 12px 14px; border: 2px solid rgba(255, 255, 255, 0.35); border-radius: 10px; background: rgba(255, 255, 255, 0.95); color: #1e293b; font-size: 14px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; resize: vertical; outline: none; transition: all 0.25s ease; box-shadow: 0 2px 0 rgba(0,0,0,0.04) inset; box-sizing: border-box;';
        textarea.onfocus = function() {
            textarea.style.borderColor = '#8ea0ff';
            textarea.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.25)';
        };
        textarea.onblur = function() {
            textarea.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            textarea.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04) inset';
        };
        var dateLabel = document.createElement('label');
        dateLabel.setAttribute('for', 'startdate-date-input');
        dateLabel.textContent = 'Start Date';
        dateLabel.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 600; margin-bottom: 6px; margin-top: 12px;';
        var dateInput = document.createElement('input');
        dateInput.type = 'text';
        dateInput.id = 'startdate-date-input';
        dateInput.placeholder = 'MM-DD-YYYY or 15Jan2025';
        dateInput.setAttribute('aria-label', 'Start date input');
        dateInput.style.cssText = 'width: 100%; padding: 10px 14px; border: 2px solid rgba(255, 255, 255, 0.35); border-radius: 10px; background: rgba(255, 255, 255, 0.95); color: #1e293b; font-size: 14px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; outline: none; transition: all 0.25s ease; box-shadow: 0 2px 0 rgba(0,0,0,0.04) inset; box-sizing: border-box;';
        dateInput.onfocus = function() {
            dateInput.style.borderColor = '#8ea0ff';
            dateInput.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.25)';
        };
        dateInput.onblur = function() {
            dateInput.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            dateInput.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04) inset';
        };
        var continueButton = document.createElement('button');
        continueButton.textContent = 'Continue';
        continueButton.disabled = true;
        continueButton.setAttribute('aria-label', 'Continue with start date assignment');
        continueButton.style.cssText = 'background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; transition: all 0.25s ease; opacity: 0.5;';
        var dateStatusDiv = document.createElement('div');
        dateStatusDiv.id = 'startdate-date-status';
        dateStatusDiv.setAttribute('aria-live', 'polite');
        dateStatusDiv.style.cssText = 'color: rgba(255, 255, 255, 0.8); font-size: 12px; margin-top: 4px; min-height: 18px;';
        var updateContinueState = function() {
            var parsedNames = parseNamesInputForStartDate(textarea.value);
            var parsedDate = parseStartDateValue(dateInput.value);
            var hasValidNames = parsedNames.length > 0;
            var hasValidDate = parsedDate !== null;
            if (hasValidDate) {
                dateStatusDiv.textContent = 'Parsed: ' + parsedDate.displayMonthName + ' ' + parsedDate.day + ', ' + parsedDate.year;
                dateStatusDiv.style.color = '#6bcf7f';
            } else if (dateInput.value.trim().length > 0) {
                dateStatusDiv.textContent = 'Invalid date format';
                dateStatusDiv.style.color = '#ffd93d';
            } else {
                dateStatusDiv.textContent = '';
            }
            if (hasValidNames && hasValidDate) {
                continueButton.disabled = false;
                continueButton.style.opacity = '1';
                continueButton.style.cursor = 'pointer';
            } else {
                continueButton.disabled = true;
                continueButton.style.opacity = '0.5';
                continueButton.style.cursor = 'not-allowed';
            }
        };
        textarea.addEventListener('input', updateContinueState);
        startDateState.eventListeners.push({ element: textarea, type: 'input', handler: updateContinueState });
        dateInput.addEventListener('input', updateContinueState);
        startDateState.eventListeners.push({ element: dateInput, type: 'input', handler: updateContinueState });
        continueButton.onmouseover = function() {
            if (!continueButton.disabled) {
                continueButton.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)';
            }
        };
        continueButton.onmouseout = function() {
            continueButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        };
        continueButton.onclick = function() {
            if (continueButton.disabled) {
                return;
            }
            addLogMessage('showStartDateInputPanel: Continue clicked', 'log');
            var parsedNames = parseNamesInputForStartDate(textarea.value);
            var parsedDate = parseStartDateValue(dateInput.value);
            if (parsedNames.length === 0 || !parsedDate) {
                addLogMessage('showStartDateInputPanel: validation failed on click', 'warn');
                return;
            }
            startDateState.parsedNames = parsedNames;
            startDateState.parsedDate = parsedDate;
            addLogMessage('showStartDateInputPanel: parsedNames=' + parsedNames.length + ' date=' + parsedDate.displayMonthName + ' ' + parsedDate.day + ', ' + parsedDate.year, 'log');
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            startDateState.isRunning = true;
            showCollectingDataPanel('startdate', STARTDATE_LABELS.featureButton);
            startStartDateScan();
        };
        var clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All';
        clearButton.setAttribute('aria-label', 'Clear all inputs');
        clearButton.style.cssText = 'background: rgba(255, 255, 255, 0.18); border: 2px solid rgba(255, 255, 255, 0.35); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.25s ease; backdrop-filter: blur(2px);';
        clearButton.onmouseover = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.28)';
        };
        clearButton.onmouseout = function() {
            clearButton.style.background = 'rgba(255, 255, 255, 0.18)';
        };
        clearButton.onclick = function() {
            addLogMessage('showStartDateInputPanel: Clear All clicked', 'log');
            textarea.value = '';
            dateInput.value = '';
            dateStatusDiv.textContent = '';
            continueButton.disabled = true;
            continueButton.style.opacity = '0.5';
            continueButton.style.cursor = 'not-allowed';
            textarea.focus();
        };
        var keyHandler = function(e) {
            if (e.key === 'Escape') {
                addLogMessage('showStartDateInputPanel: Escape pressed', 'log');
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
                stopStartDate();
            }
        };
        document.addEventListener('keydown', keyHandler);
        startDateState.eventListeners.push({ element: document, type: 'keydown', handler: keyHandler });
        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;';
        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(continueButton);
        container.appendChild(header);
        container.appendChild(description);
        container.appendChild(namesLabel);
        container.appendChild(textarea);
        container.appendChild(dateLabel);
        container.appendChild(dateInput);
        container.appendChild(dateStatusDiv);
        container.appendChild(buttonContainer);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        textarea.focus();
        addLogMessage('showStartDateInputPanel: panel displayed', 'log');
    }

    function startDateScanVisibleRowsOnce() {
        var gridTable = document.querySelector(STARTDATE_SELECTORS.mainGridTable);
        if (!gridTable) {
            return 0;
        }
        var rows = gridTable.querySelectorAll(STARTDATE_SELECTORS.mainGridRow);
        var newCount = 0;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (row.getAttribute('role') === 'columnheader') {
                continue;
            }
            var cells = row.querySelectorAll(STARTDATE_SELECTORS.mainGridCell);
            if (cells.length <= STARTDATE_SELECTORS.nameCellIndex) {
                continue;
            }
            var targetCell = cells[STARTDATE_SELECTORS.nameCellIndex];
            var primaryElement = targetCell.querySelector(STARTDATE_SELECTORS.namePrimary);
            var extractedName = null;
            if (primaryElement) {
                var brElement = primaryElement.querySelector('br');
                if (brElement) {
                    var nameText = '';
                    for (var ni = 0; ni < primaryElement.childNodes.length; ni++) {
                        var node = primaryElement.childNodes[ni];
                        if (node.nodeName === 'BR') {
                            break;
                        }
                        if (node.nodeType === Node.TEXT_NODE) {
                            nameText += node.textContent;
                        }
                    }
                    extractedName = nameText.trim().replace(/\s+/g, ' ');
                } else {
                    extractedName = primaryElement.textContent.trim().replace(/\s+/g, ' ');
                }
            }
            if (!extractedName) {
                var fallbackElement = targetCell.querySelector(STARTDATE_SELECTORS.nameFallback);
                if (fallbackElement) {
                    extractedName = fallbackElement.textContent.trim().replace(/\s+/g, ' ');
                }
            }
            if (!extractedName) {
                continue;
            }
            var normalized = elogNormalizeName(extractedName);
            if (startDateState.seenNormalizedNames.has(normalized)) {
                continue;
            }
            startDateState.seenNormalizedNames.add(normalized);
            startDateState.scannedNames.push(extractedName);
            newCount++;
            startDateState.leftPanelRowIndex++;
        }
        if (newCount > 0) {
            addLogMessage('startDateScanVisibleRowsOnce: batch of ' + newCount + ' new names', 'log');
        }
        return newCount;
    }

    function startDateGetRenderedLastRowKey() {
        var gridTable = document.querySelector(STARTDATE_SELECTORS.mainGridTable);
        if (!gridTable) {
            return '';
        }
        var rows = gridTable.querySelectorAll(STARTDATE_SELECTORS.mainGridRow);
        var lastDataRow = null;
        for (var i = rows.length - 1; i >= 0; i--) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                lastDataRow = rows[i];
                break;
            }
        }
        if (!lastDataRow) {
            return '';
        }
        var cells = lastDataRow.querySelectorAll(STARTDATE_SELECTORS.mainGridCell);
        if (cells.length > 0) {
            var firstCellText = cells[0].textContent.trim();
            if (firstCellText) {
                return firstCellText;
            }
        }
        var hash = 0;
        var content = lastDataRow.textContent || '';
        for (var ci = 0; ci < content.length; ci++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(ci);
            hash = hash & hash;
        }
        return 'hash_' + hash;
    }

    function startDateGetRenderedRowCount() {
        var gridTable = document.querySelector(STARTDATE_SELECTORS.mainGridTable);
        if (!gridTable) {
            return 0;
        }
        var rows = gridTable.querySelectorAll(STARTDATE_SELECTORS.mainGridRow);
        var count = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute('role') !== 'columnheader') {
                count++;
            }
        }
        return count;
    }

    function startDateAwaitSettle(container) {
        return new Promise(function(resolve) {
            var gridTable = document.querySelector(STARTDATE_SELECTORS.mainGridTable);
            var resolved = false;
            var observer = null;
            var debounceTimer = null;
            function finish() {
                if (resolved) {
                    return;
                }
                resolved = true;
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                if (observer) {
                    observer.disconnect();
                    var idx = startDateState.observers.indexOf(observer);
                    if (idx > -1) {
                        startDateState.observers.splice(idx, 1);
                    }
                }
                resolve();
            }
            var maxTimeoutId = setTimeout(function() {
                addLogMessage('startDateAwaitSettle: max timeout reached', 'log');
                finish();
            }, STARTDATE_TIMEOUTS.scanSettleMs * 5);
            startDateState.timeouts.push(maxTimeoutId);
            if (gridTable) {
                observer = new MutationObserver(function() {
                    if (resolved) {
                        return;
                    }
                    if (debounceTimer) {
                        clearTimeout(debounceTimer);
                    }
                    debounceTimer = setTimeout(function() {
                        finish();
                    }, STARTDATE_TIMEOUTS.scanSettleMs);
                    startDateState.timeouts.push(debounceTimer);
                });
                observer.observe(gridTable, { childList: true, subtree: true });
                startDateState.observers.push(observer);
            }
            debounceTimer = setTimeout(function() {
                finish();
            }, STARTDATE_TIMEOUTS.scanSettleMs);
            startDateState.timeouts.push(debounceTimer);
        });
    }

    function startDateObserveUserScrollPause(container) {
        if (!container || startDateState.userScrollHandler) {
            return;
        }
        startDateState.userScrollHandler = function() {
            var timeSinceAuto = Date.now() - startDateState.lastAutoScrollTime;
            if (timeSinceAuto > 50 && !startDateState.userScrollPaused) {
                startDateState.userScrollPaused = true;
                var resumeTimeout = setTimeout(function() {
                    startDateState.userScrollPaused = false;
                }, 800);
                startDateState.timeouts.push(resumeTimeout);
            }
        };
        container.addEventListener('scroll', startDateState.userScrollHandler);
        startDateState.eventListeners.push({ element: container, type: 'scroll', handler: startDateState.userScrollHandler });
    }

    function startStartDateScan() {
        addLogMessage('startStartDateScan: beginning scan with auto-scroll', 'log');
        startDateState.scannedNames = [];
        startDateState.seenNormalizedNames = new Set();
        startDateState.leftPanelRowIndex = 0;
        startDateWaitForElement(STARTDATE_SELECTORS.mainTableContainer, STARTDATE_TIMEOUTS.waitTableMs)
            .then(function() {
            addLogMessage('startStartDateScan: main table found', 'log');
            return startDateWaitForElement(STARTDATE_SELECTORS.mainGridTable, STARTDATE_TIMEOUTS.waitGridMs);
        })
            .then(function(gridTable) {
            addLogMessage('startStartDateScan: grid table found, starting auto-scroll scan', 'log');
            startDateAutoScrollScan({
                onDone: function(data) {
                    addLogMessage('startStartDateScan: done - total=' + data.total + ' reason=' + data.reason, 'log');
                    removeCollectingDataPanel('startdate');
                    if (data.reason !== 'stopped' && startDateState.isRunning) {
                        addLogMessage('startStartDateScan: scan complete, showing progress panel', 'log');
                        showStartDateProgressPanel();
                    }
                },
                onError: function(error) {
                    addLogMessage('startStartDateScan: error - ' + error.message, 'error');
                    removeCollectingDataPanel('startdate');
                    showStartDateProgressPanel();
                }
            });
        })
            .catch(function(error) {
            addLogMessage('startStartDateScan: error during scan: ' + error, 'error');
            removeCollectingDataPanel('startdate');
            showStartDateProgressPanel();
        });
    }

    function startDateAutoScrollScan(options) {
        addLogMessage('startDateAutoScrollScan: starting', 'log');
        var onDone = options.onDone || function() {};
        var onError = options.onError || function() {};
        var gridTable = document.querySelector(STARTDATE_SELECTORS.mainGridTable);
        if (!gridTable) {
            addLogMessage('startDateAutoScrollScan: grid not found', 'error');
            onError(new Error('Grid table not found'));
            return;
        }
        var container = findScrollableContainer(gridTable);
        if (!container) {
            addLogMessage('startDateAutoScrollScan: container not found', 'error');
            onError(new Error('Container not found'));
            return;
        }
        startDateState.scrollContainer = container;
        startDateState.prevScrollTop = container.scrollTop;
        startDateSetAriaBusyOn();
        startDateObserveUserScrollPause(container);
        addLogMessage('startDateAutoScrollScan: scrolling to top before scan', 'log');
        container.scrollTo({ top: 0, behavior: 'auto' });
        var startTime = Date.now();
        var noProgress = 0;
        var prevScrollHeight = container.scrollHeight;
        function initialScan() {
            startDateScanVisibleRowsOnce();
            prevScrollHeight = container.scrollHeight;
            var initScrollTimeout = setTimeout(scrollLoop, STARTDATE_TIMEOUTS.idleBetweenBatchesMs);
            startDateState.timeouts.push(initScrollTimeout);
        }
        function scrollLoop() {
            if (!startDateState.isRunning || startDateState.stopRequested) {
                finishScan('stopped');
                return;
            }
            if (Date.now() - startTime > STARTDATE_TIMEOUTS.maxScanDurationMs) {
                finishScan('timeout');
                return;
            }
            if (startDateState.userScrollPaused) {
                var pt = setTimeout(scrollLoop, 100);
                startDateState.timeouts.push(pt);
                return;
            }
            var currentScrollHeight = container.scrollHeight;
            if (currentScrollHeight > prevScrollHeight) {
                noProgress = 0;
                prevScrollHeight = currentScrollHeight;
            }
            var priorKey = startDateGetRenderedLastRowKey();
            var priorCount = startDateGetRenderedRowCount();
            var currTop = container.scrollTop;
            var maxScroll = container.scrollHeight - container.clientHeight;
            var newTop = Math.min(currTop + STARTDATE_SCROLL.stepPx, maxScroll);
            startDateState.lastAutoScrollTime = Date.now();
            container.scrollTo({ top: newTop, behavior: 'auto' });
            startDateAwaitSettle(container).then(function() {
                var attempts = 0;
                function attemptScan() {
                    var rc = startDateGetRenderedRowCount();
                    if (rc === 0 && attempts < STARTDATE_SCROLL.retryScanAttempts) {
                        attempts++;
                        var rt = setTimeout(attemptScan, STARTDATE_TIMEOUTS.retryScanDelayMs);
                        startDateState.timeouts.push(rt);
                        return;
                    }
                    startDateScanVisibleRowsOnce();
                    var currKey = startDateGetRenderedLastRowKey();
                    var currCount = startDateGetRenderedRowCount();
                    var postScrollHeight = container.scrollHeight;
                    if (postScrollHeight > prevScrollHeight) {
                        noProgress = 0;
                        prevScrollHeight = postScrollHeight;
                    } else if (currKey === priorKey && currCount === priorCount) {
                        noProgress++;
                    } else {
                        noProgress = 0;
                    }
                    if (computeEndReached(container, noProgress)) {
                        finishScan('endReached');
                        return;
                    }
                    if (noProgress >= STARTDATE_SCROLL.maxNoProgressIterations) {
                        finishScan('noProgress');
                        return;
                    }
                    if (typeof requestIdleCallback === 'function') {
                        var icbId = requestIdleCallback(function() {
                            var idx = startDateState.idleCallbackIds.indexOf(icbId);
                            if (idx > -1) {
                                startDateState.idleCallbackIds.splice(idx, 1);
                            }
                            scrollLoop();
                        }, { timeout: STARTDATE_TIMEOUTS.idleBetweenBatchesMs * 2 });
                        startDateState.idleCallbackIds.push(icbId);
                    } else {
                        var it = setTimeout(scrollLoop, STARTDATE_TIMEOUTS.idleBetweenBatchesMs);
                        startDateState.timeouts.push(it);
                    }
                }
                attemptScan();
            });
        }
        function finishScan(reason) {
            addLogMessage('startDateAutoScrollScan: done reason=' + reason + ' total=' + startDateState.scannedNames.length, 'log');
            startDateSetAriaBusyOff();
            onDone({ total: startDateState.scannedNames.length, reason: reason });
        }
        function waitForStableScrollHeight(callback) {
            var checks = 0;
            var maxChecks = 5;
            var lastHeight = container.scrollHeight;
            var stableCount = 0;
            function checkHeight() {
                if (!startDateState.isRunning) {
                    return;
                }
                var currentHeight = container.scrollHeight;
                if (currentHeight === lastHeight) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastHeight = currentHeight;
                }
                checks++;
                if (stableCount >= 2 || checks >= maxChecks) {
                    callback();
                    return;
                }
                var tid = setTimeout(checkHeight, 500);
                startDateState.timeouts.push(tid);
            }
            var tid = setTimeout(checkHeight, 500);
            startDateState.timeouts.push(tid);
        }
        startDateAwaitSettle(container).then(function() {
            waitForStableScrollHeight(function() {
                initialScan();
            });
        });
    }

    function showStartDateProgressPanel() {
        addLogMessage('showStartDateProgressPanel: creating progress panel', 'log');
        startDateState.isRunning = true;
        var modal = document.createElement('div');
        modal.id = 'startdate-progress-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        var container = document.createElement('div');
        container.id = 'startdate-progress-container';
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; width: 900px; max-width: 95%; max-height: 80vh; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); position: relative; display: flex; flex-direction: column;';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'startdate-progress-title');
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0;';
        var titleContainer = document.createElement('div');
        titleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
        var titleEl = document.createElement('h3');
        titleEl.id = 'startdate-progress-title';
        titleEl.textContent = STARTDATE_LABELS.featureButton + ' - Processing';
        titleEl.style.cssText = 'margin: 0; color: white; font-size: 18px; font-weight: 600;';
        var statusBadge = document.createElement('span');
        statusBadge.id = 'startdate-status-badge';
        statusBadge.textContent = STARTDATE_LABELS.progressInProgress;
        statusBadge.style.cssText = 'background: rgba(255, 255, 255, 0.3); color: #ffd93d; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;';
        titleContainer.appendChild(titleEl);
        titleContainer.appendChild(statusBadge);
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '\u2715';
        closeButton.setAttribute('aria-label', 'Close and stop');
        closeButton.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        closeButton.onmouseover = function() {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = function() {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = function() {
            addLogMessage('showStartDateProgressPanel: closed by user', 'warn');
            stopStartDate();
        };
        header.appendChild(titleContainer);
        header.appendChild(closeButton);
        var dateInfoBar = document.createElement('div');
        dateInfoBar.style.cssText = 'margin-bottom: 12px; padding: 8px 12px; background: rgba(0, 0, 0, 0.15); border-radius: 8px; flex-shrink: 0;';
        var dateInfoText = document.createElement('span');
        dateInfoText.style.cssText = 'color: rgba(255, 255, 255, 0.9); font-size: 13px;';
        dateInfoText.textContent = 'Setting Start Date: ' + startDateState.parsedDate.displayMonthName + ' ' + startDateState.parsedDate.day + ', ' + startDateState.parsedDate.year;
        dateInfoBar.appendChild(dateInfoText);
        var panelsContainer = document.createElement('div');
        panelsContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; overflow: hidden;';
        var leftPanel = createSubpanel('Scanned Log Entries', 'startdate-left-panel', 'startdate-left-search');
        var rightPanel = createSubpanel('Start Date Status', 'startdate-right-panel', 'startdate-right-search');
        panelsContainer.appendChild(leftPanel);
        panelsContainer.appendChild(rightPanel);
        var summaryFooter = document.createElement('div');
        summaryFooter.id = 'startdate-summary-footer';
        summaryFooter.setAttribute('aria-label', 'Processing summary');
        summaryFooter.style.cssText = 'display: flex; justify-content: space-around; align-items: center; padding: 10px 16px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; margin-top: 12px; flex-shrink: 0;';
        var nonDuplicateCount = 0;
        for (var ndi = 0; ndi < startDateState.parsedNames.length; ndi++) {
            if (!startDateState.parsedNames[ndi].isDuplicate) {
                nonDuplicateCount++;
            }
        }
        startDateState.counters = {
            total: nonDuplicateCount,
            saved: 0,
            alreadySet: 0,
            notFound: 0,
            failures: 0,
            pending: nonDuplicateCount
        };
        addLogMessage('showStartDateProgressPanel: nonDuplicateCount=' + nonDuplicateCount, 'log');
        var summaryItems = [
            { id: 'startdate-summary-total', label: 'Total', value: String(nonDuplicateCount) },
            { id: 'startdate-summary-saved', label: 'Saved', value: '0' },
            { id: 'startdate-summary-alreadyset', label: 'Already Set', value: '0' },
            { id: 'startdate-summary-notfound', label: 'Not Found', value: '0' },
            { id: 'startdate-summary-failed', label: 'Failed', value: '0' },
            { id: 'startdate-summary-pending', label: 'Pending', value: String(nonDuplicateCount) },
            { id: 'startdate-summary-percent', label: 'Progress', value: '0%' }
        ];
        for (var si = 0; si < summaryItems.length; si++) {
            var sItem = document.createElement('div');
            sItem.style.cssText = 'text-align: center;';
            var vSpan = document.createElement('span');
            vSpan.id = summaryItems[si].id;
            vSpan.textContent = summaryItems[si].value;
            vSpan.style.cssText = 'display: block; color: white; font-size: 16px; font-weight: 700;';
            var lSpan = document.createElement('span');
            lSpan.textContent = summaryItems[si].label;
            lSpan.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.6); font-size: 11px; font-weight: 500; margin-top: 2px;';
            sItem.appendChild(vSpan);
            sItem.appendChild(lSpan);
            summaryFooter.appendChild(sItem);
        }
        var ariaLiveRegion = document.createElement('div');
        ariaLiveRegion.id = 'startdate-aria-live';
        ariaLiveRegion.setAttribute('aria-live', 'polite');
        ariaLiveRegion.setAttribute('aria-atomic', 'true');
        ariaLiveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        container.appendChild(header);
        container.appendChild(dateInfoBar);
        container.appendChild(panelsContainer);
        container.appendChild(summaryFooter);
        container.appendChild(ariaLiveRegion);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);
        populateStartDateLeftPanel();
        initializeStartDateRightPanel();
        closeButton.focus();
        addLogMessage('showStartDateProgressPanel: displayed', 'log');
        beginSetStartDatesForQueue();
    }

    function populateStartDateLeftPanel() {
        addLogMessage('populateStartDateLeftPanel: populating with ' + startDateState.scannedNames.length + ' names', 'log');
        var leftPanel = document.getElementById('startdate-left-panel');
        if (!leftPanel) {
            addLogMessage('populateStartDateLeftPanel: left panel not found', 'error');
            return;
        }
        leftPanel.innerHTML = '';
        for (var i = 0; i < startDateState.scannedNames.length; i++) {
            var item = createListItem(startDateState.scannedNames[i], null, null, i + 1);
            leftPanel.appendChild(item);
        }
        addLogMessage('populateStartDateLeftPanel: populated ' + startDateState.scannedNames.length + ' items', 'log');
    }

    function initializeStartDateRightPanel() {
        addLogMessage('initializeStartDateRightPanel: initializing with parsed names', 'log');
        var rightPanel = document.getElementById('startdate-right-panel');
        if (!rightPanel) {
            addLogMessage('initializeStartDateRightPanel: right panel not found', 'error');
            return;
        }
        rightPanel.innerHTML = '';
        for (var i = 0; i < startDateState.parsedNames.length; i++) {
            var candidate = startDateState.parsedNames[i];
            var statusText = STARTDATE_LABELS.statusPending;
            var statusType = 'pending';
            if (candidate.isDuplicate) {
                statusText = STARTDATE_LABELS.statusDuplicate;
                statusType = 'duplicate';
            }
            var item = createListItem(candidate.display, statusText, statusType, i + 1);
            item.setAttribute('data-pairkey', candidate.pairKey);
            if (candidate.isDuplicate) {
                item.setAttribute('data-duplicate', 'true');
            }
            rightPanel.appendChild(item);
        }
        addLogMessage('initializeStartDateRightPanel: added ' + startDateState.parsedNames.length + ' items', 'log');
    }

    function updateStartDateRightPanelStatus(pairKey, newStatus, detailsOptional) {
        addLogMessage('updateStartDateRightPanelStatus: pairKey=' + pairKey + ' status=' + newStatus + (detailsOptional ? ' details=' + detailsOptional : ''), 'log');
        var rightPanel = document.getElementById('startdate-right-panel');
        if (!rightPanel) {
            addLogMessage('updateStartDateRightPanelStatus: right panel not found', 'error');
            return;
        }
        var items = rightPanel.querySelectorAll('.' + ELOG_CSS_CLASSNAMES.listItem);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.getAttribute('data-pairkey') !== pairKey) {
                continue;
            }
            if (item.getAttribute('data-duplicate') === 'true') {
                continue;
            }
            var badge = item.querySelector('.elog-status-badge');
            if (badge) {
                badge.textContent = newStatus;
                var badgeColor = 'rgba(255, 255, 255, 0.7)';
                var badgeBg = 'rgba(255, 255, 255, 0.1)';
                if (newStatus === STARTDATE_LABELS.statusSaved || newStatus === STARTDATE_LABELS.statusCompleted) {
                    badgeColor = '#6bcf7f';
                    badgeBg = 'rgba(107, 207, 127, 0.2)';
                } else if (newStatus === STARTDATE_LABELS.statusAlreadySet) {
                    badgeColor = '#81c784';
                    badgeBg = 'rgba(129, 199, 132, 0.2)';
                } else if (newStatus === STARTDATE_LABELS.statusNotFound) {
                    badgeColor = '#ffa500';
                    badgeBg = 'rgba(255, 165, 0, 0.2)';
                } else if (newStatus === STARTDATE_LABELS.statusFailed ||
                    newStatus === STARTDATE_LABELS.statusSaveFailed ||
                    newStatus === STARTDATE_LABELS.statusEditFailed ||
                    newStatus === STARTDATE_LABELS.statusMenuFailed ||
                    newStatus === STARTDATE_LABELS.statusDatepickerFailed) {
                    badgeColor = '#ff6b6b';
                    badgeBg = 'rgba(255, 107, 107, 0.2)';
                } else if (newStatus === STARTDATE_LABELS.statusStopped ||
                    newStatus === STARTDATE_LABELS.statusDuplicate) {
                    badgeColor = '#aaa';
                    badgeBg = 'rgba(170, 170, 170, 0.2)';
                } else if (newStatus === STARTDATE_LABELS.statusSettingDate ||
                    newStatus === STARTDATE_LABELS.statusSaving ||
                    newStatus === STARTDATE_LABELS.statusLocating ||
                    newStatus === STARTDATE_LABELS.statusEditing ||
                    newStatus === STARTDATE_LABELS.statusEnteringReason) {
                    badgeColor = '#64b5f6';
                    badgeBg = 'rgba(100, 181, 246, 0.2)';
                } else if (newStatus === STARTDATE_LABELS.statusPending) {
                    badgeColor = '#ffd93d';
                    badgeBg = 'rgba(255, 217, 61, 0.2)';
                }
                badge.style.color = badgeColor;
                badge.style.background = badgeBg;
                if (detailsOptional) {
                    badge.setAttribute('title', detailsOptional);
                }
            }
            break;
        }
        var ariaMsg = pairKey + ' ' + newStatus;
        if (detailsOptional) {
            ariaMsg += ' - ' + detailsOptional;
        }
        updateStartDateAriaLive(ariaMsg);
    }

    function updateStartDateRightPanelSummary(counters) {
        var elTotal = document.getElementById('startdate-summary-total');
        var elSaved = document.getElementById('startdate-summary-saved');
        var elAlreadySet = document.getElementById('startdate-summary-alreadyset');
        var elNotFound = document.getElementById('startdate-summary-notfound');
        var elFailed = document.getElementById('startdate-summary-failed');
        var elPending = document.getElementById('startdate-summary-pending');
        var elPercent = document.getElementById('startdate-summary-percent');
        if (elTotal) {
            elTotal.textContent = String(counters.total);
        }
        if (elSaved) {
            elSaved.textContent = String(counters.saved);
        }
        if (elAlreadySet) {
            elAlreadySet.textContent = String(counters.alreadySet);
        }
        if (elNotFound) {
            elNotFound.textContent = String(counters.notFound);
        }
        if (elFailed) {
            elFailed.textContent = String(counters.failures);
        }
        if (elPending) {
            elPending.textContent = String(counters.pending);
        }
        if (elPercent) {
            var processed = counters.total - counters.pending;
            var pct = counters.total > 0 ? Math.round((processed / counters.total) * 100) : 0;
            elPercent.textContent = pct + '%';
        }
        addLogMessage('updateStartDateRightPanelSummary: saved=' + counters.saved + ' alreadySet=' + counters.alreadySet + ' notFound=' + counters.notFound + ' failures=' + counters.failures + ' pending=' + counters.pending, 'log');
    }

    function findRowByNamePairKey(targetPairKey) {
        addLogMessage('findRowByNamePairKey: searching for pairKey=' + targetPairKey, 'log');
        var gridTable = document.querySelector(STARTDATE_SELECTORS.mainGridTable);
        if (!gridTable) {
            addLogMessage('findRowByNamePairKey: grid table not found', 'error');
            return null;
        }
        var rows = gridTable.querySelectorAll(STARTDATE_SELECTORS.mainGridRow);
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (row.getAttribute('role') === 'columnheader') {
                continue;
            }
            var cells = row.querySelectorAll(STARTDATE_SELECTORS.mainGridCell);
            if (cells.length <= STARTDATE_SELECTORS.nameCellIndex) {
                continue;
            }
            var targetCell = cells[STARTDATE_SELECTORS.nameCellIndex];
            var primaryEl = targetCell.querySelector(STARTDATE_SELECTORS.namePrimary);
            var extractedName = null;
            if (primaryEl) {
                var brEl = primaryEl.querySelector('br');
                if (brEl) {
                    var nameText = '';
                    for (var ni = 0; ni < primaryEl.childNodes.length; ni++) {
                        var node = primaryEl.childNodes[ni];
                        if (node.nodeName === 'BR') {
                            break;
                        }
                        if (node.nodeType === Node.TEXT_NODE) {
                            nameText += node.textContent;
                        }
                    }
                    extractedName = nameText.trim().replace(/\s+/g, ' ');
                } else {
                    extractedName = primaryEl.textContent.trim().replace(/\s+/g, ' ');
                }
            }
            if (!extractedName) {
                var fallbackEl = targetCell.querySelector(STARTDATE_SELECTORS.nameFallback);
                if (fallbackEl) {
                    extractedName = fallbackEl.textContent.trim().replace(/\s+/g, ' ');
                }
            }
            if (!extractedName) {
                continue;
            }
            var rowPairKey = normalizeFirstLastPair(extractedName);
            if (rowPairKey === targetPairKey) {
                addLogMessage('findRowByNamePairKey: found match at row ' + i + ' name=' + extractedName, 'log');
                return row;
            }
        }
        addLogMessage('findRowByNamePairKey: no match found for ' + targetPairKey, 'warn');
        return null;
    }

    function openRowMenuAndClickEdit(rowEl) {
        addLogMessage('openRowMenuAndClickEdit: opening row menu', 'log');
        return new Promise(function(resolve, reject) {
            try {
                var editLink = rowEl.querySelector(STARTDATE_SELECTORS.editMenuItemDirect);
                if (editLink) {
                    addLogMessage('openRowMenuAndClickEdit: found Edit link directly, clicking', 'log');
                    editLink.click();
                    var editFormTid = setTimeout(function() {
                        addLogMessage('openRowMenuAndClickEdit: edit form settle complete', 'log');
                        resolve(true);
                    }, STARTDATE_TIMEOUTS.waitEditFormMs);
                    startDateState.timeouts.push(editFormTid);
                    return;
                }
                var menuToggle = rowEl.querySelector(STARTDATE_SELECTORS.rowMenuToggle);
                if (!menuToggle) {
                    var iconEl = rowEl.querySelector(STARTDATE_SELECTORS.rowMenuToggleFallbackIcon);
                    if (iconEl) {
                        menuToggle = iconEl.closest('a') || iconEl.parentElement;
                    }
                }
                if (!menuToggle) {
                    addLogMessage('openRowMenuAndClickEdit: menu toggle not found in row', 'error');
                    reject(new Error('Menu toggle not found'));
                    return;
                }
                addLogMessage('openRowMenuAndClickEdit: clicking menu toggle', 'log');
                menuToggle.click();
                var waitTid = setTimeout(function() {
                    var editBtn = rowEl.querySelector(STARTDATE_SELECTORS.editMenuItemDirect);
                    if (!editBtn) {
                        var fallbackItems = rowEl.querySelectorAll(STARTDATE_SELECTORS.editMenuItemFallback);
                        addLogMessage('openRowMenuAndClickEdit: searching ' + fallbackItems.length + ' fallback menu items', 'log');
                        for (var ei = 0; ei < fallbackItems.length; ei++) {
                            var itemText = fallbackItems[ei].textContent.trim().toLowerCase();
                            if (itemText === 'edit') {
                                editBtn = fallbackItems[ei];
                                break;
                            }
                        }
                    }
                    if (!editBtn) {
                        var globalEdit = document.querySelector(STARTDATE_SELECTORS.editMenuItemDirect);
                        if (globalEdit) {
                            editBtn = globalEdit;
                        }
                    }
                    if (editBtn) {
                        addLogMessage('openRowMenuAndClickEdit: clicking Edit menu item', 'log');
                        editBtn.click();
                        var editFormTid = setTimeout(function() {
                            addLogMessage('openRowMenuAndClickEdit: edit form settle complete', 'log');
                            resolve(true);
                        }, STARTDATE_TIMEOUTS.waitEditFormMs);
                        startDateState.timeouts.push(editFormTid);
                    } else {
                        addLogMessage('openRowMenuAndClickEdit: Edit menu item not found after toggle', 'error');
                        reject(new Error('Edit menu item not found'));
                    }
                }, STARTDATE_TIMEOUTS.waitMenuOpenMs);
                startDateState.timeouts.push(waitTid);
            } catch (error) {
                addLogMessage('openRowMenuAndClickEdit: error: ' + error.message, 'error');
                reject(error);
            }
        });
    }

    function findStartLabeledDatePopup() {
        var allPopups = document.querySelectorAll('date-time-popup');
        addLogMessage('findStartLabeledDatePopup: found ' + allPopups.length + ' date-time-popup elements', 'log');
        for (var pi = 0; pi < allPopups.length; pi++) {
            var popup = allPopups[pi];
            var parent = popup.parentElement;
            if (!parent) {
                continue;
            }
            var siblingInput = parent.querySelector('input[placeholder]');
            if (siblingInput) {
                var placeholder = siblingInput.getAttribute('placeholder').toLowerCase();
                addLogMessage('findStartLabeledDatePopup: popup ' + pi + ' sibling input placeholder="' + placeholder + '"', 'log');
                if (placeholder.indexOf('start') !== -1) {
                    addLogMessage('findStartLabeledDatePopup: matched "Start" placeholder at popup ' + pi, 'log');
                    return popup;
                }
            }
            var labelEl = parent.querySelector('label');
            if (labelEl) {
                var labelText = labelEl.textContent.trim().toLowerCase();
                addLogMessage('findStartLabeledDatePopup: popup ' + pi + ' label text="' + labelText + '"', 'log');
                if (labelText.indexOf('start') !== -1) {
                    addLogMessage('findStartLabeledDatePopup: matched "Start" label at popup ' + pi, 'log');
                    return popup;
                }
            }
            var grandParent = parent.parentElement;
            if (grandParent) {
                var gpInput = grandParent.querySelector('input[placeholder]');
                if (gpInput) {
                    var gpPlaceholder = gpInput.getAttribute('placeholder').toLowerCase();
                    addLogMessage('findStartLabeledDatePopup: popup ' + pi + ' grandparent input placeholder="' + gpPlaceholder + '"', 'log');
                    if (gpPlaceholder.indexOf('start') !== -1) {
                        addLogMessage('findStartLabeledDatePopup: matched "Start" via grandparent at popup ' + pi, 'log');
                        return popup;
                    }
                }
            }
        }
        addLogMessage('findStartLabeledDatePopup: no popup with "Start" label found', 'warn');
        return null;
    }

    function openStartDatePicker() {
        addLogMessage('openStartDatePicker: looking for start date input', 'log');
        return new Promise(function(resolve, reject) {
            try {
                var startPopup = findStartLabeledDatePopup();
                if (!startPopup) {
                    addLogMessage('openStartDatePicker: no Start-labeled date-time-popup found', 'error');
                    reject(new Error('Start date popup not found'));
                    return;
                }
                var parent = startPopup.parentElement;
                var triggerInput = parent ? parent.querySelector('input[placeholder]') : null;
                if (!triggerInput) {
                    triggerInput = startPopup.previousElementSibling;
                }
                if (!triggerInput || triggerInput.tagName !== 'INPUT') {
                    addLogMessage('openStartDatePicker: no sibling input found to trigger datepicker', 'error');
                    reject(new Error('Date trigger input not found'));
                    return;
                }
                addLogMessage('openStartDatePicker: clicking input "' + (triggerInput.getAttribute('placeholder') || '') + '" to open datepicker', 'log');
                triggerInput.click();
                triggerInput.focus();
                var checkInterval = null;
                var elapsed = 0;
                var intervalStep = 200;
                checkInterval = setInterval(function() {
                    elapsed += intervalStep;
                    var picker = startPopup.querySelector('datepicker, datepicker-inner, .test-date-picker');
                    if (!picker) {
                        picker = startPopup.querySelector('.test-datetime-popup datepicker');
                    }
                    if (!picker) {
                        picker = document.querySelector('datepicker');
                    }
                    if (picker) {
                        clearInterval(checkInterval);
                        var idx = startDateState.intervals.indexOf(checkInterval);
                        if (idx > -1) { startDateState.intervals.splice(idx, 1); }
                        addLogMessage('openStartDatePicker: datepicker opened after ' + elapsed + 'ms', 'log');
                        resolve(picker);
                        return;
                    }
                    if (elapsed >= STARTDATE_TIMEOUTS.waitDatepickerOpenMs) {
                        clearInterval(checkInterval);
                        var idx2 = startDateState.intervals.indexOf(checkInterval);
                        if (idx2 > -1) { startDateState.intervals.splice(idx2, 1); }
                        addLogMessage('openStartDatePicker: timeout waiting for datepicker', 'error');
                        reject(new Error('Timeout waiting for datepicker'));
                    }
                }, intervalStep);
                startDateState.intervals.push(checkInterval);
            } catch (error) {
                addLogMessage('openStartDatePicker: error: ' + error.message, 'error');
                reject(error);
            }
        });
    }

    function readDatepickerHeader(pickerEl) {
        addLogMessage('readDatepickerHeader: reading header', 'log');
        var result = { month: -1, year: -1 };
        try {
            var titleBtn = pickerEl.querySelector(STARTDATE_SELECTORS.datepickerTitleBtn);
            if (!titleBtn) {
                titleBtn = pickerEl.querySelector('thead button[id*="datepicker"]');
            }
            if (!titleBtn) {
                titleBtn = pickerEl.querySelector('thead th[colspan] button');
            }
            var headerText = '';
            if (titleBtn) {
                headerText = titleBtn.textContent.trim();
            }
            if (!headerText) {
                var strongEl = pickerEl.querySelector('thead strong');
                if (strongEl) {
                    headerText = strongEl.textContent.trim();
                }
            }
            addLogMessage('readDatepickerHeader: header text="' + headerText + '"', 'log');
            if (headerText) {
                for (var mi = 0; mi < STARTDATE_MONTHS.length; mi++) {
                    if (headerText.toLowerCase().indexOf(STARTDATE_MONTHS[mi].name.toLowerCase()) !== -1) {
                        result.month = STARTDATE_MONTHS[mi].index;
                        break;
                    }
                }
                var yearMatch = headerText.match(/(\d{4})/);
                if (yearMatch) {
                    result.year = parseInt(yearMatch[1], 10);
                }
            }
        } catch (error) {
            addLogMessage('readDatepickerHeader: error: ' + error.message, 'error');
        }
        addLogMessage('readDatepickerHeader: month=' + result.month + ' year=' + result.year, 'log');
        return result;
    }

    function adjustYearIfNeeded(pickerEl, targetYear) {
        addLogMessage('adjustYearIfNeeded: targetYear=' + targetYear, 'log');
        return new Promise(function(resolve) {
            var header = readDatepickerHeader(pickerEl);
            if (header.year === targetYear) {
                addLogMessage('adjustYearIfNeeded: year already correct', 'log');
                resolve(true);
                return;
            }
            navigateYearWithArrows(pickerEl, targetYear, resolve);
        });
    }

    function getFreshPicker() {
        var picker = document.querySelector('datepicker');
        if (!picker) {
            picker = document.querySelector('datepicker-inner');
        }
        if (!picker) {
            picker = document.querySelector('.test-date-picker');
        }
        return picker;
    }

    function navigateYearWithArrows(pickerEl, targetYear, resolve) {
        var maxAttempts = 30;
        var attempt = 0;
        function step() {
            if (startDateState.stopRequested) {
                resolve(false);
                return;
            }
            if (attempt >= maxAttempts) {
                addLogMessage('navigateYearWithArrows: max attempts reached', 'warn');
                resolve(false);
                return;
            }
            var freshPicker = getFreshPicker();
            if (!freshPicker) {
                addLogMessage('navigateYearWithArrows: picker disappeared', 'warn');
                resolve(false);
                return;
            }
            var header = readDatepickerHeader(freshPicker);
            if (header.year === targetYear) {
                addLogMessage('navigateYearWithArrows: target year reached', 'log');
                resolve(true);
                return;
            }
            attempt++;
            var navBtn = null;
            if (header.year < targetYear) {
                navBtn = freshPicker.querySelector(STARTDATE_SELECTORS.datepickerNavNext);
            } else {
                navBtn = freshPicker.querySelector(STARTDATE_SELECTORS.datepickerNavPrev);
            }
            if (navBtn) {
                navBtn.click();
                var tid = setTimeout(step, STARTDATE_TIMEOUTS.waitAfterMonthChangeMs);
                startDateState.timeouts.push(tid);
            } else {
                addLogMessage('navigateYearWithArrows: nav button not found', 'warn');
                resolve(false);
            }
        }
        step();
    }

    function selectMonth(pickerEl, targetMonthIndex0) {
        addLogMessage('selectMonth: targetMonth=' + targetMonthIndex0, 'log');
        return new Promise(function(resolve) {
            var header = readDatepickerHeader(pickerEl);
            if (header.month === targetMonthIndex0) {
                addLogMessage('selectMonth: month already correct', 'log');
                resolve(true);
                return;
            }
            navigateMonthWithArrows(pickerEl, targetMonthIndex0, resolve);
        });
    }

    function navigateMonthWithArrows(pickerEl, targetMonthIndex0, resolve) {
        var maxAttempts = 24;
        var attempt = 0;
        function step() {
            if (startDateState.stopRequested) {
                resolve(false);
                return;
            }
            if (attempt >= maxAttempts) {
                addLogMessage('navigateMonthWithArrows: max attempts reached', 'warn');
                resolve(false);
                return;
            }
            var freshPicker = getFreshPicker();
            if (!freshPicker) {
                addLogMessage('navigateMonthWithArrows: picker disappeared', 'warn');
                resolve(false);
                return;
            }
            var header = readDatepickerHeader(freshPicker);
            if (header.month === targetMonthIndex0) {
                addLogMessage('navigateMonthWithArrows: target month reached', 'log');
                resolve(true);
                return;
            }
            attempt++;
            var diff = targetMonthIndex0 - header.month;
            var navBtn = null;
            if (diff > 0) {
                navBtn = freshPicker.querySelector(STARTDATE_SELECTORS.datepickerNavNext);
            } else {
                navBtn = freshPicker.querySelector(STARTDATE_SELECTORS.datepickerNavPrev);
            }
            if (navBtn) {
                navBtn.click();
                var tid = setTimeout(step, STARTDATE_TIMEOUTS.waitAfterMonthChangeMs);
                startDateState.timeouts.push(tid);
            } else {
                addLogMessage('navigateMonthWithArrows: nav button not found', 'warn');
                resolve(false);
            }
        }
        step();
    }

    function selectDay(pickerEl, targetDay) {
        addLogMessage('selectDay: targetDay=' + targetDay, 'log');
        return new Promise(function(resolve) {
            try {
                var freshPicker = getFreshPicker();
                if (!freshPicker) {
                    addLogMessage('selectDay: picker not found', 'warn');
                    resolve(false);
                    return;
                }
                var dayButtons = freshPicker.querySelectorAll(STARTDATE_SELECTORS.datepickerDayCell);
                addLogMessage('selectDay: found ' + dayButtons.length + ' day cell buttons', 'log');
                var clicked = false;
                for (var di = 0; di < dayButtons.length; di++) {
                    var span = dayButtons[di].querySelector(STARTDATE_SELECTORS.datepickerDaySpan);
                    if (!span) {
                        continue;
                    }
                    if (span.classList.contains(STARTDATE_SELECTORS.datepickerDayMutedClass)) {
                        continue;
                    }
                    var dayText = span.textContent.trim();
                    var dayNum = parseInt(dayText, 10);
                    if (dayNum === targetDay) {
                        addLogMessage('selectDay: clicking day ' + dayNum, 'log');
                        dayButtons[di].click();
                        clicked = true;
                        break;
                    }
                }
                if (!clicked) {
                    addLogMessage('selectDay: non-muted match not found, fallback scanning all buttons', 'log');
                    for (var ai = 0; ai < dayButtons.length; ai++) {
                        var allDayText = dayButtons[ai].textContent.trim();
                        var allDayNum = parseInt(allDayText, 10);
                        if (allDayNum === targetDay) {
                            addLogMessage('selectDay: fallback clicking day ' + allDayNum, 'log');
                            dayButtons[ai].click();
                            clicked = true;
                            break;
                        }
                    }
                }
                if (!clicked) {
                    addLogMessage('selectDay: day ' + targetDay + ' not found in picker', 'warn');
                    resolve(false);
                    return;
                }
                var verifyTid = setTimeout(function() {
                    addLogMessage('selectDay: click settle complete', 'log');
                    resolve(true);
                }, STARTDATE_TIMEOUTS.waitAfterDayClickMs);
                startDateState.timeouts.push(verifyTid);
            } catch (error) {
                addLogMessage('selectDay: error: ' + error.message, 'error');
                resolve(false);
            }
        });
    }

    function parseDateString(text) {
        if (!text || !text.trim()) {
            return null;
        }
        var t = text.trim();
        var slashMatch = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
            return {
                y: parseInt(slashMatch[3], 10),
                m0: parseInt(slashMatch[1], 10) - 1,
                d: parseInt(slashMatch[2], 10),
                raw: t
            };
        }
        var dashMatch = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dashMatch) {
            return {
                y: parseInt(dashMatch[3], 10),
                m0: parseInt(dashMatch[1], 10) - 1,
                d: parseInt(dashMatch[2], 10),
                raw: t
            };
        }
        var textMatch = t.match(/(\d{1,2})\s*([A-Za-z]+)\s*(\d{4})/);
        if (textMatch) {
            var tMonthStr = textMatch[2].toLowerCase();
            for (var mi = 0; mi < STARTDATE_MONTHS.length; mi++) {
                var monthEntry = STARTDATE_MONTHS[mi];
                for (var ai = 0; ai < monthEntry.aliases.length; ai++) {
                    if (tMonthStr === monthEntry.aliases[ai]) {
                        return {
                            y: parseInt(textMatch[3], 10),
                            m0: monthEntry.index,
                            d: parseInt(textMatch[1], 10),
                            raw: t
                        };
                    }
                }
            }
        }
        var textMatch2 = t.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
        if (textMatch2) {
            var tMonthStr2 = textMatch2[1].toLowerCase();
            for (var mi2 = 0; mi2 < STARTDATE_MONTHS.length; mi2++) {
                var monthEntry2 = STARTDATE_MONTHS[mi2];
                for (var ai2 = 0; ai2 < monthEntry2.aliases.length; ai2++) {
                    if (tMonthStr2 === monthEntry2.aliases[ai2]) {
                        return {
                            y: parseInt(textMatch2[3], 10),
                            m0: monthEntry2.index,
                            d: parseInt(textMatch2[2], 10),
                            raw: t
                        };
                    }
                }
            }
        }
        return null;
    }

    function waitForOverlayToClear() {
        addLogMessage('waitForOverlayToClear: checking for overlays', 'log');
        return new Promise(function(resolve) {
            var elapsed = 0;
            var step = 200;
            function check() {
                if (startDateState.stopRequested) {
                    resolve();
                    return;
                }
                var overlays = document.querySelectorAll(STARTDATE_SELECTORS.overlayOrSpinner);
                var hasVisible = false;
                for (var oi = 0; oi < overlays.length; oi++) {
                    var rect = overlays[oi].getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        hasVisible = true;
                        break;
                    }
                }
                if (!hasVisible || elapsed >= 5000) {
                    if (hasVisible) {
                        addLogMessage('waitForOverlayToClear: timeout, overlay still present', 'warn');
                    }
                    resolve();
                    return;
                }
                elapsed += step;
                var tid = setTimeout(check, step);
                startDateState.timeouts.push(tid);
            }
            check();
        });
    }

    function ensureCorrectEditContextForCandidate(candidate) {
        addLogMessage('ensureCorrectEditContextForCandidate: verifying for ' + candidate.display, 'log');
        try {
            var memberEls = document.querySelectorAll(STARTDATE_SELECTORS.memberDisplayInEdit);
            for (var mi = 0; mi < memberEls.length; mi++) {
                var el = memberEls[mi];
                var memberText = '';
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    memberText = el.value || '';
                }
                if (!memberText) {
                    memberText = el.textContent || '';
                }
                if (!memberText && el.getAttribute('aria-label')) {
                    memberText = el.getAttribute('aria-label');
                }
                memberText = memberText.trim();
                if (!memberText) {
                    continue;
                }
                var memberPairKey = normalizeFirstLastPair(memberText);
                addLogMessage('ensureCorrectEditContextForCandidate: found member text="' + memberText + '" pairKey=' + memberPairKey + ' expected=' + candidate.pairKey, 'log');
                if (memberPairKey === candidate.pairKey) {
                    addLogMessage('ensureCorrectEditContextForCandidate: matched for ' + candidate.display, 'log');
                    return true;
                }
            }
            if (memberEls.length === 0) {
                addLogMessage('ensureCorrectEditContextForCandidate: no member display found, returning false', 'warn');
                return false;
            }
            addLogMessage('ensureCorrectEditContextForCandidate: mismatch for ' + candidate.pairKey, 'error');
            return false;
        } catch (err) {
            addLogMessage('ensureCorrectEditContextForCandidate: error: ' + err.message, 'error');
            return false;
        }
    }

    function readStartDateFromEditOrGrid(rowEl) {
        addLogMessage('readStartDateFromEditOrGrid: reading date', 'log');
        try {
            var editInputs = document.querySelectorAll(STARTDATE_SELECTORS.startDateReadonlyInGrid);
            for (var ei = 0; ei < editInputs.length; ei++) {
                var val = editInputs[ei].value || '';
                val = val.trim();
                if (val) {
                    addLogMessage('readStartDateFromEditOrGrid: edit input value="' + val + '"', 'log');
                    var parsed = parseDateString(val);
                    if (parsed) {
                        return parsed;
                    }
                }
            }
            if (rowEl) {
                var cells = rowEl.querySelectorAll(STARTDATE_SELECTORS.mainGridCell);
                for (var ci = 0; ci < cells.length; ci++) {
                    var cellEls = cells[ci].querySelectorAll(STARTDATE_SELECTORS.gridDateCellText);
                    for (var di = 0; di < cellEls.length; di++) {
                        var cellText = cellEls[di].textContent.trim();
                        if (!cellText) {
                            continue;
                        }
                        var cellParsed = parseDateString(cellText);
                        if (cellParsed) {
                            addLogMessage('readStartDateFromEditOrGrid: grid cell date="' + cellText + '"', 'log');
                            return cellParsed;
                        }
                    }
                }
            }
            addLogMessage('readStartDateFromEditOrGrid: no date found', 'log');
            return null;
        } catch (err) {
            addLogMessage('readStartDateFromEditOrGrid: error: ' + err.message, 'error');
            return null;
        }
    }

    function isDateEqualToTarget(foundDateObj, targetDateObj) {
        if (!foundDateObj || !targetDateObj) {
            return false;
        }
        var yMatch = foundDateObj.y === targetDateObj.year;
        var mMatch = foundDateObj.m0 === targetDateObj.monthIndex0;
        var dMatch = foundDateObj.d === targetDateObj.day;
        addLogMessage('isDateEqualToTarget: found=' + foundDateObj.y + '/' + foundDateObj.m0 + '/' + foundDateObj.d + ' target=' + targetDateObj.year + '/' + targetDateObj.monthIndex0 + '/' + targetDateObj.day + ' match=' + (yMatch && mMatch && dMatch), 'log');
        return yMatch && mMatch && dMatch;
    }

    function findSaveButton() {
        addLogMessage('findSaveButton: searching', 'log');
        var contextRoots = document.querySelectorAll(STARTDATE_SELECTORS.editContextRoot);
        for (var ri = 0; ri < contextRoots.length; ri++) {
            var root = contextRoots[ri];
            if (root === document.body) {
                continue;
            }
            var btn = root.querySelector(STARTDATE_SELECTORS.saveButton);
            if (btn) {
                addLogMessage('findSaveButton: found in context root ' + ri, 'log');
                return btn;
            }
        }
        var globalBtn = document.querySelector(STARTDATE_SELECTORS.saveButton);
        if (globalBtn) {
            addLogMessage('findSaveButton: found globally', 'log');
            return globalBtn;
        }
        var fallbackBtns = document.querySelectorAll(STARTDATE_SELECTORS.saveButtonTextFallback);
        for (var fi = 0; fi < fallbackBtns.length; fi++) {
            var btnText = fallbackBtns[fi].textContent.trim().toLowerCase();
            if (btnText === 'save') {
                addLogMessage('findSaveButton: found via text fallback', 'log');
                return fallbackBtns[fi];
            }
        }
        addLogMessage('findSaveButton: not found', 'warn');
        return null;
    }

    function waitForSaveSignal(callback) {
        addLogMessage('waitForSaveSignal: waiting for save completion', 'log');
        var elapsed = 0;
        var step = 300;
        var signaled = false;
        function check() {
            if (signaled) {
                return;
            }
            if (startDateState.stopRequested) {
                signaled = true;
                callback(false);
                return;
            }
            if (elapsed >= STARTDATE_TIMEOUTS.waitSaveCompleteMs) {
                addLogMessage('waitForSaveSignal: timeout', 'warn');
                signaled = true;
                callback(false);
                return;
            }
            var toastEl = document.querySelector(STARTDATE_SELECTORS.toastSuccess);
            if (toastEl) {
                addLogMessage('waitForSaveSignal: toast success found', 'log');
                signaled = true;
                callback(true);
                return;
            }
            var toastContainers = document.querySelectorAll(STARTDATE_SELECTORS.toastContainer);
            for (var ti = 0; ti < toastContainers.length; ti++) {
                var tText = toastContainers[ti].textContent.toLowerCase();
                if (tText.indexOf('saved') !== -1 || tText.indexOf('success') !== -1) {
                    addLogMessage('waitForSaveSignal: toast text indicates success', 'log');
                    signaled = true;
                    callback(true);
                    return;
                }
            }
            var saveBtn = document.querySelector(STARTDATE_SELECTORS.saveButton);
            if (!saveBtn) {
                addLogMessage('waitForSaveSignal: save button disappeared, form likely closed', 'log');
                signaled = true;
                callback(true);
                return;
            }
            if (saveBtn.disabled) {
                var spinnerNearby = document.querySelector(STARTDATE_SELECTORS.overlayOrSpinner);
                var spinnerVisible = false;
                if (spinnerNearby) {
                    var sRect = spinnerNearby.getBoundingClientRect();
                    if (sRect.width > 0 && sRect.height > 0) {
                        spinnerVisible = true;
                    }
                }
                if (!spinnerVisible) {
                    addLogMessage('waitForSaveSignal: save button disabled, no spinner', 'log');
                    signaled = true;
                    callback(true);
                    return;
                }
            }
            elapsed += step;
            var tid = setTimeout(check, step);
            startDateState.timeouts.push(tid);
        }
        var initTid = setTimeout(check, step);
        startDateState.timeouts.push(initTid);
    }

    function verifySavedDateForCandidate(candidate, targetDate, callback) {
        addLogMessage('verifySavedDateForCandidate: verifying for ' + candidate.display, 'log');
        try {
            var freshRow = findRowByNamePairKey(candidate.pairKey);
            if (!freshRow) {
                addLogMessage('verifySavedDateForCandidate: row not found after save', 'warn');
                callback(false);
                return;
            }
            var foundDate = readStartDateFromEditOrGrid(freshRow);
            if (foundDate && isDateEqualToTarget(foundDate, targetDate)) {
                addLogMessage('verifySavedDateForCandidate: grid date matches target', 'log');
                callback(true);
                return;
            }
            addLogMessage('verifySavedDateForCandidate: grid date not matching, re-opening edit', 'log');
            openRowMenuAndClickEdit(freshRow)
                .then(function() {
                var editDate = readStartDateFromEditOrGrid(freshRow);
                if (editDate && isDateEqualToTarget(editDate, targetDate)) {
                    addLogMessage('verifySavedDateForCandidate: edit date matches after re-open', 'log');
                    callback(true);
                } else {
                    addLogMessage('verifySavedDateForCandidate: edit date does not match', 'warn');
                    callback(false);
                }
            })
                .catch(function(err) {
                addLogMessage('verifySavedDateForCandidate: re-open error: ' + err.message, 'error');
                callback(false);
            });
        } catch (err) {
            addLogMessage('verifySavedDateForCandidate: error: ' + err.message, 'error');
            callback(false);
        }
    }

    function waitForReasonModalAndSubmit(candidate, callback) {
        addLogMessage('waitForReasonModalAndSubmit: waiting for reason modal for ' + candidate.display, 'log');
        var elapsed = 0;
        var step = 300;
        function pollForModal() {
            if (startDateState.stopRequested) {
                addLogMessage('waitForReasonModalAndSubmit: stop requested', 'log');
                callback(false);
                return;
            }
            if (elapsed >= STARTDATE_TIMEOUTS.waitReasonModalMs) {
                addLogMessage('waitForReasonModalAndSubmit: reason modal did not appear within timeout, proceeding', 'log');
                callback(true);
                return;
            }
            var modal = document.querySelector(STARTDATE_SELECTORS.reasonModal);
            if (!modal) {
                elapsed += step;
                var tid = setTimeout(pollForModal, step);
                startDateState.timeouts.push(tid);
                return;
            }
            addLogMessage('waitForReasonModalAndSubmit: reason modal found', 'log');
            updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusEnteringReason);
            var textarea = modal.querySelector(STARTDATE_SELECTORS.reasonInput);
            if (!textarea) {
                textarea = document.querySelector(STARTDATE_SELECTORS.reasonInput);
            }
            if (!textarea) {
                addLogMessage('waitForReasonModalAndSubmit: textarea not found in reason modal', 'error');
                callback(false);
                return;
            }
            addLogMessage('waitForReasonModalAndSubmit: filling reason textarea', 'log');
            textarea.focus();
            textarea.value = STARTDATE_LABELS.reasonText;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            addLogMessage('waitForReasonModalAndSubmit: dispatched input and change events', 'log');
            var submitElapsed = 0;
            var submitStep = 200;
            function pollForSubmitEnabled() {
                if (startDateState.stopRequested) {
                    callback(false);
                    return;
                }
                var submitBtn = modal.querySelector(STARTDATE_SELECTORS.reasonSubmitBtn);
                if (!submitBtn) {
                    submitBtn = document.querySelector(STARTDATE_SELECTORS.reasonSubmitBtn);
                }
                if (!submitBtn) {
                    addLogMessage('waitForReasonModalAndSubmit: submit button not found', 'error');
                    callback(false);
                    return;
                }
                if (!submitBtn.disabled) {
                    addLogMessage('waitForReasonModalAndSubmit: submit button enabled, clicking', 'log');
                    submitBtn.click();
                    addLogMessage('waitForReasonModalAndSubmit: clicked reason submit', 'log');
                    var closePollElapsed = 0;
                    var closePollStep = 300;
                    function pollForModalClose() {
                        if (startDateState.stopRequested) {
                            callback(false);
                            return;
                        }
                        var stillOpen = document.querySelector(STARTDATE_SELECTORS.reasonModal);
                        if (!stillOpen) {
                            addLogMessage('waitForReasonModalAndSubmit: reason modal closed', 'log');
                            callback(true);
                            return;
                        }
                        if (closePollElapsed >= STARTDATE_TIMEOUTS.waitReasonModalCloseMs) {
                            addLogMessage('waitForReasonModalAndSubmit: reason modal did not close in time', 'warn');
                            callback(true);
                            return;
                        }
                        closePollElapsed += closePollStep;
                        var closeTid = setTimeout(pollForModalClose, closePollStep);
                        startDateState.timeouts.push(closeTid);
                    }
                    var initCloseTid = setTimeout(pollForModalClose, closePollStep);
                    startDateState.timeouts.push(initCloseTid);
                    return;
                }
                if (submitElapsed >= STARTDATE_TIMEOUTS.waitReasonSubmitEnabledMs) {
                    addLogMessage('waitForReasonModalAndSubmit: submit button still disabled after timeout, retrying input', 'warn');
                    textarea.value = '';
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.value = STARTDATE_LABELS.reasonText;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.dispatchEvent(new Event('change', { bubbles: true }));
                    textarea.dispatchEvent(new Event('blur', { bubbles: true }));
                    var lastChanceTid = setTimeout(function() {
                        var freshSubmitBtn = modal.querySelector(STARTDATE_SELECTORS.reasonSubmitBtn);
                        if (!freshSubmitBtn) {
                            freshSubmitBtn = document.querySelector(STARTDATE_SELECTORS.reasonSubmitBtn);
                        }
                        if (freshSubmitBtn && !freshSubmitBtn.disabled) {
                            addLogMessage('waitForReasonModalAndSubmit: submit enabled after retry, clicking', 'log');
                            freshSubmitBtn.click();
                            var finalCloseTid = setTimeout(function() {
                                callback(true);
                            }, 1000);
                            startDateState.timeouts.push(finalCloseTid);
                        } else {
                            addLogMessage('waitForReasonModalAndSubmit: submit still disabled after retry', 'error');
                            callback(false);
                        }
                    }, 500);
                    startDateState.timeouts.push(lastChanceTid);
                    return;
                }
                submitElapsed += submitStep;
                var submitTid = setTimeout(pollForSubmitEnabled, submitStep);
                startDateState.timeouts.push(submitTid);
            }
            var initSubmitTid = setTimeout(pollForSubmitEnabled, submitStep);
            startDateState.timeouts.push(initSubmitTid);
        }
        var initTid = setTimeout(pollForModal, step);
        startDateState.timeouts.push(initTid);
    }

    function performSaveClick(candidate, saveBtn, targetDate, attempt, resolve) {
        addLogMessage('performSaveClick: attempt ' + (attempt + 1) + ' for ' + candidate.display, 'log');
        if (startDateState.stopRequested) {
            resolve(false);
            return;
        }
        if (attempt >= 2) {
            addLogMessage('performSaveClick: max attempts reached', 'error');
            resolve(false);
            return;
        }
        updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusSaving);
        saveBtn.click();
        addLogMessage('performSaveClick: clicked save button, waiting for reason modal', 'log');
        waitForReasonModalAndSubmit(candidate, function(reasonOk) {
            if (!reasonOk) {
                addLogMessage('performSaveClick: reason modal handling failed', 'warn');
                if (attempt < 1) {
                    var retryReasonTid = setTimeout(function() {
                        var freshSaveBtn = findSaveButton();
                        if (freshSaveBtn) {
                            performSaveClick(candidate, freshSaveBtn, targetDate, attempt + 1, resolve);
                        } else {
                            resolve(false);
                        }
                    }, STARTDATE_TIMEOUTS.settleAfterSaveMs);
                    startDateState.timeouts.push(retryReasonTid);
                    return;
                }
                resolve(false);
                return;
            }
            addLogMessage('performSaveClick: reason modal submitted, save complete for ' + candidate.display, 'log');
            resolve(true);
        });
    }

    function clickSaveAndVerifyForCandidate(candidate, rowEl, targetDate) {
        addLogMessage('clickSaveAndVerifyForCandidate: saving for ' + candidate.display, 'log');
        return new Promise(function(resolve) {
            try {
                var saveBtn = findSaveButton();
                if (!saveBtn) {
                    addLogMessage('clickSaveAndVerifyForCandidate: save button not found', 'error');
                    resolve(false);
                    return;
                }
                if (saveBtn.disabled || saveBtn.getAttribute('aria-busy') === 'true') {
                    addLogMessage('clickSaveAndVerifyForCandidate: save button disabled or busy, waiting', 'log');
                    var waitTid = setTimeout(function() {
                        if (saveBtn.disabled || saveBtn.getAttribute('aria-busy') === 'true') {
                            addLogMessage('clickSaveAndVerifyForCandidate: still disabled after wait', 'error');
                            resolve(false);
                            return;
                        }
                        performSaveClick(candidate, saveBtn, targetDate, 0, resolve);
                    }, 1000);
                    startDateState.timeouts.push(waitTid);
                    return;
                }
                performSaveClick(candidate, saveBtn, targetDate, 0, resolve);
            } catch (err) {
                addLogMessage('clickSaveAndVerifyForCandidate: error: ' + err.message, 'error');
                resolve(false);
            }
        });
    }

    function clickCancelButton() {
        var cancelBtns = document.querySelectorAll('button.btn.btn-default, button.btn.btn-secondary');
        for (var ci = 0; ci < cancelBtns.length; ci++) {
            var btnText = cancelBtns[ci].textContent.trim().toLowerCase();
            if (btnText === 'cancel') {
                addLogMessage('clickCancelButton: found Cancel button, clicking', 'log');
                cancelBtns[ci].click();
                return true;
            }
        }
        addLogMessage('clickCancelButton: Cancel button not found', 'warn');
        return false;
    }

    function processRowEditAndSave(candidate, rowEl, resolve, _retryAfterCancel) {
        var isRetry = !!_retryAfterCancel;
        addLogMessage('processRowEditAndSave: processing ' + candidate.display + (isRetry ? ' (retry after cancel)' : ''), 'log');
        if (startDateState.stopRequested) {
            candidate.status = STARTDATE_LABELS.statusStopped;
            updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusStopped);
            resolve();
            return;
        }
        candidate.status = STARTDATE_LABELS.statusEditing;
        updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusEditing);
        openRowMenuAndClickEdit(rowEl)
            .then(function() {
            if (startDateState.stopRequested) {
                throw new Error('Stopped');
            }
            addLogMessage('processRowEditAndSave: edit form opened for ' + candidate.display, 'log');
            if (!ensureCorrectEditContextForCandidate(candidate)) {
                addLogMessage('processRowEditAndSave: edit context mismatch for ' + candidate.display + ', clicking Cancel', 'warn');
                clickCancelButton();
                if (isRetry) {
                    addLogMessage('processRowEditAndSave: mismatch on retry, marking as failed for ' + candidate.display, 'error');
                    candidate.status = STARTDATE_LABELS.statusEditFailed;
                    updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusEditFailed, 'Edit context mismatch after retry');
                    startDateState.counters.failures++;
                    startDateState.counters.pending--;
                    updateStartDateRightPanelSummary(startDateState.counters);
                    resolve();
                    return;
                }
                addLogMessage('processRowEditAndSave: will retry finding correct row for ' + candidate.display, 'log');
                var cancelWaitTid = setTimeout(function() {
                    waitForOverlayToClear().then(function() {
                        var correctRow = findRowByNamePairKey(candidate.pairKey);
                        if (correctRow) {
                            addLogMessage('processRowEditAndSave: found correct row after cancel, retrying for ' + candidate.display, 'log');
                            processRowEditAndSave(candidate, correctRow, resolve, true);
                        } else {
                            addLogMessage('processRowEditAndSave: scrolling to find correct row after cancel for ' + candidate.display, 'log');
                            scrollToFindRow(candidate, function(foundRow) {
                                if (!foundRow) {
                                    addLogMessage('processRowEditAndSave: row not found after cancel for ' + candidate.display, 'error');
                                    candidate.status = STARTDATE_LABELS.statusNotFound;
                                    updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusNotFound, 'Row not found after cancel');
                                    startDateState.counters.notFound++;
                                    startDateState.counters.pending--;
                                    updateStartDateRightPanelSummary(startDateState.counters);
                                    resolve();
                                    return;
                                }
                                processRowEditAndSave(candidate, foundRow, resolve, true);
                            });
                        }
                    });
                }, 1000);
                startDateState.timeouts.push(cancelWaitTid);
                return;
            }
            var existingDate = readStartDateFromEditOrGrid(rowEl);
            if (existingDate && isDateEqualToTarget(existingDate, startDateState.parsedDate)) {
                addLogMessage('processRowEditAndSave: date already matches for ' + candidate.display, 'log');
                candidate.status = STARTDATE_LABELS.statusAlreadySet;
                updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusAlreadySet);
                startDateState.counters.alreadySet++;
                startDateState.counters.pending--;
                updateStartDateRightPanelSummary(startDateState.counters);
                updateStartDateAriaLive(candidate.display + ' already has target date');
                resolve();
                return;
            }
            addLogMessage('processRowEditAndSave: opening datepicker for ' + candidate.display, 'log');
            return openStartDatePicker()
                .then(function(pickerEl) {
                if (startDateState.stopRequested) {
                    throw new Error('Stopped');
                }
                return startDateDelay(STARTDATE_TIMEOUTS.settleMs).then(function() {
                    return adjustYearIfNeeded(pickerEl, startDateState.parsedDate.year);
                }).then(function(yearOk) {
                    if (!yearOk) {
                        throw new Error('Year adjustment failed');
                    }
                    var freshPicker = getFreshPicker();
                    if (!freshPicker) {
                        throw new Error('Picker disappeared after year adjust');
                    }
                    return selectMonth(freshPicker, startDateState.parsedDate.monthIndex0);
                }).then(function(monthOk) {
                    if (!monthOk) {
                        throw new Error('Month selection failed');
                    }
                    return startDateDelay(STARTDATE_TIMEOUTS.settleMs).then(function() {
                        var freshPicker = getFreshPicker();
                        if (!freshPicker) {
                            throw new Error('Picker disappeared after month select');
                        }
                        return selectDay(freshPicker, startDateState.parsedDate.day);
                    });
                }).then(function(dayOk) {
                    if (!dayOk) {
                        throw new Error('Day selection failed');
                    }
                    return startDateDelay(STARTDATE_TIMEOUTS.waitVerifyInputMs);
                });
            })
                .then(function() {
                addLogMessage('processRowEditAndSave: date selected, saving for ' + candidate.display, 'log');
                updateStartDateAriaLive('Saving for ' + candidate.display);
                return clickSaveAndVerifyForCandidate(candidate, rowEl, startDateState.parsedDate);
            })
                .then(function(saveOk) {
                if (saveOk) {
                    addLogMessage('processRowEditAndSave: save verified for ' + candidate.display, 'log');
                    candidate.status = STARTDATE_LABELS.statusSaved;
                    updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusSaved);
                    startDateState.counters.saved++;
                    startDateState.counters.pending--;
                    updateStartDateRightPanelSummary(startDateState.counters);
                    updateStartDateAriaLive('Saved for ' + candidate.display);
                } else {
                    addLogMessage('processRowEditAndSave: save failed for ' + candidate.display, 'error');
                    candidate.status = STARTDATE_LABELS.statusSaveFailed;
                    updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusSaveFailed, 'Save failed');
                    startDateState.counters.failures++;
                    startDateState.counters.pending--;
                    updateStartDateRightPanelSummary(startDateState.counters);
                }
                resolve();
            });
        })
            .catch(function(err) {
            addLogMessage('processRowEditAndSave: error for ' + candidate.display + ': ' + err.message, 'error');
            if (startDateState.stopRequested) {
                candidate.status = STARTDATE_LABELS.statusStopped;
                updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusStopped);
            } else {
                var failStatus = STARTDATE_LABELS.statusFailed;
                var failDetail = err.message;
                if (err.message.indexOf('Menu') !== -1) {
                    failStatus = STARTDATE_LABELS.statusMenuFailed;
                    failDetail = 'Menu failed';
                } else if (err.message.indexOf('Edit') !== -1) {
                    failStatus = STARTDATE_LABELS.statusEditFailed;
                    failDetail = 'Edit failed';
                } else if (err.message.indexOf('picker') !== -1 ||
                    err.message.indexOf('Picker') !== -1 ||
                    err.message.indexOf('Year') !== -1 ||
                    err.message.indexOf('Month') !== -1 ||
                    err.message.indexOf('Day') !== -1) {
                    failStatus = STARTDATE_LABELS.statusDatepickerFailed;
                    failDetail = 'Date picker failed';
                }
                candidate.status = failStatus;
                updateStartDateRightPanelStatus(candidate.pairKey, failStatus, failDetail);
                startDateState.counters.failures++;
                startDateState.counters.pending--;
                updateStartDateRightPanelSummary(startDateState.counters);
            }
            resolve();
        });
    }

    function processNextStartDateForCandidate(candidate) {
        addLogMessage('processNextStartDateForCandidate: starting for ' + candidate.display, 'log');
        return new Promise(function(resolve) {
            try {
                if (startDateState.stopRequested) {
                    candidate.status = STARTDATE_LABELS.statusStopped;
                    updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusStopped);
                    resolve();
                    return;
                }
                candidate.status = STARTDATE_LABELS.statusLocating;
                updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusLocating);
                waitForOverlayToClear().then(function() {
                    if (startDateState.stopRequested) {
                        candidate.status = STARTDATE_LABELS.statusStopped;
                        updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusStopped);
                        resolve();
                        return;
                    }
                    var rowEl = findRowByNamePairKey(candidate.pairKey);
                    if (!rowEl) {
                        addLogMessage('processNextStartDateForCandidate: row not visible, scrolling for ' + candidate.display, 'log');
                        scrollToFindRow(candidate, function(foundRow) {
                            if (!foundRow) {
                                addLogMessage('processNextStartDateForCandidate: not found for ' + candidate.display, 'warn');
                                candidate.status = STARTDATE_LABELS.statusNotFound;
                                updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusNotFound);
                                startDateState.counters.notFound++;
                                startDateState.counters.pending--;
                                updateStartDateRightPanelSummary(startDateState.counters);
                                resolve();
                                return;
                            }
                            processRowEditAndSave(candidate, foundRow, resolve);
                        });
                        return;
                    }
                    processRowEditAndSave(candidate, rowEl, resolve);
                });
            } catch (err) {
                addLogMessage('processNextStartDateForCandidate: error: ' + err.message, 'error');
                candidate.status = STARTDATE_LABELS.statusFailed;
                updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusFailed, err.message);
                startDateState.counters.failures++;
                startDateState.counters.pending--;
                updateStartDateRightPanelSummary(startDateState.counters);
                resolve();
            }
        });
    }

    function beginSetStartDatesForQueue() {
        addLogMessage('beginSetStartDatesForQueue: starting queue processing', 'log');
        var scannedPairKeys = new Set();
        for (var si = 0; si < startDateState.scannedNames.length; si++) {
            var pk = normalizeFirstLastPair(startDateState.scannedNames[si]);
            if (pk) {
                scannedPairKeys.add(pk);
            }
        }
        addLogMessage('beginSetStartDatesForQueue: scannedPairKeys count=' + scannedPairKeys.size, 'log');
        var queue = [];
        for (var ni = 0; ni < startDateState.parsedNames.length; ni++) {
            var candidate = startDateState.parsedNames[ni];
            if (candidate.isDuplicate) {
                continue;
            }
            if (!scannedPairKeys.has(candidate.pairKey)) {
                candidate.status = STARTDATE_LABELS.statusNotFound;
                updateStartDateRightPanelStatus(candidate.pairKey, STARTDATE_LABELS.statusNotFound);
                startDateState.counters.notFound++;
                startDateState.counters.pending--;
            } else {
                queue.push(candidate);
            }
        }
        updateStartDateRightPanelSummary(startDateState.counters);
        addLogMessage('beginSetStartDatesForQueue: queue size=' + queue.length, 'log');
        if (queue.length === 0) {
            addLogMessage('beginSetStartDatesForQueue: no candidates to process', 'warn');
            updateStartDateProgressStatus(STARTDATE_LABELS.progressComplete, 'complete');
            updateStartDateAriaLive('Processing complete. No candidates to process.');
            return;
        }
        if (startDateState.scrollContainer) {
            addLogMessage('beginSetStartDatesForQueue: scrolling to top', 'log');
            startDateState.scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
        }
        var queueIndex = 0;
        function processNext() {
            if (!startDateState.isRunning || startDateState.stopRequested) {
                addLogMessage('beginSetStartDatesForQueue: stopped at index ' + queueIndex, 'log');
                markRemainingAsStopped();
                updateStartDateProgressStatus(STARTDATE_LABELS.progressStopped, 'stopped');
                updateStartDateAriaLive('Processing stopped.');
                return;
            }
            if (queueIndex >= queue.length) {
                addLogMessage('beginSetStartDatesForQueue: all candidates processed', 'log');
                updateStartDateProgressStatus(STARTDATE_LABELS.progressComplete, 'complete');
                var c = startDateState.counters;
                updateStartDateAriaLive('Complete. Saved: ' + c.saved + ', Already Set: ' + c.alreadySet + ', Not Found: ' + c.notFound + ', Failed: ' + c.failures);
                return;
            }
            var currentCandidate = queue[queueIndex];
            queueIndex++;
            processNextStartDateForCandidate(currentCandidate).then(function() {
                if (typeof requestIdleCallback === 'function') {
                    var icbId = requestIdleCallback(function() {
                        var idx = startDateState.idleCallbackIds.indexOf(icbId);
                        if (idx > -1) {
                            startDateState.idleCallbackIds.splice(idx, 1);
                        }
                        processNext();
                    }, { timeout: STARTDATE_TIMEOUTS.settleAfterSaveMs * 2 });
                    startDateState.idleCallbackIds.push(icbId);
                } else {
                    var tid = setTimeout(processNext, STARTDATE_TIMEOUTS.settleAfterSaveMs);
                    startDateState.timeouts.push(tid);
                }
            });
        }
        processNext();
    }

    function scrollToFindRow(candidate, callback) {
        addLogMessage('scrollToFindRow: searching for ' + candidate.display, 'log');
        if (!startDateState.scrollContainer) {
            addLogMessage('scrollToFindRow: no scroll container', 'warn');
            callback(null);
            return;
        }
        startDateState.scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
        var attempts = 0;
        var maxAttempts = 50;
        function scanAndScroll() {
            if (startDateState.stopRequested) {
                callback(null);
                return;
            }
            if (attempts >= maxAttempts) {
                addLogMessage('scrollToFindRow: max attempts reached', 'warn');
                callback(null);
                return;
            }
            attempts++;
            var row = findRowByNamePairKey(candidate.pairKey);
            if (row) {
                addLogMessage('scrollToFindRow: found after ' + attempts + ' attempts', 'log');
                callback(row);
                return;
            }
            var currTop = startDateState.scrollContainer.scrollTop;
            var maxScroll = startDateState.scrollContainer.scrollHeight - startDateState.scrollContainer.clientHeight;
            var newTop = Math.min(currTop + STARTDATE_SCROLL.stepPx, maxScroll);
            if (newTop <= currTop) {
                addLogMessage('scrollToFindRow: reached bottom, not found', 'warn');
                callback(null);
                return;
            }
            startDateState.scrollContainer.scrollTo({ top: newTop, behavior: 'auto' });
            var tid = setTimeout(scanAndScroll, STARTDATE_TIMEOUTS.scanSettleMs);
            startDateState.timeouts.push(tid);
        }
        var initTid = setTimeout(scanAndScroll, STARTDATE_TIMEOUTS.scanSettleMs);
        startDateState.timeouts.push(initTid);
    }

    function markRemainingAsStopped() {
        addLogMessage('markRemainingAsStopped: marking remaining as stopped', 'log');
        var stoppedCount = 0;
        for (var i = 0; i < startDateState.parsedNames.length; i++) {
            var s = startDateState.parsedNames[i].status;
            if (s === STARTDATE_LABELS.statusPending ||
                s === STARTDATE_LABELS.statusLocating ||
                s === STARTDATE_LABELS.statusEditing) {
                startDateState.parsedNames[i].status = STARTDATE_LABELS.statusStopped;
                updateStartDateRightPanelStatus(startDateState.parsedNames[i].pairKey, STARTDATE_LABELS.statusStopped);
                stoppedCount++;
            }
        }
        startDateState.counters.failures += stoppedCount;
        startDateState.counters.pending = 0;
        updateStartDateRightPanelSummary(startDateState.counters);
        addLogMessage('markRemainingAsStopped: stopped ' + stoppedCount + ' candidates', 'log');
    }

    function updateStartDateProgressStatus(statusText, statusType) {
        addLogMessage('updateStartDateProgressStatus: ' + statusText + ' type=' + statusType, 'log');
        var badge = document.getElementById('startdate-status-badge');
        var titleEl = document.getElementById('startdate-progress-title');
        if (badge) {
            badge.textContent = statusText;
            if (statusType === 'complete') {
                badge.style.background = 'rgba(107, 207, 127, 0.3)';
                badge.style.color = '#6bcf7f';
            } else if (statusType === 'stopped') {
                badge.style.background = 'rgba(170, 170, 170, 0.3)';
                badge.style.color = '#aaa';
            } else {
                badge.style.background = 'rgba(255, 217, 61, 0.3)';
                badge.style.color = '#ffd93d';
            }
        }
        if (titleEl) {
            titleEl.textContent = STARTDATE_LABELS.featureButton + ' - ' + statusText;
        }
        startDateState.isRunning = false;
    }

    function addStartDateInit() {
        addLogMessage('addStartDateInit: starting feature', 'log');
        startDateState.focusReturnElement = document.getElementById('startdate-btn');
        resetStartDateState();
        var mainTable = document.querySelector(STARTDATE_SELECTORS.mainTableContainer);
        addLogMessage('addStartDateInit: checking for main table', 'log');
        if (!mainTable) {
            addLogMessage('addStartDateInit: main table not found, showing warning', 'warn');
            showStartDateWarning();
            return;
        }
        addLogMessage('addStartDateInit: main table found, showing input panel', 'log');
        showStartDateInputPanel();
    }

    function stopStartDate() {
        addLogMessage('stopStartDate: stopping all Start Date processes', 'log');
        startDateState.isRunning = false;
        startDateState.stopRequested = true;
        for (var i = 0; i < startDateState.idleCallbackIds.length; i++) {
            try {
                if (typeof cancelIdleCallback === 'function') {
                    cancelIdleCallback(startDateState.idleCallbackIds[i]);
                }
            } catch (e) {
                addLogMessage('stopStartDate: error canceling idle callback: ' + e, 'error');
            }
        }
        startDateState.idleCallbackIds = [];
        for (var i2 = 0; i2 < startDateState.observers.length; i2++) {
            try {
                startDateState.observers[i2].disconnect();
            } catch (e2) {
                addLogMessage('stopStartDate: error disconnecting observer: ' + e2, 'error');
            }
        }
        startDateState.observers = [];
        for (var i3 = 0; i3 < startDateState.timeouts.length; i3++) {
            try {
                clearTimeout(startDateState.timeouts[i3]);
            } catch (e3) {
                addLogMessage('stopStartDate: error clearing timeout: ' + e3, 'error');
            }
        }
        startDateState.timeouts = [];
        for (var i4 = 0; i4 < startDateState.intervals.length; i4++) {
            try {
                clearInterval(startDateState.intervals[i4]);
            } catch (e4) {
                addLogMessage('stopStartDate: error clearing interval: ' + e4, 'error');
            }
        }
        startDateState.intervals = [];
        for (var i5 = 0; i5 < startDateState.eventListeners.length; i5++) {
            try {
                var l = startDateState.eventListeners[i5];
                l.element.removeEventListener(l.type, l.handler);
            } catch (e5) {
                addLogMessage('stopStartDate: error removing listener: ' + e5, 'error');
            }
        }
        startDateState.eventListeners = [];
        startDateSetAriaBusyOff();
        if (startDateState.scrollContainer && startDateState.prevScrollTop !== undefined) {
            addLogMessage('stopStartDate: restoring viewport', 'log');
            restoreViewport(startDateState.scrollContainer, startDateState.prevScrollTop);
        }
        startDateState.scrollContainer = null;
        startDateState.userScrollHandler = null;
        startDateState.userScrollPaused = false;
        var inputModal = document.getElementById('startdate-input-modal');
        if (inputModal && inputModal.parentNode) {
            inputModal.parentNode.removeChild(inputModal);
        }
        var progressModal = document.getElementById('startdate-progress-modal');
        if (progressModal && progressModal.parentNode) {
            progressModal.parentNode.removeChild(progressModal);
        }
        var warningModal = document.getElementById('startdate-warning-modal');
        if (warningModal && warningModal.parentNode) {
            warningModal.parentNode.removeChild(warningModal);
        }
        removeCollectingDataPanel('startdate');
        if (startDateState.focusReturnElement) {
            startDateState.focusReturnElement.focus();
        }
        resetStartDateState();
        addLogMessage('stopStartDate: cleanup complete', 'log');
    }

    let guiVisible = localStorage.getItem('florence-gui-visible') === 'true';
    let guiScale = parseFloat(localStorage.getItem('florence-gui-scale')) || 1;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let logMessages = [];
    let lastScrollPosition = 0;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    let logBoxPendingUpdate = false;
    function addLogMessage(message, type = 'log') {
        const timestamp = new Date().toLocaleTimeString();
        logMessages.push({ timestamp, message, type });
        if (!logBoxPendingUpdate) {
            logBoxPendingUpdate = true;
            requestAnimationFrame(function() {
                logBoxPendingUpdate = false;
                updateLogBox();
            });
        }
    }

    console.log = function(...args) {
        originalLog.apply(console, args);
        addLogMessage(args.join(' '), 'log');
    };

    console.error = function(...args) {
        originalError.apply(console, args);
        addLogMessage(args.join(' '), 'error');
    };

    console.warn = function(...args) {
        originalWarn.apply(console, args);
        addLogMessage(args.join(' '), 'warn');
    };

    const FLORENCE_GUI_ID = 'florence-gui';
    const FLORENCE_ROOT_ID = 'florence-root';
    const FLORENCE_DATA_ATTR = 'data-florence-instance';
    let florenceInitialized = false;
    let florenceInitDebounceTimer = null;
    let florenceReparentObserver = null;
    let florenceNavListenersRegistered = false;
    let florenceF2ListenerRegistered = false;

    const CFG_SELECTORS = {
        configButtonId: 'main-gui-config-btn',
        configTooltipAttr: 'title',
        configModalId: 'main-gui-config-modal',
        configModalContainer: 'body',
        keyCaptureFieldId: 'config-key-capture',
        saveBtnId: 'config-save-btn',
        cancelBtnId: 'config-cancel-btn'
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
        key: 'florence_main_gui_visibility_keybind',
        keyDisplay: 'florence_main_gui_visibility_keybind_label'
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

    function florenceCleanupExisting() {
        originalLog.call(console, '[Florence] florenceCleanupExisting: scanning for stale GUI instances');
        var allInstances = document.querySelectorAll('#' + FLORENCE_GUI_ID);
        for (var i = 0; i < allInstances.length; i++) {
            originalLog.call(console, '[Florence] florenceCleanupExisting: removing stale GUI node from ' + (allInstances[i].parentNode ? allInstances[i].parentNode.id || allInstances[i].parentNode.tagName : 'unknown'));
            if (allInstances[i].parentNode) {
                allInstances[i].parentNode.removeChild(allInstances[i]);
            }
        }
        var allRoots = document.querySelectorAll('#' + FLORENCE_ROOT_ID);
        for (var r = 0; r < allRoots.length; r++) {
            originalLog.call(console, '[Florence] florenceCleanupExisting: removing stale root container');
            if (allRoots[r].parentNode) {
                allRoots[r].parentNode.removeChild(allRoots[r]);
            }
        }
        var trappedPanels = document.querySelectorAll('[' + FLORENCE_DATA_ATTR + ']');
        for (var t = 0; t < trappedPanels.length; t++) {
            originalLog.call(console, '[Florence] florenceCleanupExisting: removing trapped panel with data attr');
            if (trappedPanels[t].parentNode) {
                trappedPanels[t].parentNode.removeChild(trappedPanels[t]);
            }
        }
    }

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
        } else if (code === 'Backquote') {
            label = '`';
        } else if (code === 'Minus') {
            label = '-';
        } else if (code === 'Equal') {
            label = '=';
        } else if (code === 'BracketLeft') {
            label = '[';
        } else if (code === 'BracketRight') {
            label = ']';
        } else if (code === 'Backslash') {
            label = '\\';
        } else if (code === 'Semicolon') {
            label = ';';
        } else if (code === 'Quote') {
            label = "'";
        } else if (code === 'Comma') {
            label = ',';
        } else if (code === 'Period') {
            label = '.';
        } else if (code === 'Slash') {
            label = '/';
        } else if (code === 'Space') {
            label = 'Space';
        } else if (code === 'Tab') {
            label = 'Tab';
        } else if (code === 'Escape') {
            label = 'Escape';
        } else if (code === 'Insert') {
            label = 'Insert';
        } else if (code === 'Delete') {
            label = 'Delete';
        } else if (code === 'Home') {
            label = 'Home';
        } else if (code === 'End') {
            label = 'End';
        } else if (code === 'PageUp') {
            label = 'Page Up';
        } else if (code === 'PageDown') {
            label = 'Page Down';
        } else {
            label = code || e.key || 'Unknown';
        }
        return { code: code, label: label };
    }

    function validateKeyChoice(code) {
        addLogMessage('validateKeyChoice: checking code=' + code, 'log');
        if (!code || code === '' || code === 'Unidentified') {
            addLogMessage('validateKeyChoice: empty or unidentified code, invalid', 'warn');
            return false;
        }
        for (var di = 0; di < CFG_KEYS.disallowed.length; di++) {
            if (code === CFG_KEYS.disallowed[di]) {
                addLogMessage('validateKeyChoice: code=' + code + ' is disallowed', 'warn');
                return false;
            }
        }
        addLogMessage('validateKeyChoice: code=' + code + ' is valid', 'log');
        return true;
    }

    function loadStoredKeybind() {
        addLogMessage('loadStoredKeybind: reading localStorage', 'log');
        var storedCode = localStorage.getItem(CFG_STORAGE.key);
        var storedLabel = localStorage.getItem(CFG_STORAGE.keyDisplay);
        if (storedCode && storedCode !== '' && validateKeyChoice(storedCode)) {
            addLogMessage('loadStoredKeybind: loaded code=' + storedCode + ' label=' + storedLabel, 'log');
            return { code: storedCode, label: storedLabel || storedCode };
        }
        addLogMessage('loadStoredKeybind: no valid stored keybind, using default=' + CFG_KEYS.defaultCode, 'log');
        return { code: CFG_KEYS.defaultCode, label: CFG_KEYS.defaultCode };
    }

    function saveKeybind(code, label) {
        addLogMessage('saveKeybind: persisting code=' + code + ' label=' + label, 'log');
        localStorage.setItem(CFG_STORAGE.key, code);
        localStorage.setItem(CFG_STORAGE.keyDisplay, label);
        var configBtn = document.getElementById(CFG_SELECTORS.configButtonId);
        if (configBtn) {
            configBtn.setAttribute(CFG_SELECTORS.configTooltipAttr, CFG_LABELS.configTooltip + ' (current: ' + label + ')');
            addLogMessage('saveKeybind: updated config icon tooltip', 'log');
        }
        addLogMessage('saveKeybind: complete', 'log');
    }

    function attachGlobalKeybindListener() {
        addLogMessage('attachGlobalKeybindListener: attaching listener for code=' + cfgState.currentCode, 'log');
        if (cfgState.globalKeybindHandler) {
            addLogMessage('attachGlobalKeybindListener: removing previous handler first', 'log');
            document.removeEventListener('keydown', cfgState.globalKeybindHandler, true);
            cfgState.globalKeybindHandler = null;
        }
        cfgState.globalKeybindHandler = function(e) {
            if (cfgState.keybindSuspended) {
                return;
            }
            if (cfgState.modalOpen) {
                return;
            }
            if (e.metaKey) {
                return;
            }
            var activeEl = document.activeElement;
            if (activeEl) {
                if (activeEl.matches(CFG_KEYS.ignoreWhenEditableSelectors)) {
                    return;
                }
            }
            var canonical = canonicalizeKeyEvent(e);
            if (canonical.code !== cfgState.currentCode) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (cfgState.debounceTimer) {
                return;
            }
            addLogMessage('attachGlobalKeybindListener: keybind matched code=' + canonical.code + ', toggling', 'log');
            cfgState.debounceTimer = setTimeout(function() {
                cfgState.debounceTimer = null;
            }, CFG_TIMEOUTS.debounceMs);
            toggleMainPanelVisibility();
        };
        document.addEventListener('keydown', cfgState.globalKeybindHandler, true);
        addLogMessage('attachGlobalKeybindListener: listener attached', 'log');
    }

    function detachGlobalKeybindListener() {
        addLogMessage('detachGlobalKeybindListener: detaching', 'log');
        if (cfgState.globalKeybindHandler) {
            document.removeEventListener('keydown', cfgState.globalKeybindHandler, true);
            cfgState.globalKeybindHandler = null;
            addLogMessage('detachGlobalKeybindListener: handler removed', 'log');
        } else {
            addLogMessage('detachGlobalKeybindListener: no handler to remove', 'log');
        }
        if (cfgState.debounceTimer) {
            clearTimeout(cfgState.debounceTimer);
            cfgState.debounceTimer = null;
        }
    }

    function applyVisibilityKeybind(code, label) {
        addLogMessage('applyVisibilityKeybind: applying code=' + code + ' label=' + label, 'log');
        detachGlobalKeybindListener();
        cfgState.currentCode = code;
        cfgState.currentLabel = label;
        attachGlobalKeybindListener();
        addLogMessage('applyVisibilityKeybind: applied and listener reattached', 'log');
    }

    function toggleMainPanelVisibility() {
        addLogMessage('toggleMainPanelVisibility: called, current guiVisible=' + guiVisible, 'log');
        var gui = document.getElementById(FLORENCE_GUI_ID);
        if (!gui) {
            addLogMessage('toggleMainPanelVisibility: no GUI found, creating', 'log');
            guiVisible = true;
            localStorage.setItem('florence-gui-visible', 'true');
            createGUI();
            gui = document.getElementById(FLORENCE_GUI_ID);
            if (gui) {
                gui.style.display = 'flex';
            }
            return;
        }
        if (gui.parentNode && gui.parentNode !== document.body) {
            addLogMessage('toggleMainPanelVisibility: GUI trapped, cleaning and recreating', 'log');
            florenceCleanupExisting();
            guiVisible = true;
            localStorage.setItem('florence-gui-visible', 'true');
            createGUI();
            gui = document.getElementById(FLORENCE_GUI_ID);
            if (gui) {
                gui.style.display = 'flex';
            }
            return;
        }
        guiVisible = !guiVisible;
        localStorage.setItem('florence-gui-visible', guiVisible ? 'true' : 'false');
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

    function insertConfigIconNextToClose(header, closeButton) {
        addLogMessage('insertConfigIconNextToClose: creating config icon', 'log');
        var configBtn = document.createElement('button');
        configBtn.id = CFG_SELECTORS.configButtonId;
        configBtn.setAttribute('aria-label', CFG_LABELS.configButtonAria);
        configBtn.setAttribute(CFG_SELECTORS.configTooltipAttr, CFG_LABELS.configTooltip + ' (current: ' + cfgState.currentLabel + ')');
        configBtn.setAttribute('type', 'button');
        configBtn.innerHTML = '\u2699';
        configBtn.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; margin-right: 6px; flex-shrink: 0;';
        configBtn.onmouseover = function() {
            configBtn.style.background = 'rgba(255, 255, 255, 0.35)';
        };
        configBtn.onmouseout = function() {
            configBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        configBtn.onfocus = function() {
            configBtn.style.outline = '2px solid rgba(255, 255, 255, 0.6)';
            configBtn.style.outlineOffset = '2px';
        };
        configBtn.onblur = function() {
            configBtn.style.outline = 'none';
        };
        configBtn.onclick = function(e) {
            e.stopPropagation();
            addLogMessage('insertConfigIconNextToClose: config icon clicked', 'log');
            openConfigModal();
        };
        configBtn.onkeydown = function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                addLogMessage('insertConfigIconNextToClose: config icon activated via keyboard', 'log');
                openConfigModal();
            }
        };
        if (closeButton && closeButton.parentNode === header) {
            header.insertBefore(configBtn, closeButton);
            addLogMessage('insertConfigIconNextToClose: inserted before close button', 'log');
        } else {
            header.appendChild(configBtn);
            addLogMessage('insertConfigIconNextToClose: close button not found in header, appended to end', 'warn');
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
            if (existingModal.parentNode) {
                existingModal.parentNode.removeChild(existingModal);
            }
        }

        var overlay = document.createElement('div');
        overlay.id = CFG_SELECTORS.configModalId;
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); z-index: 30000; display: flex; align-items: center; justify-content: center;';

        var container = document.createElement('div');
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'cfg-modal-title');
        container.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 0; width: 340px; max-width: 90%; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4); position: relative; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;';

        var modalHeader = document.createElement('div');
        modalHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.1); border-radius: 12px 12px 0 0;';

        var modalTitle = document.createElement('h3');
        modalTitle.id = 'cfg-modal-title';
        modalTitle.textContent = CFG_LABELS.modalTitle;
        modalTitle.style.cssText = 'margin: 0; color: white; font-size: 16px; font-weight: 600;';

        var modalClose = document.createElement('button');
        modalClose.innerHTML = '\u2715';
        modalClose.setAttribute('aria-label', 'Close configuration');
        modalClose.setAttribute('type', 'button');
        modalClose.style.cssText = 'background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;';
        modalClose.onmouseover = function() {
            modalClose.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        modalClose.onmouseout = function() {
            modalClose.style.background = 'rgba(255, 255, 255, 0.2)';
        };

        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(modalClose);

        var modalBody = document.createElement('div');
        modalBody.style.cssText = 'padding: 16px;';

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
        keyCaptureField.style.cssText = 'width: 100%; box-sizing: border-box; padding: 10px 12px; background: rgba(0, 0, 0, 0.3); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 8px; color: white; font-size: 14px; font-weight: 500; outline: none; cursor: pointer; text-align: center; letter-spacing: 0.5px; transition: border-color 0.3s ease;';
        keyCaptureField.onfocus = function() {
            keyCaptureField.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            keyCaptureField.value = '';
            keyCaptureField.setAttribute('placeholder', CFG_LABELS.keybindPlaceholder);
            cfgAnnounce(CFG_LABELS.captureOn);
            addLogMessage('openConfigModal: key capture field focused, awaiting key press', 'log');
        };
        keyCaptureField.onblur = function() {
            keyCaptureField.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            if (!cfgState.capturedLabel) {
                keyCaptureField.value = cfgState.currentLabel;
            }
        };

        var validationMsg = document.createElement('div');
        validationMsg.style.cssText = 'color: #ff6b6b; font-size: 12px; min-height: 18px; margin-top: 6px; transition: opacity 0.2s ease;';
        validationMsg.textContent = '';

        var ariaLive = document.createElement('span');
        ariaLive.setAttribute('aria-live', 'polite');
        ariaLive.setAttribute('role', 'status');
        ariaLive.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';

        function cfgAnnounce(text) {
            ariaLive.textContent = '';
            setTimeout(function() {
                ariaLive.textContent = text;
            }, 50);
        }

        var modalFooter = document.createElement('div');
        modalFooter.style.cssText = 'padding: 12px 16px; display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid rgba(255, 255, 255, 0.15);';

        var cancelBtn = document.createElement('button');
        cancelBtn.id = CFG_SELECTORS.cancelBtnId;
        cancelBtn.textContent = CFG_LABELS.cancel;
        cancelBtn.setAttribute('type', 'button');
        cancelBtn.style.cssText = 'background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); color: white; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.3s ease;';
        cancelBtn.onmouseover = function() {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.25)';
        };
        cancelBtn.onmouseout = function() {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        };

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

        saveBtn.onmouseover = function() {
            if (!saveBtn.disabled) {
                saveBtn.style.background = 'rgba(40, 167, 69, 1)';
            }
        };
        saveBtn.onmouseout = function() {
            if (!saveBtn.disabled) {
                saveBtn.style.background = 'rgba(40, 167, 69, 0.8)';
            } else {
                saveBtn.style.background = 'rgba(40, 167, 69, 0.6)';
            }
        };

        cfgState.modalKeyCaptureHandler = function(e) {
            if (!cfgState.modalOpen) {
                return;
            }
            if (document.activeElement !== keyCaptureField) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (e.metaKey) {
                addLogMessage('openConfigModal: ignoring key with metaKey', 'log');
                return;
            }
            if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
                return;
            }
            var canonical = canonicalizeKeyEvent(e);
            addLogMessage('openConfigModal: captured key code=' + canonical.code + ' label=' + canonical.label, 'log');
            keyCaptureField.value = canonical.label;
            cfgState.capturedCode = canonical.code;
            cfgState.capturedLabel = canonical.label;
            if (!validateKeyChoice(canonical.code)) {
                validationMsg.textContent = CFG_LABELS.invalidKey;
                cfgAnnounce(CFG_LABELS.invalidKey);
                updateSaveBtnState(false);
                addLogMessage('openConfigModal: key rejected code=' + canonical.code, 'warn');
            } else {
                validationMsg.textContent = '';
                updateSaveBtnState(true);
                addLogMessage('openConfigModal: key accepted code=' + canonical.code, 'log');
            }
        };
        keyCaptureField.addEventListener('keydown', cfgState.modalKeyCaptureHandler);

        function closeModal(didSave) {
            addLogMessage('openConfigModal.closeModal: closing modal, didSave=' + didSave, 'log');
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
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            cfgAnnounce(CFG_LABELS.captureOff);
            if (cfgState.focusReturnElement) {
                cfgState.focusReturnElement.focus();
            }
            addLogMessage('openConfigModal.closeModal: teardown complete', 'log');
        }

        modalClose.onclick = function() {
            addLogMessage('openConfigModal: modal X clicked, canceling', 'log');
            closeModal(false);
        };

        cancelBtn.onclick = function() {
            addLogMessage('openConfigModal: Cancel clicked', 'log');
            closeModal(false);
        };

        saveBtn.onclick = function() {
            if (saveBtn.disabled) {
                return;
            }
            if (!cfgState.capturedCode || !validateKeyChoice(cfgState.capturedCode)) {
                addLogMessage('openConfigModal: Save clicked but no valid key captured', 'warn');
                return;
            }
            addLogMessage('openConfigModal: Save clicked, applying code=' + cfgState.capturedCode + ' label=' + cfgState.capturedLabel, 'log');
            var newCode = cfgState.capturedCode;
            var newLabel = cfgState.capturedLabel;
            closeModal(true);
            applyVisibilityKeybind(newCode, newLabel);
            saveKeybind(newCode, newLabel);
            cfgAnnounce(CFG_LABELS.saved);
        };

        cfgState.modalEscHandler = function(e) {
            if (e.key === 'Escape' && cfgState.modalOpen) {
                if (document.activeElement === keyCaptureField) {
                    keyCaptureField.blur();
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                addLogMessage('openConfigModal: Escape pressed, closing modal', 'log');
                closeModal(false);
            }
        };
        document.addEventListener('keydown', cfgState.modalEscHandler, true);

        overlay.onclick = function(e) {
            if (e.target === overlay) {
                addLogMessage('openConfigModal: overlay clicked, closing modal', 'log');
                closeModal(false);
            }
        };

        modalBody.appendChild(fieldLabel);
        modalBody.appendChild(keyCaptureField);
        modalBody.appendChild(validationMsg);

        modalFooter.appendChild(cancelBtn);
        modalFooter.appendChild(saveBtn);

        container.appendChild(modalHeader);
        container.appendChild(modalBody);
        container.appendChild(modalFooter);
        container.appendChild(ariaLive);

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        addLogMessage('openConfigModal: modal rendered, focusing key capture field', 'log');
        setTimeout(function() {
            keyCaptureField.focus();
        }, 50);
    }

    function stopConfig() {
        addLogMessage('stopConfig: tearing down config feature', 'log');
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
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        if (cfgState.debounceTimer) {
            clearTimeout(cfgState.debounceTimer);
            cfgState.debounceTimer = null;
        }
        if (cfgState.focusReturnElement) {
            cfgState.focusReturnElement.focus();
            cfgState.focusReturnElement = null;
        }
        addLogMessage('stopConfig: teardown complete', 'log');
    }

    function configInit() {
        addLogMessage('configInit: initializing configuration feature', 'log');
        var stored = loadStoredKeybind();
        cfgState.currentCode = stored.code;
        cfgState.currentLabel = stored.label;
        addLogMessage('configInit: loaded keybind code=' + cfgState.currentCode + ' label=' + cfgState.currentLabel, 'log');
        attachGlobalKeybindListener();
        addLogMessage('configInit: global keybind listener attached', 'log');
    }

    function florenceTeardown() {
        originalLog.call(console, '[Florence] florenceTeardown: performing full teardown');
        detachGlobalKeybindListener();
        stopConfig();
        if (florenceReparentObserver) {
            florenceReparentObserver.disconnect();
            florenceReparentObserver = null;
            originalLog.call(console, '[Florence] florenceTeardown: disconnected reparent observer');
        }
        if (florenceInitDebounceTimer) {
            clearTimeout(florenceInitDebounceTimer);
            florenceInitDebounceTimer = null;
        }
        florenceCleanupExisting();
        florenceInitialized = false;
        originalLog.call(console, '[Florence] florenceTeardown: complete');
    }

    function florenceWatchForReparent() {
        if (florenceReparentObserver) {
            florenceReparentObserver.disconnect();
            florenceReparentObserver = null;
        }
        florenceReparentObserver = new MutationObserver(function(mutations) {
            var gui = document.getElementById(FLORENCE_GUI_ID);
            if (!gui) {
                return;
            }
            if (gui.parentNode && gui.parentNode !== document.body) {
                originalLog.call(console, '[Florence] florenceWatchForReparent: GUI trapped inside ' + (gui.parentNode.id || gui.parentNode.tagName) + ', reparenting to document.body');
                gui.parentNode.removeChild(gui);
                document.body.appendChild(gui);
            }
        });
        florenceReparentObserver.observe(document.body, { childList: true, subtree: true });
        originalLog.call(console, '[Florence] florenceWatchForReparent: observer started');
    }

    function florenceEnsureSingleInstance() {
        if (florenceInitDebounceTimer) {
            clearTimeout(florenceInitDebounceTimer);
        }
        florenceInitDebounceTimer = setTimeout(function() {
            florenceInitDebounceTimer = null;
            originalLog.call(console, '[Florence] florenceEnsureSingleInstance: checking singleton');
            var existingGui = document.getElementById(FLORENCE_GUI_ID);
            if (existingGui) {
                if (existingGui.parentNode && existingGui.parentNode !== document.body) {
                    originalLog.call(console, '[Florence] florenceEnsureSingleInstance: GUI found trapped in ' + (existingGui.parentNode.id || existingGui.parentNode.tagName) + ', cleaning up');
                    florenceCleanupExisting();
                    if (guiVisible) {
                        createGUI();
                        var newGui = document.getElementById(FLORENCE_GUI_ID);
                        if (newGui) {
                            newGui.style.display = 'flex';
                        }
                    }
                } else {
                    originalLog.call(console, '[Florence] florenceEnsureSingleInstance: GUI already exists in correct location, skipping');
                }
            } else {
                if (guiVisible) {
                    originalLog.call(console, '[Florence] florenceEnsureSingleInstance: no GUI found but guiVisible=true, recreating');
                    createGUI();
                    var recreatedGui = document.getElementById(FLORENCE_GUI_ID);
                    if (recreatedGui) {
                        recreatedGui.style.display = 'flex';
                    }
                }
            }
            if (!florenceReparentObserver) {
                florenceWatchForReparent();
            }
        }, 50);
    }


    function showWarning(message) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 30000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            border-radius: 12px;
            padding: 24px;
            width: 400px;
            max-width: 90%;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
            position: relative;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Warning';
        title.style.cssText = `
            margin: 0;
            color: white;
            font-size: 18px;
            font-weight: 600;
        `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;
        closeButton.onmouseover = () => closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
        closeButton.onmouseout = () => closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        closeButton.onclick = () => document.body.removeChild(modal);

        header.appendChild(title);
        header.appendChild(closeButton);

        const messageDiv = document.createElement('p');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
        `;

        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            margin-top: 20px;
            width: 100%;
        `;
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
    function makeDraggable(container, handle) {
        let isDraggingModal = false;
        let offsetX = 0;
        let offsetY = 0;
        let currentScale = 1;

        handle.style.cursor = 'move';

        handle.addEventListener('mousedown', function(e) {
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

        document.addEventListener('mousemove', function(e) {
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

        document.addEventListener('mouseup', function() {
            isDraggingModal = false;
        });
    }
    function createGUI() {
        originalLog.call(console, '[Florence] createGUI: called');
        var existingGui = document.getElementById(FLORENCE_GUI_ID);
        if (existingGui) {
            if (existingGui.parentNode === document.body) {
                originalLog.call(console, '[Florence] createGUI: GUI already exists on document.body, skipping creation');
                return;
            }
            originalLog.call(console, '[Florence] createGUI: stale GUI found in wrong parent, removing');
            florenceCleanupExisting();
        }
        const guiContainer = document.createElement('div');
        guiContainer.id = FLORENCE_GUI_ID;
        guiContainer.setAttribute(FLORENCE_DATA_ATTR, 'true');
        guiContainer.style.cssText = `
        position: fixed;
        top: 100px;
        right: 100px;
        width: 350px;
        min-height: 400px;
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
        title.textContent = 'Florence Automator';
        title.style.cssText = `
        margin: 0;
        color: white;
        font-size: 16px;
        font-weight: 600;
    `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
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
        buttonsContainer.style.cssText = `
        padding: 16px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        background: rgba(255, 255, 255, 0.05);
    `;

        for (let i = 1; i <= 8; i++) {
            const button = document.createElement('button');
            if (i === 1) {
                button.textContent = 'Add Signatures';
            } else if (i === 2) {
                button.textContent = 'Add Training Log Staff Entries';
                button.id = 'elog-staff-entries-btn';
            } else if (i === 3) {
                button.textContent = "Clean Study Task List";
                button.id = 'clean-resp-btn';
            } else if (i === 4) {
                button.textContent = "Add DoA Log Staff Entries";
                button.id = 'doa-staff-entries-btn';
            } else if (i === 5) {
                button.textContent = 'Set Role Responsibilities';
                button.id = 'resp-set-btn';
            } else if (i === 6) {
                button.textContent = "Select Checkboxes";
                button.id = 'cb-select-btn';
            } else if (i === 7) {
                button.textContent = 'Add Start Date';
                button.id = 'startdate-btn';
            } else if (i === 8) {
                button.textContent = 'Select Signed Checkbox';
                button.id = 'ssig-select-btn';
            }
            button.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
            button.onmouseover = () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
            };
            button.onmouseout = () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
            };

            if (i === 1) {
                button.onclick = () => {
                    console.log('Add Signatures button clicked');
                    startAddSignaturesFlow();
                };
            } else if (i === 2) {
                button.onclick = () => {
                    console.log('Add ELog Staff Entries button clicked');
                    addELogStaffEntriesInit();
                };
            } else if (i === 3) {
                button.onclick = () => {
                    console.log('Clean Responsibility button clicked');
                    cleanResponsibilityInit();
                };
            } else if (i === 4) {
                button.onclick = () => {
                    console.log('Add DoA Log Staff Entries button clicked');
                    addDoALogStaffEntriesInit();
                };
            } else if (i === 5) {
                button.onclick = () => {
                    console.log('Set Responsibilities button clicked');
                    setResponsibilitiesInit();
                };
            } else if (i === 6) {
                button.onclick = () => {
                    console.log('Select Checkboxes button clicked');
                    selectCheckboxesInit();
                };
            } else if (i === 7) {
                button.onclick = () => {
                    console.log('Add Start Date button clicked');
                    addStartDateInit();
                };
            } else if (i === 8) {
                button.onclick = () => {
                    console.log('Select Signed Checkbox button clicked');
                    selectSignedCheckboxInit();
                };
            }

            buttonsContainer.appendChild(button);
        }

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
            localStorage.setItem('florence-gui-scale', newScale);
            scaleLabel.textContent = `Scale: ${newScale.toFixed(2)}x (refresh to apply)`;
        };

        scaleContainer.appendChild(scaleLabel);
        scaleContainer.appendChild(scaleSlider);

        const clearLogsBtn = document.createElement('button');
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
        logBox.id = 'florence-log-box';
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

        document.body.appendChild(guiContainer);
        makeDraggable(guiContainer, header);
        addLogMessage('Florence Automator GUI initialized', 'log');
        updateGUIScale();
    }

    function updateLogBox() {
        const logBox = document.getElementById('florence-log-box');
        if (!logBox) return;
        var maxDisplay = 200;
        var startIdx = Math.max(0, logMessages.length - maxDisplay);
        var html = '';
        for (var i = startIdx; i < logMessages.length; i++) {
            var msg = logMessages[i];
            var color = msg.type === 'error' ? '#ff6b6b' :
                msg.type === 'warn' ? '#ffd93d' : '#6bcf7f';
            html += '<div style="color: ' + color + '; margin-bottom: 4px;"><span style="opacity: 0.7;">[' + msg.timestamp + ']</span> ' + msg.message + '</div>';
        }
        logBox.innerHTML = html;
        logBox.scrollTop = logBox.scrollHeight;
    }

    function updateGUIScale() {
        const gui = document.getElementById('florence-gui');
        if (!gui) return;

        gui.style.transform = `scale(${guiScale})`;
        gui.style.transformOrigin = 'top left';
    }

    function toggleGUI() {
        originalLog.call(console, '[Florence] toggleGUI: delegating to toggleMainPanelVisibility');
        toggleMainPanelVisibility();
    }

    function openSignaturesInputGUI() {
        addLogMessage('openSignaturesInputGUI: opening input modal', 'log');
        const modal = document.createElement('div');
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

        const container = document.createElement('div');
        container.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 24px;
        width: 450px;
        max-width: 90%;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
        position: relative;
    `;

        const header = document.createElement('div');
        header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    `;

        const title = document.createElement('h3');
        title.textContent = 'Add Signatures';
        title.style.cssText = `
        margin: 0;
        color: white;
        font-size: 18px;
        font-weight: 600;
        letter-spacing: 0.2px;
    `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    `;
        closeButton.onmouseover = () => {
            closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        };
        closeButton.onmouseout = () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeButton.onclick = () => {
            addLogMessage('openSignaturesInputGUI: modal closed by user', 'warn');
            document.body.removeChild(modal);
        };

        header.appendChild(title);
        header.appendChild(closeButton);

        const description = document.createElement('p');
        description.textContent = 'Paste or type the full list of signers. Separate names with commas or place each name on a new line.';
        description.style.cssText = `
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 12px 0;
        font-size: 14px;
        line-height: 1.4;
    `;

        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Name1, Name2, Name3\nor\nName1\nName2\nName3';
        textarea.style.cssText = `
        width: 100%;
        height: 140px;
        padding: 12px 14px;
        border: 2px solid rgba(255, 255, 255, 0.35);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.95);
        color: #1e293b;
        font-size: 14px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        resize: vertical;
        outline: none;
        transition: all 0.25s ease;
        box-shadow: 0 2px 0 rgba(0,0,0,0.04) inset;
    `;
        textarea.onfocus = () => {
            textarea.style.borderColor = '#8ea0ff';
            textarea.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.25)';
        };
        textarea.onblur = () => {
            textarea.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            textarea.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04) inset';
        };

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        margin-top: 20px;
        justify-content: flex-end;
    `;

        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All';
        clearButton.style.cssText = `
        background: rgba(255, 255, 255, 0.18);
        border: 2px solid rgba(255, 255, 255, 0.35);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.25s ease;
        backdrop-filter: blur(2px);
    `;
        clearButton.onmouseover = () => {
            clearButton.style.background = 'rgba(255, 255, 255, 0.28)';
        };
        clearButton.onmouseout = () => {
            clearButton.style.background = 'rgba(255, 255, 255, 0.18)';
        };
        clearButton.onclick = () => {
            addLogMessage('openSignaturesInputGUI: Clear All clicked', 'log');
            textarea.value = '';
        };

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm';
        confirmButton.style.cssText = `
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        border: 2px solid rgba(255, 255, 255, 0.35);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.2px;
        transition: all 0.25s ease;
    `;
        confirmButton.onmouseover = () => {
            confirmButton.style.background = 'linear-gradient(135deg, #218838 0%, #1ea085 100%)';
        };
        confirmButton.onmouseout = () => {
            confirmButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        };
        confirmButton.onclick = () => {
            addLogMessage('openSignaturesInputGUI: Confirm clicked', 'log');
            const names = sortNamesAlphabetically(parseNames(textarea.value));
            addLogMessage('openSignaturesInputGUI: parsed and sorted ' + names.length + ' name(s)', 'log');
            if (names.length === 0) {
                addLogMessage('openSignaturesInputGUI: no names entered, showing warning', 'warn');
                showWarning('Please enter at least one name.');
                return;
            }
            document.body.removeChild(modal);
            processSignatures(names);
        };

        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(confirmButton);

        container.appendChild(header);
        container.appendChild(description);
        container.appendChild(textarea);
        container.appendChild(buttonContainer);

        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);

        document.body.appendChild(modal);

        textarea.focus();
    }

    function startAddSignaturesFlow() {
        addLogMessage('Start Add Signatures flow clicked', 'log');
        addLogMessage('Validating if user is on the Request Signatures page', 'log');
        const isOnSignaturePage = validateSignaturePage();
        if (isOnSignaturePage) {
            addLogMessage('User is on the Request Signatures page, opening input GUI', 'log');
            openSignaturesInputGUI();
        } else {
            addLogMessage('User is not on the Request Signatures page, showing warning first', 'warn');
            showWarning('Please navigate to the "Request Signatures" page first.');
        }
    }
    function sortNamesAlphabetically(names) {
        addLogMessage('sortNamesAlphabetically: sorting ' + names.length + ' name(s)', 'log');
        var sorted = names.slice().sort(function(a, b) {
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });
        addLogMessage('sortNamesAlphabetically: sorted order = ' + JSON.stringify(sorted), 'log');
        return sorted;
    }

    function parseNames(input) {
        addLogMessage('parseNames: start', 'log');
        if (!input || !input.trim()) {
            addLogMessage('parseNames: empty input', 'warn');
            return [];
        }

        const names = [];
        const lines = input.split('\n');
        addLogMessage('parseNames: lines detected = ' + lines.length, 'log');

        for (const line of lines) {
            const lineNames = line.split(',').map(name => name.trim()).filter(name => name);
            addLogMessage('parseNames: line parsed -> ' + JSON.stringify(lineNames), 'log');
            names.push(...lineNames);
        }

        addLogMessage('parseNames: total names parsed = ' + names.length, 'log');
        return names;
    }


    function validateSignaturePage() {
        addLogMessage('validateSignaturePage: checking DOM for Request Signatures UI', 'log');
        const modalContainer = document.querySelector('modal-container');
        const signatureRequests = document.querySelector('documents-signature-requests');
        const headerTitle = document.querySelector('.c-modal-with-tabs_header_title');

        let conditionA = false;
        if (modalContainer && signatureRequests) {
            conditionA = true;
        }

        let conditionB = false;
        if (headerTitle && headerTitle.textContent && headerTitle.textContent.trim() === 'Request Signatures') {
            conditionB = true;
        }

        addLogMessage('validateSignaturePage: conditionA(modal + signatureRequests)=' + conditionA + ', conditionB(headerTitle)=' + conditionB, 'log');
        const result = conditionA || conditionB;
        addLogMessage('validateSignaturePage: result=' + result, 'log');
        return result;
    }

    function processSignatures(names) {
        addLogMessage('processSignatures: start', 'log');
        if (!validateSignaturePage()) {
            addLogMessage('processSignatures: not on Request Signatures page, showing warning', 'warn');
            showWarning('Please navigate to the "Request Signatures" page first.');
            return;
        }

        addLogMessage('processSignatures: proceeding with ' + names.length + ' name(s)', 'log');
        showLoadingGUI(names);
        setTimeout(() => {
            addLogMessage('processSignatures: calling executeSignatureSelection after delay', 'log');
            executeSignatureSelection(names);
        }, 100);
    }

    function showLoadingGUI(names) {
        const modal = document.createElement('div');
        modal.id = 'signatures-loading-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 40000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 24px;
            width: 500px;
            max-width: 90%;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
            position: relative;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Processing Signatures';
        title.style.cssText = `
            margin: 0;
            color: white;
            font-size: 18px;
            font-weight: 600;
        `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;
        closeButton.onmouseover = () => closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        closeButton.onmouseout = () => closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        closeButton.onclick = () => {
            window.signatureProcessStopped = true;
            document.body.removeChild(modal);
        };

        header.appendChild(title);
        header.appendChild(closeButton);

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        const statusContainer = document.createElement('div');
        statusContainer.id = 'signature-status-container';
        statusContainer.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 12px;
        `;

        container.appendChild(header);
        container.appendChild(spinner);

        const warningMessage = document.createElement('div');
        warningMessage.style.cssText = `
            background: rgba(255, 193, 7, 0.2);
            border-left: 4px solid #ffc107;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 16px;
            color: white;
            font-size: 13px;
            line-height: 1.5;
        `;
        warningMessage.innerHTML = `
            <strong style="display: block; margin-bottom: 4px; font-size: 14px;">⚠️ Important</strong>
            Please do not click anywhere on the page while the automation is running. Clicking may close the dropdown menu and interrupt the process.
        `;
        container.appendChild(warningMessage);
        container.appendChild(statusContainer);
        modal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        modal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(modal);

        names.forEach(name => {
            const statusDiv = document.createElement('div');
            statusDiv.id = `status-${name.replace(/\s+/g, '-')}`;
            statusDiv.style.cssText = `
                color: white;
                padding: 8px;
                margin: 4px 0;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                font-size: 14px;
            `;
            statusDiv.innerHTML = `<strong>${name}:</strong> <span style="color: #ffd93d;">Processing...</span>`;
            statusContainer.appendChild(statusDiv);
        });
    }

    function updateSignatureStatus(name, status, color = '#6bcf7f') {
        addLogMessage('updateSignatureStatus: name="' + name + '" status="' + status + '" color="' + color + '"', 'log');
        const statusDiv = document.getElementById('status-' + name.replace(/\s+/g, '-'));
        if (statusDiv) {
            statusDiv.innerHTML = '<strong>' + name + ':</strong> <span style="color: ' + color + ';">' + status + '</span>';
        } else {
            addLogMessage('updateSignatureStatus: statusDiv not found for "' + name + '"', 'warn');
        }
    }

    function executeSignatureSelection(names) {
        addLogMessage('executeSignatureSelection: start', 'log');
        window.signatureProcessStopped = false;

        try {
            const signersTab = document.querySelector('li.nav-item.active a[role="tab"]');
            if (signersTab && signersTab.textContent && signersTab.textContent.includes('Signers')) {
                addLogMessage('executeSignatureSelection: active Signers tab found, clicking', 'log');
                signersTab.click();
                setTimeout(() => {
                    addLogMessage('executeSignatureSelection: proceeding to selectSigners', 'log');
                    selectSigners(names);
                }, 500);
            } else {
                addLogMessage('executeSignatureSelection: active Signers tab not found, scanning all tabs', 'warn');
                const allTabs = document.querySelectorAll('li.nav-item a[role="tab"]');
                addLogMessage('executeSignatureSelection: total tabs found = ' + allTabs.length, 'log');
                let clicked = false;
                for (const tab of allTabs) {
                    const label = (tab.textContent || '').trim();
                    addLogMessage('executeSignatureSelection: inspecting tab label="' + label + '"', 'log');
                    if (label.includes('Signers')) {
                        addLogMessage('executeSignatureSelection: Signers tab found, clicking', 'log');
                        tab.click();
                        clicked = true;
                        setTimeout(() => {
                            addLogMessage('executeSignatureSelection: proceeding to selectSigners after tab click', 'log');
                            selectSigners(names);
                        }, 500);
                        return;
                    }
                }
                if (!clicked) {
                    addLogMessage('executeSignatureSelection: Could not find Signers tab', 'error');
                    updateSignatureStatus('System', 'Could not find Signers tab', '#ff6b6b');
                }
            }
        } catch (error) {
            addLogMessage('executeSignatureSelection: Error navigating to Signers tab: ' + error, 'error');
            updateSignatureStatus('System', 'Navigation failed', '#ff6b6b');
        }
    }

    function selectSigners(names) {
        addLogMessage('selectSigners: start', 'log');
        if (window.signatureProcessStopped) {
            addLogMessage('selectSigners: process stopped flag detected, aborting', 'warn');
            return;
        }

        try {
            const searchInput = document.querySelector('input.filtered-select__input[placeholder*="Search Signer"], input.filtered-select__input[placeholder*="Search"]');
            if (searchInput) {
                addLogMessage('selectSigners: search input found, clicking to open list', 'log');
                searchInput.click();
                searchInput.focus();
                setTimeout(() => {
                    addLogMessage('selectSigners: calling processSignerList', 'log');
                    processSignerList(names);
                }, 400);
            } else {
                addLogMessage('selectSigners: Search input not found', 'error');
                updateSignatureStatus('System', 'Search input not found', '#ff6b6b');
            }
        } catch (error) {
            addLogMessage('selectSigners: Error clicking search input: ' + error, 'error');
            updateSignatureStatus('System', 'Failed to open signer list', '#ff6b6b');
        }
    }
    function closeLoadingGUI() {
        try {
            const modal = document.getElementById('signatures-loading-modal');
            if (modal) {
                document.body.removeChild(modal);
                addLogMessage('closeLoadingGUI: modal closed successfully', 'log');
            } else {
                addLogMessage('closeLoadingGUI: modal not found', 'warn');
            }
        } catch (e) {
            addLogMessage('closeLoadingGUI: error closing modal: ' + e, 'error');
        }
    }

    function getExistingSignersFromTable(callback) {
        const existingNames = new Set();
        addLogMessage('getExistingSignersFromTable: starting to collect all existing signers', 'log');

        try {
            const table = document.querySelector('.documents-signers-tab__table');
            if (!table) {
                addLogMessage('getExistingSignersFromTable: table not found', 'warn');
                callback([]);
                return;
            }

            const viewport = table.querySelector('cdk-virtual-scroll-viewport');
            if (!viewport) {
                addLogMessage('getExistingSignersFromTable: viewport not found, collecting visible rows only', 'warn');
                const rows = table.querySelectorAll('[role="row"].documents-signers-tab__table__row');
                rows.forEach(row => {
                    const ariaLabel = row.getAttribute('aria-label');
                    if (ariaLabel) {
                        existingNames.add(ariaLabel.trim().toLowerCase());
                    }
                });
                callback(Array.from(existingNames));
                return;
            }

            let scrollPosition = 0;
            const SCROLL_STEP = 200;

            function scrollAndCollect() {
                viewport.scrollTop = scrollPosition;

                setTimeout(() => {
                    const rows = table.querySelectorAll('[role="row"].documents-signers-tab__table__row');
                    rows.forEach(row => {
                        const ariaLabel = row.getAttribute('aria-label');
                        if (ariaLabel) {
                            existingNames.add(ariaLabel.trim().toLowerCase());
                        }
                    });

                    addLogMessage('getExistingSignersFromTable: collected ' + existingNames.size + ' unique names at scroll position ' + scrollPosition, 'log');

                    if (scrollPosition >= viewport.scrollHeight - viewport.clientHeight) {
                        const finalNames = Array.from(existingNames);
                        addLogMessage('getExistingSignersFromTable: finished collecting ' + finalNames.length + ' total existing signers', 'log');
                        viewport.scrollTop = 0;
                        callback(finalNames);
                        return;
                    }

                    scrollPosition += SCROLL_STEP;
                    setTimeout(scrollAndCollect, 150);
                }, 150);
            }

            scrollAndCollect();

        } catch (e) {
            addLogMessage('getExistingSignersFromTable: error: ' + e, 'error');
            callback(Array.from(existingNames));
        }
    }

    function normalizeName(name) {
        if (!name) return '';

        let normalized = name
        .replace(/[`'"''""_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

        addLogMessage('normalizeName: "' + name + '" -> "' + normalized + '"', 'log');
        return normalized;
    }

    function filterOutExistingSigners(names, callback) {
        getExistingSignersFromTable(function(existingSigners) {
            const filteredNames = [];
            const duplicates = [];
            const normalizedExistingSigners = existingSigners.map(s => normalizeName(s).toLowerCase());

            names.forEach(name => {
                const normalizedName = normalizeName(name).toLowerCase();

                if (normalizedExistingSigners.includes(normalizedName)) {
                    addLogMessage('filterOutExistingSigners: "' + name + '" already exists, skipping', 'log');
                    updateSignatureStatus(name, 'Already Exist', '#ffd93d');
                    duplicates.push({ name: name, status: 'Already Exist', statusType: 'duplicate' });
                } else {
                    filteredNames.push(name);
                }
            });

            addLogMessage('filterOutExistingSigners: ' + filteredNames.length + ' names to process after filtering', 'log');
            callback(filteredNames, duplicates);
        });
    }
    function processSignerList(names) {
        lastScrollPosition = 0;
        addLogMessage('processSignerList: start with ' + names.length + ' names to process', 'log');

        filterOutExistingSigners(names, function(filteredNames, duplicates) {
            if (filteredNames.length === 0) {
                addLogMessage('processSignerList: no names to process after filtering', 'log');
                setTimeout(() => {
                    showCompletionSummary(names, duplicates || []);
                }, 500);
                return;
            }
            const processResults = duplicates || [];
            let index = 0;

            function processNext() {
                if (window.signatureProcessStopped) {
                    addLogMessage('processSignerList: stop flag detected, ending sequence', 'warn');
                    return;
                }

                if (index >= filteredNames.length) {
                    addLogMessage('processSignerList: all names processed, showing completion summary', 'log');
                    setTimeout(() => {
                        showCompletionSummary(names, processResults);
                    }, 500);
                    return;
                }

                const originalName = filteredNames[index];
                addLogMessage('processSignerList: processing "' + originalName + '" (index ' + (index + 1) + ' of ' + filteredNames.length + ')', 'log');

                const parts = splitNameParts(originalName);

                try {
                    attemptSelectByScrolling(parts, function(success, matchType) {
                        const searchInput = document.querySelector('input.filtered-select__input[placeholder*="Search Signer"], input.filtered-select__input[placeholder*="Search"]');
                        if (searchInput) {
                            clearSearchInput(searchInput);
                            setTimeout(() => {
                                searchInput.click();
                                searchInput.focus();
                                setTimeout(() => {
                                    const viewport = document.querySelector('cdk-virtual-scroll-viewport');
                                    if (viewport) {
                                        viewport.scrollTop = lastScrollPosition;
                                        addLogMessage('processNext: restored scroll position to ' + lastScrollPosition, 'log');
                                    }
                                }, 50);
                            }, 100);
                        }

                        if (success) {
                            updateSignatureStatus(originalName, matchType, '#6bcf7f');
                            processResults.push({ name: originalName, status: matchType, statusType: 'success' });
                            index = index + 1;
                            setTimeout(processNext, 500);
                            return;
                        } else {
                            addLogMessage('processSignerList: not found after scrolling search -> "' + originalName + '"', 'warn');
                            updateSignatureStatus(originalName, 'Not found', '#ff6b6b');
                            processResults.push({ name: originalName, status: 'Not found', statusType: 'failure' });
                            index = index + 1;
                            setTimeout(processNext, 500);
                            return;
                        }
                    });
                } catch (err) {
                    addLogMessage('processSignerList: error while processing "' + originalName + '": ' + err, 'error');
                    updateSignatureStatus(originalName, 'Processing failed', '#ff6b6b');
                    index = index + 1;
                    setTimeout(processNext, 400);
                    return;
                }
            }
            processNext();
        });
    }
    function attemptSelectByQuery(searchInput, query, parts, callback) {
        addLogMessage('attemptSelectByQuery: searching for "' + query + '"', 'log');

        clearSearchInput(searchInput);

        typeIntoSearchInput(searchInput, query, function() {
            waitForListUpdate(query, 3000, 200, function(items) {
                addLogMessage('attemptSelectByQuery: list updated, searching for candidate', 'log');
                const candidate = findCandidateItem(items, parts);

                if (candidate) {
                    addLogMessage('attemptSelectByQuery: found candidate for "' + query + '"', 'log');
                    const clicked = clickCheckboxForItem(candidate, parts.full);
                    if (clicked) {
                        setTimeout(function() {
                            clickAddButtonIfEnabled();
                            callback(true, 'Selected by search');
                        }, 80);
                        return;
                    }
                } else {
                    addLogMessage('attemptSelectByQuery: no candidate found for "' + query + '"', 'warn');
                }
                callback(false, '');
            }, function() {
                addLogMessage('attemptSelectByQuery: timeout waiting for list update', 'warn');
                callback(false, '');
            });
        });
    }

    function attemptSelectByScrolling(parts, callback, retryCount = 0) {
        addLogMessage('attemptSelectByScrolling: searching for "' + parts.full + '" (attempt ' + (retryCount + 1) + ')', 'log');

        const viewport = document.querySelector('cdk-virtual-scroll-viewport');
        if (!viewport) {
            addLogMessage('attemptSelectByScrolling: viewport not found', 'error');
            callback(false, '');
            return;
        }

        let scrollPosition = retryCount > 0 ? 0 : lastScrollPosition;
        const SCROLL_STEP = 200;
        const MAX_SCROLLS = 50;
        let scrollCount = 0;
        let hasScrolledFullCycle = false;

        function scrollAndCheck() {
            if (window.signatureProcessStopped) {
                addLogMessage('attemptSelectByScrolling: process stopped', 'warn');
                callback(false, '');
                return;
            }

            viewport.scrollTop = scrollPosition;
            lastScrollPosition = scrollPosition;

            setTimeout(function() {
                try {
                    const items = document.querySelectorAll('.filtered-select__list__item');
                    addLogMessage('attemptSelectByScrolling: found ' + items.length + ' items at scroll position ' + scrollPosition, 'log');

                    if (items.length > 0) {
                        const candidate = findCandidateItem(items, parts);
                        if (candidate) {
                            addLogMessage('attemptSelectByScrolling: found candidate for "' + parts.full + '"', 'log');
                            const clicked = clickCheckboxForItem(candidate, parts.full);
                            if (clicked) {
                                setTimeout(function() {
                                    clickAddButtonIfEnabled();
                                    lastScrollPosition = scrollPosition;
                                    addLogMessage('attemptSelectByScrolling: updated lastScrollPosition to ' + lastScrollPosition, 'log');
                                    callback(true, 'Selected');
                                }, 80);
                                return;
                            }
                        }
                    }

                    scrollPosition += SCROLL_STEP;
                    scrollCount++;

                    if (scrollPosition >= viewport.scrollHeight - viewport.clientHeight) {
                        if (!hasScrolledFullCycle) {
                            addLogMessage('attemptSelectByScrolling: reached bottom, starting from top', 'log');
                            scrollPosition = 0;
                            hasScrolledFullCycle = true;
                        } else {
                            if (retryCount === 0) {
                                addLogMessage('attemptSelectByScrolling: first attempt failed, retrying with reset scroll', 'warn');
                                setTimeout(() => {
                                    attemptSelectByScrolling(parts, callback, 1);
                                }, 500);
                                return;
                            } else {
                                addLogMessage('attemptSelectByScrolling: second attempt failed, moving to next name', 'warn');
                                callback(false, '');
                                return;
                            }
                        }
                    }

                    if (scrollCount >= MAX_SCROLLS) {
                        if (retryCount === 0) {
                            addLogMessage('attemptSelectByScrolling: max scrolls reached on first attempt, retrying', 'warn');
                            setTimeout(() => {
                                attemptSelectByScrolling(parts, callback, 1);
                            }, 500);
                            return;
                        } else {
                            addLogMessage('attemptSelectByScrolling: max scrolls reached on second attempt, moving to next name', 'warn');
                            callback(false, '');
                            return;
                        }
                    }

                    setTimeout(scrollAndCheck, 50);

                } catch (err) {
                    addLogMessage('attemptSelectByScrolling: error during scroll: ' + err, 'error');
                    if (retryCount === 0) {
                        setTimeout(() => {
                            attemptSelectByScrolling(parts, callback, 1);
                        }, 500);
                    } else {
                        callback(false, '');
                    }
                }
            }, 100);
        }

        scrollAndCheck();
    }

    function splitNameParts(name) {
        const result = { full: name, first: '', last: '' };

        if (!name) {
            addLogMessage('splitNameParts: empty name received', 'warn');
            return result;
        }

        const trimmed = normalizeName(name);

        if (trimmed.indexOf(',') !== -1) {
            const parts = trimmed.split(',').map(x => x.trim()).filter(x => x);
            if (parts.length >= 2) {
                result.last = parts[0];
                result.first = parts[1].split(' ').filter(x => x)[0] || '';
            }
        } else {
            const tokens = trimmed.split(' ').filter(x => x);
            if (tokens.length >= 2) {
                result.first = tokens[0];
                result.last = tokens[tokens.length - 1];
            } else if (tokens.length === 1) {
                result.first = tokens[0];
                result.last = '';
            }
        }

        addLogMessage('splitNameParts: name="' + name + '" -> first="' + result.first + '" last="' + result.last + '"', 'log');
        return result;
    }
    function clearSearchInput(input) {
        try {
            input.focus();
            input.value = '';
            const ev1 = new InputEvent('input', { bubbles: true });
            input.dispatchEvent(ev1);
            const ev2 = new KeyboardEvent('keyup', { bubbles: true, key: 'Backspace' });
            input.dispatchEvent(ev2);
            const ev3 = new Event('change', { bubbles: true });
            input.dispatchEvent(ev3);
            addLogMessage('clearSearchInput: input cleared', 'log');
        } catch (e) {
            addLogMessage('clearSearchInput: error clearing input: ' + e, 'error');
        }
    }

    function waitForListUpdate(expectedFragment, timeoutMs, intervalMs, onSuccess, onTimeout) {
        const start = Date.now();

        function poll() {
            const snapshot = getListItemsSnapshot();
            const names = snapshot.itemsText;

            if (snapshot.items.length > 0) {
                let hasRelated = false;
                for (let i = 0; i < names.length; i++) {
                    const txt = names[i].toLowerCase();
                    if (txt.indexOf(expectedFragment.toLowerCase()) !== -1) {
                        hasRelated = true;
                        break;
                    }
                }

                if (hasRelated) {
                    addLogMessage('waitForListUpdate: related items detected for "' + expectedFragment + '"', 'log');
                    onSuccess(snapshot.items);
                    return;
                }
            }

            if ((Date.now() - start) >= timeoutMs) {
                onTimeout();
                return;
            }

            setTimeout(poll, intervalMs);
        }

        poll();
    }

    function typeIntoSearchInput(input, text, done) {
        try {
            input.focus();
            input.value = '';
            const evClear = new InputEvent('input', { bubbles: true });
            input.dispatchEvent(evClear);
            addLogMessage('typeIntoSearchInput: typing "' + text + '"', 'log');

            let i = 0;

            function typeNext() {
                if (i >= text.length) {
                    const evChange = new Event('change', { bubbles: true });
                    input.dispatchEvent(evChange);
                    addLogMessage('typeIntoSearchInput: finished typing "' + text + '"', 'log');
                    if (typeof done === 'function') {
                        done();
                    }
                    return;
                }

                const ch = text.charAt(i);
                const evKeyDown = new KeyboardEvent('keydown', { bubbles: true, key: ch });
                input.dispatchEvent(evKeyDown);

                input.value = input.value + ch;

                const evInput = new InputEvent('input', { bubbles: true, data: ch });
                input.dispatchEvent(evInput);

                const evKeyUp = new KeyboardEvent('keyup', { bubbles: true, key: ch });
                input.dispatchEvent(evKeyUp);

                i = i + 1;
                setTimeout(typeNext, 30);
            }

            typeNext();
        } catch (e) {
            addLogMessage('typeIntoSearchInput: error typing "' + text + '": ' + e, 'error');
            if (typeof done === 'function') {
                done();
            }
        }
    }
    function getListItemsSnapshot() {
        const container = document.querySelector('.filtered-select__list');
        let items = [];
        if (container) {
            items = Array.from(container.querySelectorAll('.filtered-select__list__item'));
        } else {
            items = Array.from(document.querySelectorAll('.filtered-select__list__item'));
        }
        const itemsText = items.map(getItemDisplayName);
        addLogMessage('getListItemsSnapshot: items now=' + items.length, 'log');
        return { items: items, itemsText: itemsText };
    }

    function getItemDisplayName(li) {
        if (!li) {
            return '';
        }

        const aria = li.getAttribute('aria-label') || '';
        if (aria && aria.trim().length > 0) {
            return aria.trim().replace(/\s+/g, ' ');
        }

        const span = li.querySelector('.filtered-select__list__item__text');
        if (span && span.textContent) {
            return span.textContent.trim().replace(/\s+/g, ' ');
        }

        return (li.textContent || '').trim().replace(/\s+/g, ' ');
    }
    function findCandidateItem(items, parts) {
        const firstLower = normalizeName(parts.first || '').toLowerCase();
        const lastLower = normalizeName(parts.last || '').toLowerCase();

        const candidates = [];
        for (let i = 0; i < items.length; i++) {
            const nameText = normalizeName(getItemDisplayName(items[i]));
            const lc = nameText.toLowerCase();

            if (firstLower && lc.indexOf(firstLower) !== -1) {
                candidates.push({ item: items[i], name: nameText });
            }
        }

        if (candidates.length === 1) {
            addLogMessage('findCandidateItem: single candidate on first name -> "' + candidates[0].name + '"', 'log');
            return candidates[0].item;
        }

        if (candidates.length > 1 && lastLower) {
            for (let j = 0; j < candidates.length; j++) {
                const n = candidates[j].name.toLowerCase();
                if (n.indexOf(lastLower) !== -1) {
                    addLogMessage('findCandidateItem: disambiguated by last name -> "' + candidates[j].name + '"', 'log');
                    return candidates[j].item;
                }
            }
        }

        if (!parts.first && lastLower) {
            for (let k = 0; k < items.length; k++) {
                const nt = getItemDisplayName(items[k]).toLowerCase();
                if (nt.indexOf(lastLower) !== -1) {
                    addLogMessage('findCandidateItem: fallback last name matched -> "' + getItemDisplayName(items[k]) + '"', 'log');
                    return items[k];
                }
            }
        }

        addLogMessage('findCandidateItem: no candidate matched with provided parts (first="' + parts.first + '" last="' + parts.last + '")', 'warn');
        return null;
    }

    function clickCheckboxForItem(li, displayTarget) {
        if (!li) {
            addLogMessage('clickCheckboxForItem: no list item provided', 'error');
            return false;
        }

        try {
            const checkbox = li.querySelector('[role="checkbox"]');
            if (!checkbox) {
                addLogMessage('clickCheckboxForItem: checkbox not found for "' + displayTarget + '"', 'error');
                return false;
            }

            const state = checkbox.getAttribute('aria-checked');
            addLogMessage('clickCheckboxForItem: current aria-checked="' + state + '" for "' + displayTarget + '"', 'log');

            if (state === 'false') {
                checkbox.click();
                addLogMessage('clickCheckboxForItem: checkbox clicked for "' + displayTarget + '"', 'log');
                return true;
            } else {
                addLogMessage('clickCheckboxForItem: already selected for "' + displayTarget + '"', 'warn');
                return true;
            }
        } catch (e) {
            addLogMessage('clickCheckboxForItem: error clicking checkbox for "' + displayTarget + '": ' + e, 'error');
            return false;
        }
    }

    function clickAddButtonIfEnabled() {
        try {
            const addBtn = document.querySelector('[data-test="add-button"]');
            if (!addBtn) {
                addLogMessage('clickAddButtonIfEnabled: Add button not found', 'warn');
                return false;
            }

            const disabledAttr = addBtn.getAttribute('disabled');
            if (disabledAttr === null) {
                addBtn.click();
                addLogMessage('clickAddButtonIfEnabled: Add button clicked', 'log');
                return true;
            } else {
                addLogMessage('clickAddButtonIfEnabled: Add button disabled', 'warn');
                return false;
            }
        } catch (e) {
            addLogMessage('clickAddButtonIfEnabled: error clicking Add button: ' + e, 'error');
            return false;
        }
    }
    function fuzzyMatch(name1, name2) {
        const n1 = name1.toLowerCase().replace(/\s+/g, '');
        const n2 = name2.toLowerCase().replace(/\s+/g, '');
        if (n1.includes(n2) || n2.includes(n1)) {
            addLogMessage('fuzzyMatch: substring match true ("' + n1 + '" vs "' + n2 + '")', 'log');
            return true;
        }
        const similarity = calculateSimilarity(n1, n2);
        const result = similarity > 0.7;
        addLogMessage('fuzzyMatch: similarity=' + similarity.toFixed(3) + ' threshold=0.7 result=' + result + ' ("' + n1 + '" vs "' + n2 + '")', 'log');
        return result;
    }

    function calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const editDistance = levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    function levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    function swapNameFormat(name) {
        if (name.includes(',')) {
            const parts = name.split(',').map(part => part.trim());
            const swapped = parts[1] + ' ' + parts[0];
            addLogMessage('swapNameFormat: input="' + name + '" swapped="' + swapped + '"', 'log');
            return swapped;
        } else {
            const parts = name.split(' ');
            if (parts.length >= 2) {
                const swapped = parts[parts.length - 1] + ', ' + parts.slice(0, -1).join(' ');
                addLogMessage('swapNameFormat: input="' + name + '" swapped="' + swapped + '"', 'log');
                return swapped;
            }
        }
        addLogMessage('swapNameFormat: input="' + name + '" unchanged', 'log');
        return name;
    }

    function showCompletionSummary(names, results) {
        const modal = document.getElementById('signatures-loading-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
        let successCount = 0;
        let duplicateCount = 0;
        let failureCount = 0;

        results.forEach(result => {
            if (result.statusType === 'success') {
                successCount++;
            } else if (result.statusType === 'duplicate') {
                duplicateCount++;
            } else if (result.statusType === 'failure') {
                failureCount++;
            }
        });

        const totalProcessed = names.length;

        const summaryModal = document.createElement('div');
        summaryModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 50000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 24px;
            width: 520px;
            max-width: 90%;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
            position: relative;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        `;

        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `display: flex; align-items: center; gap: 10px;`;

        const checkIcon = document.createElement('span');
        checkIcon.innerHTML = '✓';
        checkIcon.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: #6bcf7f;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Process Complete';
        title.style.cssText = `
            margin: 0;
            color: white;
            font-size: 18px;
            font-weight: 600;
        `;

        titleContainer.appendChild(checkIcon);
        titleContainer.appendChild(title);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;
        closeButton.onmouseover = () => closeButton.style.background = 'rgba(255, 67, 54, 0.8)';
        closeButton.onmouseout = () => closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        closeButton.onclick = () => document.body.removeChild(summaryModal);

        header.appendChild(titleContainer);
        header.appendChild(closeButton);

        const statsSection = document.createElement('div');
        statsSection.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
        `;

        const createStatBox = (label, value, bgColor) => {
            const box = document.createElement('div');
            box.style.cssText = `
                background: ${bgColor};
                border-radius: 8px;
                padding: 12px 8px;
                text-align: center;
            `;

            const valueEl = document.createElement('div');
            valueEl.textContent = value;
            valueEl.style.cssText = `
                font-size: 24px;
                font-weight: 700;
                color: white;
                line-height: 1;
            `;

            const labelEl = document.createElement('div');
            labelEl.textContent = label;
            labelEl.style.cssText = `
                font-size: 11px;
                color: rgba(255, 255, 255, 0.85);
                margin-top: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;

            box.appendChild(valueEl);
            box.appendChild(labelEl);
            return box;
        };

        statsSection.appendChild(createStatBox('Total', totalProcessed, 'rgba(255, 255, 255, 0.15)'));
        statsSection.appendChild(createStatBox('Success', successCount, 'rgba(107, 207, 127, 0.3)'));
        statsSection.appendChild(createStatBox('Duplicate', duplicateCount, 'rgba(255, 217, 61, 0.3)'));
        statsSection.appendChild(createStatBox('Failed', failureCount, 'rgba(255, 107, 107, 0.3)'));

        const listHeader = document.createElement('div');
        listHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        `;

        const listTitle = document.createElement('span');
        listTitle.textContent = 'Detailed Results';
        listTitle.style.cssText = `
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;

        listHeader.appendChild(listTitle);

        const resultsContainer = document.createElement('div');
        resultsContainer.style.cssText = `
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 8px;
            max-height: 250px;
            overflow-y: auto;
        `;

        const scrollStyle = document.createElement('style');
        scrollStyle.textContent = `
            .completion-results-list::-webkit-scrollbar {
                width: 6px;
            }
            .completion-results-list::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 3px;
            }
            .completion-results-list::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }
            .completion-results-list::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        `;
        document.head.appendChild(scrollStyle);
        resultsContainer.className = 'completion-results-list';

        results.forEach((result, index) => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                margin: 4px 0;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 6px;
                transition: background 0.2s ease;
            `;
            row.onmouseover = () => row.style.background = 'rgba(255, 255, 255, 0.12)';
            row.onmouseout = () => row.style.background = 'rgba(255, 255, 255, 0.08)';

            const nameSection = document.createElement('div');
            nameSection.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                min-width: 0;
            `;

            const indexBadge = document.createElement('span');
            indexBadge.textContent = index + 1;
            indexBadge.style.cssText = `
                background: rgba(255, 255, 255, 0.15);
                color: rgba(255, 255, 255, 0.7);
                font-size: 11px;
                font-weight: 600;
                min-width: 24px;
                height: 24px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const nameText = document.createElement('span');
            nameText.textContent = result.name;
            nameText.style.cssText = `
                color: white;
                font-size: 14px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;

            nameSection.appendChild(indexBadge);
            nameSection.appendChild(nameText);

            const statusBadge = document.createElement('span');
            statusBadge.textContent = result.status;

            let badgeColor, badgeBg;
            switch (result.statusType) {
                case 'success':
                    badgeColor = '#6bcf7f';
                    badgeBg = 'rgba(107, 207, 127, 0.2)';
                    break;
                case 'duplicate':
                    badgeColor = '#ffd93d';
                    badgeBg = 'rgba(255, 217, 61, 0.2)';
                    break;
                case 'failure':
                    badgeColor = '#ff6b6b';
                    badgeBg = 'rgba(255, 107, 107, 0.2)';
                    break;
                default:
                    badgeColor = 'rgba(255, 255, 255, 0.7)';
                    badgeBg = 'rgba(255, 255, 255, 0.1)';
            }

            statusBadge.style.cssText = `
                color: ${badgeColor};
                background: ${badgeBg};
                font-size: 12px;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: 12px;
                white-space: nowrap;
                flex-shrink: 0;
            `;

            row.appendChild(nameSection);
            row.appendChild(statusBadge);
            resultsContainer.appendChild(row);
        });

        const okButton = document.createElement('button');
        okButton.textContent = 'Close';
        okButton.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            margin-top: 16px;
            width: 100%;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        okButton.onmouseover = () => {
            okButton.style.background = 'rgba(255, 255, 255, 0.3)';
            okButton.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        };
        okButton.onmouseout = () => {
            okButton.style.background = 'rgba(255, 255, 255, 0.2)';
            okButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        };
        okButton.onclick = () => document.body.removeChild(summaryModal);

        container.appendChild(header);
        container.appendChild(statsSection);
        container.appendChild(listHeader);
        container.appendChild(resultsContainer);
        container.appendChild(okButton);
        summaryModal.appendChild(container);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        summaryModal.style.pointerEvents = 'none';
        container.style.pointerEvents = 'auto';
        makeDraggable(container, header);
        document.body.appendChild(summaryModal);

        addLogMessage('showCompletionSummary: displayed summary - Total: ' + totalProcessed + ', Success: ' + successCount + ', Duplicates: ' + duplicateCount + ', Failed: ' + failureCount, 'log');
    }

    function florenceRegisterNavListeners() {
        if (florenceNavListenersRegistered) {
            originalLog.call(console, '[Florence] florenceRegisterNavListeners: already registered, skipping');
            return;
        }
        florenceNavListenersRegistered = true;
        originalLog.call(console, '[Florence] florenceRegisterNavListeners: registering navigation and lifecycle listeners');

        var origPushState = history.pushState;
        history.pushState = function() {
            origPushState.apply(this, arguments);
            originalLog.call(console, '[Florence] navigation: pushState detected');
            florenceEnsureSingleInstance();
        };

        var origReplaceState = history.replaceState;
        history.replaceState = function() {
            origReplaceState.apply(this, arguments);
            originalLog.call(console, '[Florence] navigation: replaceState detected');
            florenceEnsureSingleInstance();
        };

        window.addEventListener('popstate', function() {
            originalLog.call(console, '[Florence] navigation: popstate detected');
            florenceEnsureSingleInstance();
        });

        window.addEventListener('hashchange', function() {
            originalLog.call(console, '[Florence] navigation: hashchange detected');
            florenceEnsureSingleInstance();
        });

        window.addEventListener('pageshow', function(e) {
            if (e.persisted) {
                originalLog.call(console, '[Florence] lifecycle: pageshow with bfcache restore detected');
                florenceCleanupExisting();
                guiVisible = localStorage.getItem('florence-gui-visible') === 'true';
                if (guiVisible) {
                    createGUI();
                    var gui = document.getElementById(FLORENCE_GUI_ID);
                    if (gui) {
                        gui.style.display = 'flex';
                    }
                }
                florenceWatchForReparent();
            } else {
                originalLog.call(console, '[Florence] lifecycle: pageshow (no bfcache)');
                florenceEnsureSingleInstance();
            }
        });

        window.addEventListener('beforeunload', function() {
            originalLog.call(console, '[Florence] lifecycle: beforeunload, running teardown');
            florenceTeardown();
        });

        originalLog.call(console, '[Florence] florenceRegisterNavListeners: all listeners registered');
    }

    function init() {
        if (window !== window.top) {
            originalLog.call(console, '[Florence] init: running inside iframe, aborting');
            return;
        }
        if (florenceInitialized) {
            originalLog.call(console, '[Florence] init: already initialized, running singleton check instead');
            florenceEnsureSingleInstance();
            return;
        }
        florenceInitialized = true;
        originalLog.call(console, '[Florence] init: initializing Florence Automator');

        florenceCleanupExisting();

        if (!florenceF2ListenerRegistered) {
            florenceF2ListenerRegistered = true;
            configInit();
            originalLog.call(console, '[Florence] init: configInit called, keybind listener registered');
        }

        florenceRegisterNavListeners();

        guiVisible = localStorage.getItem('florence-gui-visible') === 'true';
        if (guiVisible) {
            originalLog.call(console, '[Florence] init: guiVisible=true from localStorage, creating GUI');
            createGUI();
            var gui = document.getElementById(FLORENCE_GUI_ID);
            if (gui) {
                gui.style.display = 'flex';
            }
        }

        florenceWatchForReparent();

        originalLog.call(console, '[Florence] init: Florence Automator loaded. Press ' + cfgState.currentLabel + ' to toggle GUI.');
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
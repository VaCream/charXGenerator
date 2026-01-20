/**
 * CharX Generator - Main Application
 * 메인 진입점 및 UI 이벤트 핸들링
 */

import { CharacterData, Asset, LorebookEntry, CharacterBook } from './modules/schema.js';
import { CharXBuilder } from './modules/builder.js';
import { GeminiClient, initClient, getClient } from './modules/gemini-client.js';
import { initRPack, createRisumBuffer, isInitialized as isRPackInitialized } from './modules/risum.js';
import {
    resizeImage, fileToUint8Array, createThumbnail,
    getImageExtension, getFileBasename, getFileExtension
} from './modules/image-utils.js';
import { getPresetNames, getSheetPreview, getSheetTemplate } from './modules/character-sheets.js';
import {
    getCharacterInfoSystem, CHARACTER_INFO_USER_TEMPLATE,
    LOREBOOK_SYSTEM_SINGLE, LOREBOOK_SYSTEM_BATCH, LOREBOOK_USER_TEMPLATE, LOREBOOK_USER_TEMPLATE_ALWAYS_ACTIVE, LOREBOOK_USER_TEMPLATE_BATCH,
    STATUS_WINDOW_SYSTEM, STATUS_WINDOW_USER_TEMPLATE,
    IMAGE_ASSET_CSS,
    IMAGE_ASSET_SYSTEM, IMAGE_ASSET_USER_TEMPLATE,
    TRANSLATE_SYSTEM, TRANSLATE_USER_TEMPLATE,
    generateImageInstruction
} from './modules/prompts.js';
import { createAssetRegexList } from './modules/regex-templates.js';

// =============================================================================
// 앱 상태
// =============================================================================

const appState = {
    // 탭별 저장 상태
    characterInfo: { saved: false, name: '', description: '', originalText: '', translatedText: '' },
    firstMessage: { saved: false, messages: [''], currentIndex: 0 },
    lorebook: { saved: false, sourceEntries: [], resultEntries: [] },
    statusWindow: { saved: false, instruction: '', regexIn: '', regexStyle: '', regexHtml: '', sample: '' },
    image: { saved: false, iconFile: null, assetFiles: [], renamedFiles: [], tags: [], charName: '', instruction: '' },

    // 설정
    settings: {
        apiKey: localStorage.getItem('gemini_api_key') || '',
        model: localStorage.getItem('gemini_model') || 'gemini-2.5-flash',
        temperature: localStorage.getItem('gemini_temperature') !== null
            ? parseFloat(localStorage.getItem('gemini_temperature'))
            : (localStorage.getItem('gemini_model')?.startsWith('gemini-3') ? 1.0 : 0.7),
        guideEnabled: localStorage.getItem('guide_enabled') !== 'false'  // 기본값 true
    },

    // 가이드 상태 (연결 테스트 성공 여부)
    guideState: {
        apiTestSuccess: false
    }
};

// =============================================================================
// 초기화
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initCharacterInfoTab();
    initFirstMessageTab();
    initLorebookTab();
    initStatusWindowTab();
    initImageTab();
    initSettings();
    initBottomButtons();
    initModals();
    initTooltips();
    initGuideSystem();

    // WASM 초기화 (비동기)
    try {
        await initRPack('wasm/rpack_bg.wasm');
        console.log('RPack WASM loaded');
    } catch (e) {
        console.warn('Failed to load RPack WASM:', e);
    }
});

// =============================================================================
// 툴팁 초기화 - title 속성을 data-tooltip으로 변환
// =============================================================================

function initTooltips() {
    document.querySelectorAll('[title]').forEach(el => {
        const title = el.getAttribute('title');
        if (title) {
            el.setAttribute('data-tooltip', title);
            el.removeAttribute('title');
        }
    });
}

// =============================================================================
// 탭 네비게이션
// =============================================================================

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // 버튼 활성화
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 패널 활성화
            tabPanels.forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tabId}`).classList.add('active');
        });
    });
}

function updateTabStatus(tabId, saved) {
    // 상태 아이콘 업데이트
    const status = document.getElementById(`status-${tabId}`);
    if (status) {
        status.className = `tab-status ${saved ? 'saved' : ''}`;
    }

    // 탭 버튼 테두리 업데이트
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (tabBtn) {
        if (saved) {
            tabBtn.classList.add('saved');
        } else {
            tabBtn.classList.remove('saved');
        }
    }

    // appState 업데이트
    const stateMap = {
        'character-info': 'characterInfo',
        'first-message': 'firstMessage',
        'lorebook': 'lorebook',
        'status-window': 'statusWindow',
        'image': 'image'
    };
    const stateKey = stateMap[tabId];
    if (stateKey && appState[stateKey]) {
        appState[stateKey].saved = saved;
    }
}

// =============================================================================
// 버튼 로딩 상태 헬퍼
// =============================================================================

/**
 * 버튼 로딩 상태 설정
 * @param {HTMLElement} btn - 버튼 요소
 * @param {boolean} isLoading - 로딩 상태
 * @param {string} originalText - 원래 버튼 텍스트 (로딩 해제 시 복원용)
 */
function setButtonLoading(btn, isLoading, originalText = null) {
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.dataset.originalText = btn.textContent;
        btn.textContent = '⏳ 처리중...';
    } else {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText || btn.dataset.originalText || btn.textContent;
    }
}

/**
 * 결과 영역에 스피너 오버레이 표시
 * @param {HTMLElement} container - 스피너를 표시할 컨테이너
 * @param {string} text - 로딩 메시지
 */
function showSpinner(container, text = 'LLM 요청 중...') {
    // 기존 스피너 제거
    hideSpinner(container);

    // 컨테이너에 position relative 추가
    container.classList.add('result-container');

    const overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';
    overlay.innerHTML = `
        <div class="spinner"></div>
        <div class="spinner-text">${text}</div>
    `;
    container.appendChild(overlay);
}

/**
 * 결과 영역의 스피너 제거
 * @param {HTMLElement} container - 스피너를 제거할 컨테이너
 */
function hideSpinner(container) {
    const overlay = container.querySelector('.spinner-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * 결과 영역에 에러 오버레이 표시
 * @param {HTMLElement} container - 에러를 표시할 컨테이너
 * @param {string} title - 에러 제목
 * @param {string} message - 에러 메시지
 * @param {string} hint - 추가 힌트 (선택)
 */
function showError(container, title, message, hint = '') {
    // 기존 오버레이 제거
    hideSpinner(container);
    hideError(container);

    // 컨테이너에 position relative 추가
    container.classList.add('result-container');

    const overlay = document.createElement('div');
    overlay.className = 'error-overlay';
    overlay.innerHTML = `
        <div class="error-icon">😢</div>
        <div class="error-title">${title}</div>
        <div class="error-message">${message}</div>
        ${hint ? `<div class="error-hint">${hint}</div>` : ''}
    `;
    container.appendChild(overlay);
}

/**
 * 결과 영역의 에러 오버레이 제거
 * @param {HTMLElement} container - 에러를 제거할 컨테이너
 */
function hideError(container) {
    const overlay = container.querySelector('.error-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// =============================================================================
// 캐릭터 정보 탭
// =============================================================================

function initCharacterInfoTab() {
    const sheetSelect = document.getElementById('sheet-select');
    const presets = getPresetNames();

    // 시트 프리셋 옵션 추가
    presets.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        sheetSelect.appendChild(option);
    });

    // 시트 선택 변경 시 미리보기
    sheetSelect.addEventListener('change', () => {
        const preview = getSheetPreview(sheetSelect.value);
        document.getElementById('result-text').value = `[시트 미리보기] - ${sheetSelect.value}\n\n${preview}`;
    });

    // 초기 미리보기
    const preview = getSheetPreview(presets[0]);
    document.getElementById('result-text').value = `[시트 미리보기] - ${presets[0]}\n\n${preview}`;

    // 디스크립션 생성 버튼
    document.getElementById('btn-generate-desc').addEventListener('click', generateDescription);

    // 번역 버튼
    document.getElementById('btn-translate').addEventListener('click', translateDescription);

    // 복사 버튼
    document.getElementById('btn-copy-desc').addEventListener('click', () => {
        const text = document.getElementById('result-text').value;
        navigator.clipboard.writeText(text);
        showToast('클립보드에 복사되었습니다.');
    });

    // 저장 버튼
    document.getElementById('btn-save-char').addEventListener('click', saveCharacterInfo);
}

async function generateDescription() {
    const client = getClient();
    if (!client) {
        showToast('설정에서 API 키를 먼저 입력해주세요.', 'error');
        return;
    }

    const source = document.getElementById('source-text').value.trim();
    if (!source) {
        showToast('원본 데이터를 입력해주세요.', 'error');
        return;
    }

    const charName = document.getElementById('char-name').value.trim();
    const sheetName = document.getElementById('sheet-select').value;
    const resultText = document.getElementById('result-text');
    const generateBtn = document.getElementById('btn-generate-desc');

    // 로딩 표시
    setButtonLoading(generateBtn, true);
    const resultWrapper = document.getElementById('desc-result-wrapper');
    showSpinner(resultWrapper, '디스크립션 생성 중...');
    resultText.value = '';

    try {
        const systemPrompt = getCharacterInfoSystem(sheetName);
        const fullContent = charName ? `Character Name: ${charName}\n\n${source}` : source;
        const userPrompt = CHARACTER_INFO_USER_TEMPLATE.replace('{content}', fullContent);

        const result = await client.generate(userPrompt, { systemInstruction: systemPrompt, temperature: appState.settings.temperature });

        if (result.success) {
            // <description> 태그 추출 (마지막 매칭 사용 - greedy 패턴)
            const descriptionMatch = result.text.match(/[\s\S]*<description>([\s\S]*?)<\/description>/);
            let finalText = result.text;
            let displayText = result.text;

            if (descriptionMatch) {
                const extracted = descriptionMatch[1].trim();
                finalText = extracted;
                displayText = extracted;
            }

            resultText.value = displayText;
            appState.characterInfo.originalText = finalText;  // 태그 없이 저장
            appState.characterInfo.description = displayText;
            appState.characterInfo.translatedText = '';

            showToast('디스크립션이 생성되었습니다!');
            hideSpinner(resultWrapper);
            updateGuideHighlights();
        } else {
            showError(
                resultWrapper,
                '생성 실패',
                result.error,
                '다시 시도해주세요.'
            );
        }
    } catch (e) {
        showError(
            resultWrapper,
            '오류 발생',
            e.message,
            '네트워크 연결을 확인해주세요.'
        );
    } finally {
        setButtonLoading(generateBtn, false, '디스크립션 생성 →');
        hideSpinner(resultWrapper);
    }
}

async function translateDescription() {
    const client = getClient();
    if (!client) {
        showToast('설정에서 API 키를 먼저 입력해주세요.', 'error');
        return;
    }

    const originalText = appState.characterInfo.originalText;
    if (!originalText) {
        showToast('먼저 디스크립션을 생성해주세요.', 'error');
        return;
    }

    // 토글 (이미 번역이 있다면)
    if (appState.characterInfo.translatedText) {
        const resultText = document.getElementById('result-text');
        if (resultText.value === appState.characterInfo.translatedText) {
            resultText.value = originalText;
            document.getElementById('btn-translate').textContent = '번역 보기';
            document.getElementById('char-translate-status').textContent = '[원문]';
        } else {
            resultText.value = appState.characterInfo.translatedText;
            document.getElementById('btn-translate').textContent = '원문 보기';
            document.getElementById('char-translate-status').textContent = '[번역본]';
        }
        return;
    }

    // 번역 요청
    document.getElementById('char-translate-status').textContent = '번역 중...';

    try {
        const userPrompt = TRANSLATE_USER_TEMPLATE.replace('{content}', originalText);
        const result = await client.generate(userPrompt, {
            systemInstruction: TRANSLATE_SYSTEM,
            temperature: 0.3
        });

        if (result.success) {
            appState.characterInfo.translatedText = result.text;
            document.getElementById('result-text').value = result.text;
            document.getElementById('btn-translate').textContent = '원문 보기';
            document.getElementById('char-translate-status').textContent = '[번역본]';
            showToast('번역이 완료되었습니다!');
        } else {
            showToast(result.error, 'error');
            document.getElementById('char-translate-status').textContent = '';
        }
    } catch (e) {
        showToast(e.message, 'error');
        document.getElementById('char-translate-status').textContent = '';
    }
}

function saveCharacterInfo() {
    const name = document.getElementById('char-name').value.trim();
    const displayText = document.getElementById('result-text').value.trim();

    if (!name) {
        showToast('캐릭터 이름을 입력해주세요.', 'error');
        return;
    }

    if (!displayText || displayText.startsWith('[시트 미리보기]')) {
        showToast('먼저 디스크립션을 생성해주세요.', 'error');
        return;
    }

    appState.characterInfo.name = name;
    // 번역 상태와 관계없이 항상 원문(originalText)을 저장
    // originalText가 없으면 현재 화면 텍스트를 사용
    appState.characterInfo.description = appState.characterInfo.originalText || displayText;
    appState.characterInfo.saved = true;

    document.getElementById('char-save-status').textContent = `✓ 저장됨: ${name}`;
    document.getElementById('char-save-status').classList.add('saved');
    updateTabStatus('character-info', true);

    showToast('캐릭터 정보가 저장되었습니다.');
    updateGuideHighlights();
}

// =============================================================================
// 퍼스트 메시지 탭
// =============================================================================

function initFirstMessageTab() {
    refreshMessageButtons();

    document.getElementById('btn-add-message').addEventListener('click', addMessage);
    document.getElementById('btn-delete-message').addEventListener('click', deleteMessage);
    document.getElementById('btn-copy-message').addEventListener('click', () => {
        const text = document.getElementById('first-message-text').value;
        navigator.clipboard.writeText(text);
        showToast('클립보드에 복사되었습니다.');
    });
    document.getElementById('btn-save-message').addEventListener('click', saveFirstMessage);

    // 텍스트 변경 시 자동 저장
    document.getElementById('first-message-text').addEventListener('blur', () => {
        const idx = appState.firstMessage.currentIndex;
        appState.firstMessage.messages[idx] = document.getElementById('first-message-text').value;
    });
}

function refreshMessageButtons() {
    const container = document.getElementById('message-buttons');
    container.innerHTML = '';

    appState.firstMessage.messages.forEach((_, idx) => {
        const btn = document.createElement('button');
        btn.className = `message-btn ${idx === appState.firstMessage.currentIndex ? 'active' : ''}`;
        btn.textContent = idx + 1;
        btn.addEventListener('click', () => selectMessage(idx));
        container.appendChild(btn);
    });

    document.getElementById('current-message-num').textContent = appState.firstMessage.currentIndex + 1;
}

function selectMessage(idx) {
    // 현재 메시지 저장
    const currentIdx = appState.firstMessage.currentIndex;
    appState.firstMessage.messages[currentIdx] = document.getElementById('first-message-text').value;

    // 새 메시지 선택
    appState.firstMessage.currentIndex = idx;
    document.getElementById('first-message-text').value = appState.firstMessage.messages[idx] || '';

    refreshMessageButtons();
}

function addMessage() {
    // 현재 메시지 저장
    const currentIdx = appState.firstMessage.currentIndex;
    appState.firstMessage.messages[currentIdx] = document.getElementById('first-message-text').value;

    // 새 메시지 추가
    appState.firstMessage.messages.push('');
    appState.firstMessage.currentIndex = appState.firstMessage.messages.length - 1;
    document.getElementById('first-message-text').value = '';

    refreshMessageButtons();
}

function deleteMessage() {
    if (appState.firstMessage.messages.length <= 1) {
        showToast('최소 1개의 메시지가 필요합니다.', 'error');
        return;
    }

    const idx = appState.firstMessage.currentIndex;
    appState.firstMessage.messages.splice(idx, 1);

    if (idx >= appState.firstMessage.messages.length) {
        appState.firstMessage.currentIndex = appState.firstMessage.messages.length - 1;
    }

    document.getElementById('first-message-text').value =
        appState.firstMessage.messages[appState.firstMessage.currentIndex] || '';

    refreshMessageButtons();
}

function saveFirstMessage() {
    // 현재 메시지 저장
    const idx = appState.firstMessage.currentIndex;
    appState.firstMessage.messages[idx] = document.getElementById('first-message-text').value;

    const firstMsg = appState.firstMessage.messages[0] || '';
    if (!firstMsg.trim()) {
        showToast('첫 번째 메시지를 입력해주세요.', 'error');
        return;
    }

    appState.firstMessage.saved = true;

    const count = appState.firstMessage.messages.filter(m => m.trim()).length;
    document.getElementById('fm-save-status').textContent = `✓ 저장됨 (${count}개)`;
    document.getElementById('fm-save-status').classList.add('saved');
    updateTabStatus('first-message', true);

    showToast('퍼스트 메시지가 저장되었습니다.');
    updateGuideHighlights();
}

// =============================================================================
// 로어북 탭 (간략화)
// =============================================================================

function initLorebookTab() {
    document.getElementById('btn-add-lore').addEventListener('click', addLoreEntry);
    document.getElementById('btn-convert-lore').addEventListener('click', convertLorebook);
    document.getElementById('btn-save-lore').addEventListener('click', saveLorebook);

    // 빈 엔트리 하나 추가
    addLoreEntry();
}

function addLoreEntry() {
    const container = document.getElementById('source-lore-entries');
    const idx = appState.lorebook.sourceEntries.length;

    // 모듈 형식으로 저장
    appState.lorebook.sourceEntries.push({
        key: '',
        secondkey: '',
        insertorder: 100,
        comment: '',
        content: '',
        mode: 'normal',
        alwaysActive: false,
        selective: false,
        extentions: { risu_case_sensitive: false, risu_loreCache: null },
        loreCache: null,
        useRegex: false,
        bookVersion: 2
    });

    const entry = createLoreEntryElement(idx, true);
    container.appendChild(entry);
}

function createLoreEntryElement(idx, isSource) {
    const data = isSource ? appState.lorebook.sourceEntries[idx] : appState.lorebook.resultEntries[idx];

    const div = document.createElement('div');
    div.className = 'lore-entry';
    div.dataset.index = idx;

    div.innerHTML = `
        <div class="lore-entry-header">
            <div class="lore-entry-title">
                <input type="text" placeholder="로어북 제목" value="${data.comment || ''}" data-field="comment">
            </div>
            <button class="btn btn-icon btn-sm btn-delete" title="삭제">&times;</button>
        </div>
        <div class="lore-entry-keywords">
            <input type="text" placeholder="활성화 키워드 (쉼표로 구분)" value="${data.key || ''}" data-field="key">
        </div>
        <div class="lore-entry-content">
            <textarea placeholder="로어북 내용" data-field="content">${data.content || ''}</textarea>
        </div>
        <div class="lore-entry-footer">
            <label>
                <input type="checkbox" data-field="alwaysActive" ${data.alwaysActive ? 'checked' : ''}>
                상시 활성화
            </label>
            <span class="lore-entry-status"></span>
            ${isSource ? '<button class="btn btn-primary btn-sm btn-convert-single">✨ 이 로어북만 변환</button>' : ''}
        </div>
    `;

    // 삭제 버튼 이벤트
    div.querySelector('.btn-delete').addEventListener('click', () => {
        if (isSource) {
            appState.lorebook.sourceEntries.splice(idx, 1);
        } else {
            appState.lorebook.resultEntries.splice(idx, 1);
        }
        div.remove();
        updateGuideHighlights();
    });

    // 개별 변환 버튼 이벤트 (소스 엔트리만)
    if (isSource) {
        div.querySelector('.btn-convert-single').addEventListener('click', () => convertSingleLoreEntry(idx, div));
    }

    div.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('change', () => {
            const field = el.dataset.field;
            const value = field === 'alwaysActive' ? el.checked : el.value;
            if (isSource) {
                appState.lorebook.sourceEntries[idx][field] = value;
            } else {
                appState.lorebook.resultEntries[idx][field] = value;
            }
        });
        // 가이드 하이라이트 업데이트를 위한 input 이벤트
        el.addEventListener('input', updateGuideHighlights);
    });

    return div;
}

async function convertLorebook() {
    const client = getClient();
    if (!client) {
        showToast('설정에서 API 키를 먼저 입력해주세요.', 'error');
        return;
    }

    // 소스 데이터 동기화
    syncLoreEntries(true);

    const validEntries = appState.lorebook.sourceEntries.filter(e => e.content.trim());
    if (validEntries.length === 0) {
        showToast('변환할 로어북 엔트리가 없습니다.', 'error');
        return;
    }

    const convertBtn = document.getElementById('btn-convert-lore');
    setButtonLoading(convertBtn, true);
    const loreResultWrapper = document.getElementById('lore-result-wrapper');
    showSpinner(loreResultWrapper, `로어북 ${validEntries.length}개 변환 중...`);

    const resultContainer = document.getElementById('result-lore-entries');
    resultContainer.innerHTML = '';
    appState.lorebook.resultEntries = [];

    const charSheet = appState.characterInfo.description || '';

    try {
        // 배치 입력 생성
        const lorebookEntries = validEntries.map((entry, idx) => {
            const keywordsTag = entry.alwaysActive
                ? ''
                : `<lore_keywords>${entry.key}</lore_keywords>\n`;

            return `<lorebook index="${idx + 1}">
<lore_title>${entry.comment}</lore_title>
${keywordsTag}<lore_content>
${entry.content}
</lore_content>
</lorebook>`;
        }).join('\n\n');

        const userPrompt = LOREBOOK_USER_TEMPLATE_BATCH
            .replace('{characterSheet}', charSheet)
            .replace('{lorebookEntries}', lorebookEntries);

        const result = await client.generate(userPrompt, {
            systemInstruction: LOREBOOK_SYSTEM_BATCH,
            maxTokens: 8192,
            temperature: appState.settings.temperature
        });

        if (result.success) {
            // 각 엔트리 파싱
            const entryPattern = /<lorebook_entry index="(\d+)">([\s\S]*?)<\/lorebook_entry>/g;
            let match;
            const parsedEntries = {};

            while ((match = entryPattern.exec(result.text)) !== null) {
                const index = parseInt(match[1]) - 1;
                const entryText = match[2];

                const titleMatch = entryText.match(/<result_title>([\s\S]*?)<\/result_title>/);
                const keywordsMatch = entryText.match(/<result_keywords>([\s\S]*?)<\/result_keywords>/);
                const contentMatch = entryText.match(/<lorebook_result>([\s\S]*?)<\/lorebook_result>/);

                // 모듈 형식으로 저장
                const sourceEntry = validEntries[index] || {};
                parsedEntries[index] = {
                    key: keywordsMatch ? keywordsMatch[1].trim() : sourceEntry.key || '',
                    secondkey: '',
                    insertorder: 100,
                    comment: titleMatch ? titleMatch[1].trim() : sourceEntry.comment || '',
                    content: contentMatch ? contentMatch[1].trim() : '',
                    mode: sourceEntry.alwaysActive ? 'constant' : 'normal',
                    alwaysActive: sourceEntry.alwaysActive || false,
                    selective: false,
                    extentions: { risu_case_sensitive: false, risu_loreCache: null },
                    loreCache: null,
                    useRegex: false,
                    bookVersion: 2
                };
            }

            // 결과가 없으면 단일 형식으로 시도 (하나만 있는 경우)
            if (Object.keys(parsedEntries).length === 0 && validEntries.length === 1) {
                const titleMatch = result.text.match(/<result_title>([\s\S]*?)<\/result_title>/);
                const keywordsMatch = result.text.match(/<result_keywords>([\s\S]*?)<\/result_keywords>/);
                const contentMatch = result.text.match(/<lorebook_result>([\s\S]*?)<\/lorebook_result>/);

                // 모듈 형식으로 저장
                const sourceEntry = validEntries[0];
                parsedEntries[0] = {
                    key: keywordsMatch ? keywordsMatch[1].trim() : sourceEntry.key || '',
                    secondkey: '',
                    insertorder: 100,
                    comment: titleMatch ? titleMatch[1].trim() : sourceEntry.comment || '',
                    content: contentMatch ? contentMatch[1].trim() : result.text,
                    mode: sourceEntry.alwaysActive ? 'constant' : 'normal',
                    alwaysActive: sourceEntry.alwaysActive || false,
                    selective: false,
                    extentions: { risu_case_sensitive: false, risu_loreCache: null },
                    loreCache: null,
                    useRegex: false,
                    bookVersion: 2
                };
            }

            // 순서대로 결과 추가
            for (let i = 0; i < validEntries.length; i++) {
                if (parsedEntries[i]) {
                    appState.lorebook.resultEntries.push(parsedEntries[i]);
                    resultContainer.appendChild(createLoreEntryElement(appState.lorebook.resultEntries.length - 1, false));
                }
            }

            hideSpinner(loreResultWrapper);
            showToast('로어북 변환이 완료되었습니다!');
            updateGuideHighlights();
        } else {
            showError(
                loreResultWrapper,
                '변환 실패',
                result.error,
                '다시 시도해주세요.'
            );
        }
    } catch (e) {
        console.error('Lorebook batch conversion error:', e);
        showError(
            loreResultWrapper,
            '오류 발생',
            e.message,
            '네트워크 연결을 확인해주세요.'
        );
    } finally {
        setButtonLoading(convertBtn, false, '✨ 전체 변환');
    }
}

// 개별 로어북 엔트리 변환
async function convertSingleLoreEntry(idx, entryDiv) {
    const client = getClient();
    if (!client) {
        showToast('설정에서 API 키를 먼저 입력해주세요.', 'error');
        return;
    }

    // 현재 엔트리 데이터 동기화
    const entry = appState.lorebook.sourceEntries[idx];
    entry.comment = entryDiv.querySelector('[data-field="comment"]').value;
    entry.key = entryDiv.querySelector('[data-field="key"]').value;
    entry.content = entryDiv.querySelector('[data-field="content"]').value;
    entry.alwaysActive = entryDiv.querySelector('[data-field="alwaysActive"]').checked;
    entry.mode = entry.alwaysActive ? 'constant' : 'normal';

    if (!entry.content.trim()) {
        showToast('내용을 입력해주세요.', 'error');
        return;
    }

    const convertBtn = entryDiv.querySelector('.btn-convert-single');
    const statusSpan = entryDiv.querySelector('.lore-entry-status');
    convertBtn.disabled = true;
    convertBtn.textContent = '...';
    statusSpan.textContent = '변환 중...';

    const charSheet = appState.characterInfo.description || '';

    try {
        const template = entry.alwaysActive
            ? LOREBOOK_USER_TEMPLATE_ALWAYS_ACTIVE
            : LOREBOOK_USER_TEMPLATE;

        const userPrompt = template
            .replace('{characterSheet}', charSheet)
            .replace('{title}', entry.comment)
            .replace('{keywords}', entry.key)
            .replace('{content}', entry.content);

        const result = await client.generate(userPrompt, { systemInstruction: LOREBOOK_SYSTEM_SINGLE, temperature: appState.settings.temperature });

        if (result.success) {
            const titleMatch = result.text.match(/<result_title>([\s\S]*?)<\/result_title>/);
            const keywordsMatch = result.text.match(/<result_keywords>([\s\S]*?)<\/result_keywords>/);
            const contentMatch = result.text.match(/<lorebook_result>([\s\S]*?)<\/lorebook_result>/);

            // 모듈 형식으로 저장
            const newEntry = {
                key: keywordsMatch ? keywordsMatch[1].trim() : entry.key,
                secondkey: '',
                insertorder: 100,
                comment: titleMatch ? titleMatch[1].trim() : entry.comment,
                content: contentMatch ? contentMatch[1].trim() : result.text,
                mode: entry.alwaysActive ? 'constant' : 'normal',
                alwaysActive: entry.alwaysActive,
                selective: false,
                extentions: { risu_case_sensitive: false, risu_loreCache: null },
                loreCache: null,
                useRegex: false,
                bookVersion: 2
            };

            appState.lorebook.resultEntries.push(newEntry);
            const resultContainer = document.getElementById('result-lore-entries');
            resultContainer.appendChild(createLoreEntryElement(appState.lorebook.resultEntries.length - 1, false));

            statusSpan.textContent = '';
            showToast(`"${newEntry.title}" 변환 완료`);
        } else {
            statusSpan.textContent = '✗ 실패';
            showToast(result.error, 'error');
        }
    } catch (e) {
        statusSpan.textContent = '✗ 오류';
        showToast(e.message, 'error');
    } finally {
        convertBtn.disabled = false;
        convertBtn.textContent = '✨ 이 로어북만 변환';
    }
}

function syncLoreEntries(isSource) {
    const container = document.getElementById(isSource ? 'source-lore-entries' : 'result-lore-entries');
    const entries = isSource ? appState.lorebook.sourceEntries : appState.lorebook.resultEntries;

    container.querySelectorAll('.lore-entry').forEach((el, idx) => {
        if (entries[idx]) {
            entries[idx].comment = el.querySelector('[data-field="comment"]').value;
            entries[idx].key = el.querySelector('[data-field="key"]').value;
            entries[idx].content = el.querySelector('[data-field="content"]').value;
            entries[idx].alwaysActive = el.querySelector('[data-field="alwaysActive"]').checked;
            entries[idx].mode = entries[idx].alwaysActive ? 'constant' : 'normal';
        }
    });
}

function saveLorebook() {
    syncLoreEntries(false);

    const entries = appState.lorebook.resultEntries.filter(e => e.content.trim());
    if (entries.length === 0) {
        showToast('저장할 로어북이 없습니다.', 'error');
        return;
    }

    appState.lorebook.saved = true;

    document.getElementById('lore-save-status').textContent = `✓ 저장됨 (${entries.length}개)`;
    document.getElementById('lore-save-status').classList.add('saved');
    updateTabStatus('lorebook', true);

    showToast('로어북이 저장되었습니다.');
    updateGuideHighlights();
}

// =============================================================================
// 상태창 탭
// =============================================================================

function initStatusWindowTab() {
    document.getElementById('btn-generate-status').addEventListener('click', generateStatusWindow);
    document.getElementById('btn-preview-status').addEventListener('click', previewStatusWindow);
    document.getElementById('btn-save-status').addEventListener('click', saveStatusWindow);

    // 복사 버튼들
    ['instruction', 'regex-in', 'style', 'html'].forEach(id => {
        const btn = document.getElementById(`btn-copy-${id}`);
        if (btn) {
            btn.addEventListener('click', () => {
                const text = document.getElementById(`status-${id}`).value;
                navigator.clipboard.writeText(text);
                showToast('클립보드에 복사되었습니다.');
            });
        }
    });
}

async function generateStatusWindow() {
    const client = getClient();
    if (!client) {
        showToast('설정에서 API 키를 먼저 입력해주세요.', 'error');
        return;
    }

    const source = document.getElementById('status-source').value.trim();
    if (!source) {
        showToast('상태창 요구사항을 입력해주세요.', 'error');
        return;
    }

    const generateBtn = document.getElementById('btn-generate-status');
    setButtonLoading(generateBtn, true);
    const statusResultWrapper = document.getElementById('status-result-wrapper');
    showSpinner(statusResultWrapper, '상태창 생성 중...');

    const charSheet = appState.characterInfo.description || '';
    const userPrompt = STATUS_WINDOW_USER_TEMPLATE
        .replace('{content}', source)
        .replace('{characterSheet}', charSheet);

    try {
        const result = await client.generate(userPrompt, {
            systemInstruction: STATUS_WINDOW_SYSTEM,
            maxTokens: 8192,
            temperature: appState.settings.temperature
        });

        if (result.success) {
            // 마지막 매칭을 추출하는 헬퍼 함수 (프롬프트 예시와 구분하기 위함)
            const getLastMatch = (text, tagName) => {
                // [\s\S]* (greedy)로 마지막 태그까지 이동 후 캐처
                const pattern = new RegExp(`[\\s\\S]*<${tagName}>([\\s\\S]*?)</${tagName}>`);
                return text.match(pattern);
            };

            // 태그에서 추출 (마지막 매칭 사용)
            const instructionMatch = getLastMatch(result.text, 'status_instruction');
            const sampleMatch = getLastMatch(result.text, 'status_sample');
            const regexInMatch = getLastMatch(result.text, 'regex_in');
            const regexStyleMatch = getLastMatch(result.text, 'regex_style');
            const regexHtmlMatch = getLastMatch(result.text, 'regex_html');

            // 필수 태그 검증
            const missingTags = [];
            if (!regexInMatch) missingTags.push('정규식 IN');
            if (!regexStyleMatch) missingTags.push('CSS 스타일');
            if (!regexHtmlMatch) missingTags.push('HTML 템플릿');

            if (missingTags.length > 0) {
                // 필수 태그 누락 - 에러 표시
                showError(
                    statusResultWrapper,
                    '생성 실패',
                    `필수 요소가 누락되었습니다: ${missingTags.join(', ')}`,
                    '다시 생성 버튼을 눌러주세요.'
                );
                setButtonLoading(generateBtn, false, '상태창 생성 →');
                return;
            }

            // 기존 에러 제거
            hideError(statusResultWrapper);

            document.getElementById('status-instruction').value = instructionMatch ? instructionMatch[1].trim() : '';
            document.getElementById('status-regex-in').value = regexInMatch[1].trim();

            // CSS 스타일에 스타일 태그가 없으면 추가
            let cssStyle = regexStyleMatch[1].trim();
            cssStyle = ensureStyleTags(cssStyle);
            document.getElementById('status-style').value = cssStyle;

            document.getElementById('status-html').value = regexHtmlMatch[1].trim();

            appState.statusWindow.sample = sampleMatch ? sampleMatch[1].trim() : '';

            hideSpinner(statusResultWrapper);
            showToast('상태창이 생성되었습니다!');
            updateGuideHighlights();
        } else {
            // API 에러
            showError(
                statusResultWrapper,
                'API 오류',
                result.error,
                '잠시 후 다시 시도해주세요.'
            );
        }
    } catch (e) {
        showError(
            statusResultWrapper,
            '오류 발생',
            e.message,
            '네트워크 연결을 확인하고 다시 시도해주세요.'
        );
    } finally {
        setButtonLoading(generateBtn, false, '상태창 생성 →');
        hideSpinner(statusResultWrapper);
    }
}

function previewStatusWindow() {
    const style = document.getElementById('status-style').value;
    const html = document.getElementById('status-html').value;
    const regexIn = document.getElementById('status-regex-in').value;
    const sample = appState.statusWindow.sample || 'status[hp:85|mp:60]';

    if (!html) {
        showToast('먼저 상태창을 생성해주세요.', 'error');
        return;
    }

    // 샘플 데이터로 HTML 렌더링
    let rendered = html;
    try {
        const regex = new RegExp(regexIn);
        const match = sample.match(regex);
        if (match) {
            for (let i = 1; i < match.length; i++) {
                rendered = rendered.replace(new RegExp(`\\$${i}`, 'g'), match[i]);
            }
        }
    } catch (e) {
        console.error('Regex error:', e);
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
${style}
</head>
<body style="background: #1a1a2e; padding: 20px;">
${rendered}
</body>
</html>`;

    // 인라인 미리보기 프레임에 렌더링
    const previewFrame = document.getElementById('preview-frame-inline');
    previewFrame.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.srcdoc = fullHtml;
    previewFrame.appendChild(iframe);

    showToast('미리보기가 업데이트되었습니다.');
}

function saveStatusWindow() {
    const instruction = document.getElementById('status-instruction').value;
    const regexIn = document.getElementById('status-regex-in').value;
    const regexStyle = document.getElementById('status-style').value;
    const regexHtml = document.getElementById('status-html').value;

    if (!instruction || !regexIn) {
        showToast('상태창 데이터가 없습니다.', 'error');
        return;
    }

    appState.statusWindow.instruction = instruction;
    appState.statusWindow.regexIn = regexIn;
    appState.statusWindow.regexStyle = regexStyle;
    appState.statusWindow.regexHtml = regexHtml;
    appState.statusWindow.saved = true;

    document.getElementById('status-save-status').textContent = '✓ 저장됨';
    document.getElementById('status-save-status').classList.add('saved');
    updateTabStatus('status-window', true);

    showToast('상태창이 저장되었습니다.');
    updateGuideHighlights();
}

// =============================================================================
// 이미지 탭
// =============================================================================

function initImageTab() {
    const iconPreview = document.getElementById('icon-preview');
    const iconInput = document.getElementById('icon-input');
    const assetsInput = document.getElementById('assets-input');

    // 아이콘 선택
    iconPreview.addEventListener('click', () => iconInput.click());
    iconInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            appState.image.iconFile = e.target.files[0];
            const thumb = await createThumbnail(appState.image.iconFile, 120);
            iconPreview.innerHTML = `<img src="${thumb}" alt="icon">`;
            updateGuideHighlights();
        }
    });

    document.getElementById('btn-clear-icon').addEventListener('click', () => {
        appState.image.iconFile = null;
        iconPreview.innerHTML = '<span class="placeholder-text">클릭하여 대표 이미지 선택</span>';
        updateGuideHighlights();
    });

    // 에셋 추가
    document.getElementById('btn-add-assets').addEventListener('click', () => assetsInput.click());
    assetsInput.addEventListener('change', async (e) => {
        for (const file of e.target.files) {
            appState.image.assetFiles.push(file);
        }
        await refreshAssetGrid();
        updateGuideHighlights();
    });

    document.getElementById('btn-clear-assets').addEventListener('click', () => {
        appState.image.assetFiles = [];
        document.getElementById('asset-grid').innerHTML = '';
        updateGuideHighlights();
    });

    // 이름 변환
    document.getElementById('btn-convert-names').addEventListener('click', convertAssetNames);

    // 저장
    document.getElementById('btn-save-image').addEventListener('click', saveImage);
}

async function refreshAssetGrid() {
    const grid = document.getElementById('asset-grid');
    grid.innerHTML = '';

    for (const file of appState.image.assetFiles) {
        const thumb = await createThumbnail(file, 80);
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.innerHTML = `
            <img src="${thumb}" alt="${file.name}">
            <span class="asset-name">${file.name}</span>
        `;
        grid.appendChild(item);
    }
}

async function convertAssetNames() {
    const client = getClient();
    if (!client) {
        showToast('설정에서 API 키를 먼저 입력해주세요.', 'error');
        return;
    }

    const charName = document.getElementById('image-char-name').value.trim();
    if (!charName) {
        showToast('캐릭터 이름을 입력해주세요.', 'error');
        return;
    }

    if (appState.image.assetFiles.length === 0) {
        showToast('이미지를 추가해주세요.', 'error');
        return;
    }

    const convertBtn = document.getElementById('btn-convert-names');
    setButtonLoading(convertBtn, true);
    const imageResultWrapper = document.getElementById('image-result-wrapper');
    showSpinner(imageResultWrapper, '에셋 이름 변환 중...');

    const fileNames = appState.image.assetFiles.map(f => f.name);
    const userPrompt = IMAGE_ASSET_USER_TEMPLATE
        .replace('{characterName}', charName)
        .replace('{fileList}', JSON.stringify(fileNames));

    try {
        const result = await client.generate(userPrompt, { systemInstruction: IMAGE_ASSET_SYSTEM, temperature: appState.settings.temperature });

        if (result.success) {
            // 마지막 매칭을 추출하는 헬퍼 함수 (프롬프트 예시와 구분하기 위함)
            const getLastMatch = (text, tagName) => {
                // [\s\S]* (greedy)로 마지막 태그까지 이동 후 캐처
                const pattern = new RegExp(`[\\s\\S]*<${tagName}>([\\s\\S]*?)</${tagName}>`);
                return text.match(pattern);
            };

            const emotionsMatch = getLastMatch(result.text, 'extracted_emotions');
            const filesMatch = getLastMatch(result.text, 'renamed_files');

            if (emotionsMatch) {
                appState.image.tags = emotionsMatch[1].trim().split('\n').map(s => s.trim()).filter(s => s);
            }

            if (filesMatch) {
                appState.image.renamedFiles = filesMatch[1].trim().split('\n').map(s => s.trim()).filter(s => s);
            }

            appState.image.charName = charName;

            // 이미지 사용 지침 생성
            const exampleCommand = appState.image.renamedFiles.length > 0
                ? `<img="${appState.image.renamedFiles[0].replace(/\.\w+$/, '')}">`
                : `<img="${charName}_emotion">`;
            appState.image.instruction = generateImageInstruction(charName, appState.image.tags, exampleCommand);

            const convertedNames = document.getElementById('converted-names');
            convertedNames.textContent = appState.image.renamedFiles.join('\n');

            showToast('파일명 변환이 완료되었습니다!');
            hideSpinner(imageResultWrapper);
            updateGuideHighlights();
        } else {
            showError(
                imageResultWrapper,
                '변환 실패',
                result.error,
                '다시 시도해주세요.'
            );
        }
    } catch (e) {
        showError(
            imageResultWrapper,
            '오류 발생',
            e.message,
            '네트워크 연결을 확인해주세요.'
        );
    } finally {
        setButtonLoading(convertBtn, false, '이름 변환');
        hideSpinner(imageResultWrapper);
    }
}

/**
 * CSS 스타일에 <style> 태그가 없으면 추가
 */
function ensureStyleTags(css) {
    if (!css || !css.trim()) return '';

    const trimmed = css.trim();
    const hasOpenTag = trimmed.toLowerCase().includes('<style');
    const hasCloseTag = trimmed.toLowerCase().includes('</style>');

    if (hasOpenTag && hasCloseTag) {
        return trimmed;
    } else if (!hasOpenTag && !hasCloseTag) {
        return `<style>\n${trimmed}\n</style>`;
    } else if (!hasOpenTag) {
        return `<style>\n${trimmed}`;
    } else {
        return `${trimmed}\n</style>`;
    }
}

function saveImage() {
    if (!appState.image.iconFile && appState.image.assetFiles.length === 0) {
        showToast('이미지를 추가해주세요.', 'error');
        return;
    }

    appState.image.saved = true;

    document.getElementById('image-save-status').textContent = '✓ 저장됨';
    document.getElementById('image-save-status').classList.add('saved');
    updateTabStatus('image', true);

    showToast('이미지가 저장되었습니다.');
    updateGuideHighlights();
}

// =============================================================================
// 설정
// =============================================================================

function initSettings() {
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model-select');
    const temperatureSlider = document.getElementById('temperature-slider');
    const temperatureValue = document.getElementById('temperature-value');
    const guideToggle = document.getElementById('guide-toggle');

    apiKeyInput.value = appState.settings.apiKey;
    modelSelect.value = appState.settings.model;
    temperatureSlider.value = appState.settings.temperature;
    temperatureValue.textContent = appState.settings.temperature.toFixed(1);
    guideToggle.checked = appState.settings.guideEnabled;

    // 모델별 권장 온도 설정
    const modelTemperatureDefaults = {
        'gemini-3-pro-preview': 1.0,
        'gemini-3-flash-preview': 1.0,
        'gemini-3-pro': 1.0,
        'gemini-2.5-flash': 0.7,
        'gemini-2.5-pro': 0.7
    };

    const temperatureRecommendation = document.getElementById('temperature-recommendation');

    // 권장 온도 표시 업데이트 함수
    function updateTemperatureRecommendation(model) {
        const recommended = modelTemperatureDefaults[model] ?? 1.0;
        temperatureRecommendation.textContent = `권장: ${recommended.toFixed(1)}`;
    }

    // 초기 권장 표시
    updateTemperatureRecommendation(modelSelect.value);

    // 모델 변경 시 온도 자동 설정
    modelSelect.addEventListener('change', () => {
        const recommended = modelTemperatureDefaults[modelSelect.value] ?? 1.0;
        temperatureSlider.value = recommended;
        temperatureValue.textContent = recommended.toFixed(1);
        updateTemperatureRecommendation(modelSelect.value);
    });

    // Temperature 슬라이더 실시간 업데이트
    temperatureSlider.addEventListener('input', () => {
        temperatureValue.textContent = parseFloat(temperatureSlider.value).toFixed(1);
    });

    // 가이드 토글 변경 시 즉시 적용
    guideToggle.addEventListener('change', () => {
        appState.settings.guideEnabled = guideToggle.checked;
        localStorage.setItem('guide_enabled', guideToggle.checked.toString());
        updateGuideHighlights();
    });

    // 저장 시 클라이언트 초기화
    if (appState.settings.apiKey) {
        initClient(appState.settings.apiKey, appState.settings.model);
    }

    document.getElementById('btn-save-settings').addEventListener('click', () => {
        appState.settings.apiKey = apiKeyInput.value.trim();
        appState.settings.model = modelSelect.value;
        appState.settings.temperature = parseFloat(temperatureSlider.value);
        appState.settings.guideEnabled = guideToggle.checked;

        localStorage.setItem('gemini_api_key', appState.settings.apiKey);
        localStorage.setItem('gemini_model', appState.settings.model);
        localStorage.setItem('gemini_temperature', appState.settings.temperature.toString());
        localStorage.setItem('guide_enabled', appState.settings.guideEnabled.toString());

        if (appState.settings.apiKey) {
            initClient(appState.settings.apiKey, appState.settings.model);
        }

        closeModal('settings-modal');
        showToast('설정이 저장되었습니다.');
        updateGuideHighlights();
    });

    document.getElementById('btn-test-api').addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            showToast('API 키를 입력해주세요.', 'error');
            return;
        }

        const testResult = document.getElementById('api-test-result');
        testResult.textContent = '테스트 중...';
        testResult.className = 'test-result';

        const client = new GeminiClient(key, modelSelect.value);
        const result = await client.testConnection();

        if (result.success) {
            testResult.textContent = '✓ 연결 성공';
            testResult.className = 'test-result success';
            appState.guideState.apiTestSuccess = true;
            updateGuideHighlights();
        } else {
            testResult.textContent = `✗ ${result.error}`;
            testResult.className = 'test-result error';
            appState.guideState.apiTestSuccess = false;
            updateGuideHighlights();
        }
    });

    // API 키 입력 시 가이드 업데이트
    apiKeyInput.addEventListener('input', () => {
        updateGuideHighlights();
    });
}

// =============================================================================
// 하단 버튼
// =============================================================================

function initBottomButtons() {
    document.getElementById('btn-settings').addEventListener('click', () => openModal('settings-modal'));
    document.getElementById('btn-reset').addEventListener('click', resetAll);
    document.getElementById('btn-export').addEventListener('click', exportData);
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('btn-generate-charx').addEventListener('click', generateCharX);
}

function resetAll() {
    if (!confirm('모든 데이터를 초기화하시겠습니까?')) return;

    // 상태 초기화
    appState.characterInfo = { saved: false, name: '', description: '', originalText: '', translatedText: '' };
    appState.firstMessage = { saved: false, messages: [''], currentIndex: 0 };
    appState.lorebook = { saved: false, sourceEntries: [], resultEntries: [] };
    appState.statusWindow = { saved: false, instruction: '', regexIn: '', regexStyle: '', regexHtml: '', sample: '' };
    appState.image = { saved: false, iconFile: null, assetFiles: [], renamedFiles: [], tags: [], charName: '', instruction: '' };

    // UI 초기화
    location.reload();
}

function exportData() {
    const data = {
        characterInfo: {
            name: appState.characterInfo.name,
            description: appState.characterInfo.description
        },
        firstMessage: {
            messages: appState.firstMessage.messages
        },
        lorebook: {
            entries: appState.lorebook.resultEntries
        },
        statusWindow: {
            instruction: appState.statusWindow.instruction,
            regexIn: appState.statusWindow.regexIn,
            regexStyle: appState.statusWindow.regexStyle,
            regexHtml: appState.statusWindow.regexHtml
        },
        image: {
            charName: appState.image.charName,
            tags: appState.image.tags,
            instruction: appState.image.instruction,
            renamedFiles: appState.image.renamedFiles,
            // 파일 존재 여부 플래그 (import 시 알림용)
            hasIcon: !!appState.image.iconFile,
            assetCount: appState.image.assetFiles.length
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charx_data_${appState.characterInfo.name || 'unnamed'}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('데이터를 내보냈습니다.');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);

            // 캐릭터 정보 로드
            if (data.characterInfo) {
                appState.characterInfo.name = data.characterInfo.name || '';
                appState.characterInfo.description = data.characterInfo.description || '';
                appState.characterInfo.originalText = data.characterInfo.description || '';
                appState.characterInfo.saved = !!(data.characterInfo.name && data.characterInfo.description);

                document.getElementById('char-name').value = appState.characterInfo.name;
                document.getElementById('result-text').value = appState.characterInfo.description;

                if (appState.characterInfo.saved) {
                    document.getElementById('char-save-status').textContent = `✓ 저장됨: ${appState.characterInfo.name}`;
                    document.getElementById('char-save-status').classList.add('saved');
                    updateTabStatus('character-info', true);
                }
            }

            // 퍼스트 메시지 로드
            if (data.firstMessage) {
                appState.firstMessage.messages = data.firstMessage.messages || [''];
                appState.firstMessage.currentIndex = 0;
                appState.firstMessage.saved = appState.firstMessage.messages.some(m => m.trim());

                document.getElementById('first-message-text').value = appState.firstMessage.messages[0] || '';
                refreshMessageButtons();

                if (appState.firstMessage.saved) {
                    const count = appState.firstMessage.messages.filter(m => m.trim()).length;
                    document.getElementById('fm-save-status').textContent = `✓ 저장됨 (${count}개)`;
                    document.getElementById('fm-save-status').classList.add('saved');
                    updateTabStatus('first-message', true);
                }
            }

            // 로어북 로드
            if (data.lorebook && data.lorebook.entries && data.lorebook.entries.length > 0) {
                appState.lorebook.resultEntries = data.lorebook.entries;
                appState.lorebook.saved = true;

                // 결과 영역에 엔트리 표시
                const resultContainer = document.getElementById('result-lore-entries');
                resultContainer.innerHTML = '';
                data.lorebook.entries.forEach((entry, idx) => {
                    appState.lorebook.resultEntries[idx] = entry;
                    resultContainer.appendChild(createLoreEntryElement(idx, false));
                });

                document.getElementById('lore-save-status').textContent = `✓ 저장됨 (${data.lorebook.entries.length}개)`;
                document.getElementById('lore-save-status').classList.add('saved');
                updateTabStatus('lorebook', true);
            }

            // 상태창 로드
            if (data.statusWindow) {
                appState.statusWindow.instruction = data.statusWindow.instruction || '';
                appState.statusWindow.regexIn = data.statusWindow.regexIn || '';
                appState.statusWindow.regexStyle = data.statusWindow.regexStyle || '';
                appState.statusWindow.regexHtml = data.statusWindow.regexHtml || '';
                appState.statusWindow.saved = !!(data.statusWindow.instruction || data.statusWindow.regexIn);

                document.getElementById('status-instruction').value = appState.statusWindow.instruction;
                document.getElementById('status-regex-in').value = appState.statusWindow.regexIn;
                document.getElementById('status-style').value = appState.statusWindow.regexStyle;
                document.getElementById('status-html').value = appState.statusWindow.regexHtml;

                if (appState.statusWindow.saved) {
                    document.getElementById('status-save-status').textContent = '✓ 저장됨';
                    document.getElementById('status-save-status').classList.add('saved');
                    updateTabStatus('status-window', true);
                }
            }

            // 이미지 로드 (파일 자체는 보안상 로드 불가, 메타데이터만 로드)
            if (data.image) {
                appState.image.charName = data.image.charName || '';
                appState.image.tags = data.image.tags || [];
                appState.image.instruction = data.image.instruction || '';
                appState.image.renamedFiles = data.image.renamedFiles || [];

                document.getElementById('image-char-name').value = appState.image.charName;
                document.getElementById('image-instruction').value = appState.image.instruction;

                if (appState.image.renamedFiles.length > 0) {
                    document.getElementById('converted-names').textContent = appState.image.renamedFiles.join('\n');
                }

                // 이미지 파일은 보안상 불러올 수 없음 - 사용자에게 알림
                if (data.image.hasIcon || data.image.assetCount) {
                    showToast('이미지 파일은 보안상 다시 선택해야 합니다.', 'info');
                }
            }

            showToast('데이터를 불러왔습니다.');
        } catch (err) {
            console.error('Import error:', err);
            showToast('데이터 파일을 읽을 수 없습니다.', 'error');
        }
    };
    reader.readAsText(file);

    // 파일 입력 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = '';
}

async function generateCharX() {
    // 필수 데이터 검증 - 캐릭터 이름은 필수
    if (!appState.characterInfo.name) {
        showToast('캐릭터 이름을 먼저 입력해주세요.', 'error');
        return;
    }

    // 미저장 탭 확인
    const unsavedTabs = [];
    const tabNames = {
        characterInfo: '캐릭터 정보',
        firstMessage: '퍼스트 메시지',
        lorebook: '로어북',
        statusWindow: '상태창',
        image: '이미지'
    };

    for (const [key, name] of Object.entries(tabNames)) {
        if (!appState[key].saved) {
            unsavedTabs.push(name);
        }
    }

    // 미저장 탭이 있으면 확인 요청
    if (unsavedTabs.length > 0) {
        const message = `다음 탭의 정보가 저장되지 않았습니다:\n\n• ${unsavedTabs.join('\n• ')}\n\n이대로 CharX를 생성하시겠습니까?\n(미저장 정보는 포함되지 않습니다)`;

        if (!confirm(message)) {
            return;
        }
    }

    showToast('CharX 파일 생성 중...', 'info');

    try {
        // CharacterData 생성
        const charData = new CharacterData({
            name: appState.characterInfo.name,
            description: appState.characterInfo.description,
            firstMes: appState.firstMessage.messages[0] || '',
            alternateGreetings: appState.firstMessage.messages.slice(1).filter(m => m.trim()),
            tags: [],  // 업로드용 해시태그는 비워둠
            creator: 'CharX Generator Web'
        });

        const builder = new CharXBuilder(charData);

        // 아이콘 추가
        if (appState.image.iconFile) {
            const iconData = await fileToUint8Array(appState.image.iconFile);
            const ext = getImageExtension(iconData);
            builder.addIcon(iconData, ext);
        }

        // 에셋 추가
        for (let i = 0; i < appState.image.assetFiles.length; i++) {
            const file = appState.image.assetFiles[i];
            const data = await fileToUint8Array(file);
            const ext = getImageExtension(data);
            const name = appState.image.renamedFiles[i]
                ? getFileBasename(appState.image.renamedFiles[i])
                : getFileBasename(file.name);
            builder.addRisuAsset(name, data, ext);
        }



        // 모듈 생성 (상태창 + 이미지 정규식)
        const regexList = [];

        // 상태창 정규식 추가
        if (appState.statusWindow.saved && appState.statusWindow.regexIn) {
            regexList.push({
                comment: '상태창 출력',
                in: appState.statusWindow.regexIn,
                out: appState.statusWindow.regexHtml,  // HTML만 저장
                type: 'editdisplay',
                flag: 'g',
                ableFlag: true
            });

            // Post history instructions 추가
            if (appState.statusWindow.instruction) {
                builder.setPostHistoryInstructions(appState.statusWindow.instruction);
            }
        }

        // 이미지 에셋 정규식 추가 (에셋이 있는 경우)
        if (appState.image.saved && appState.image.assetFiles.length > 0) {
            const assetRegexList = createAssetRegexList(
                appState.image.charName,
                appState.image.tags
            );
            regexList.push(...assetRegexList);
        }

        // 로어북 가져오기 (모듈에 포함)
        const lorebookEntries = (appState.lorebook.saved && appState.lorebook.resultEntries.length > 0)
            ? appState.lorebook.resultEntries
            : [];

        // 모듈 설정 (정규식이나 로어북이 하나라도 있으면)
        if (regexList.length > 0 || lorebookEntries.length > 0) {
            const moduleData = {
                name: `${appState.characterInfo.name} Module`,
                description: 'Character module with regex scripts',
                regex: regexList,
                lorebook: lorebookEntries
            };
            builder.setModule(moduleData);
        }

        // backgroundHTML에 CSS 저장 (상태창 + 이미지 스타일 모두)
        const allStyles = [
            appState.statusWindow.regexStyle || '',
            // 이미지 에셋 CSS (에셋이 있는 경우)
            (appState.image.saved && appState.image.assetFiles.length > 0) ? IMAGE_ASSET_CSS : '',
        ].filter(s => s.trim()).join('\n');

        if (allStyles) {
            builder.setRisuAIExtensions(allStyles);
        }

        // 이미지 지침 추가
        if (appState.image.instruction) {
            const currentInstructions = charData.postHistoryInstructions || '';
            charData.postHistoryInstructions = currentInstructions + '\n\n' + appState.image.instruction;
        }

        // risum 생성 함수 (WASM 초기화된 경우에만)
        const risumGen = isRPackInitialized() ? createRisumBuffer : null;

        // CharX 다운로드
        await builder.download(appState.characterInfo.name, risumGen);

        showToast('CharX 파일이 생성되었습니다!');

    } catch (e) {
        console.error('CharX generation error:', e);
        showToast(`생성 실패: ${e.message}`, 'error');
    }
}

// =============================================================================
// 모달
// =============================================================================

function initModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        // 배경 클릭 시 닫기
        modal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // 닫기 버튼
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// =============================================================================
// 토스트 알림
// =============================================================================

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// =============================================================================
// 가이드 하이라이트 시스템
// =============================================================================

/**
 * 가이드 하이라이트 업데이트
 * 현재 상태에 따라 각 요소의 주황색 테두리를 토글합니다.
 */
function updateGuideHighlights() {
    if (!appState.settings.guideEnabled) {
        // 가이드 비활성화 시 모든 하이라이트 제거
        document.querySelectorAll('.guide-highlight').forEach(el => {
            el.classList.remove('guide-highlight');
        });
        return;
    }

    const apiKey = document.getElementById('api-key').value.trim();
    const hasApiKey = !!appState.settings.apiKey;

    // --- 설정 관련 ---
    // 설정 버튼: API 키가 저장되지 않았을 때
    toggleHighlight('btn-settings', !hasApiKey);

    // API 키 미설정 툴팁 표시/숨김
    const apiKeyTooltip = document.getElementById('api-key-tooltip');
    if (apiKeyTooltip) {
        apiKeyTooltip.classList.toggle('show', !hasApiKey && appState.settings.guideEnabled);
    }

    // API 키 입력칸: API 키가 없을 때
    toggleHighlight('api-key', !hasApiKey);

    // 연결 테스트 버튼: API 키가 입력되었지만 테스트 안됨
    toggleHighlight('btn-test-api', apiKey && !appState.guideState.apiTestSuccess);

    // 저장 버튼: 연결 테스트 성공했을 때
    toggleHighlight('btn-save-settings', appState.guideState.apiTestSuccess && !hasApiKey);

    // --- 캐릭터 정보 탭 ---
    const charName = document.getElementById('char-name').value.trim();
    const sourceText = document.getElementById('source-text').value.trim();
    const resultText = document.getElementById('result-text').value.trim();
    const hasResult = resultText && !resultText.startsWith('[시트 미리보기]');

    toggleHighlight('char-name', hasApiKey && !charName);
    toggleHighlight('source-text', hasApiKey && !sourceText);
    toggleHighlight('btn-generate-desc', hasApiKey && charName && sourceText && !hasResult);
    toggleHighlight('btn-save-char', hasApiKey && hasResult && !appState.characterInfo.saved);

    // --- 퍼스트 메시지 탭 ---
    const firstMessageText = document.getElementById('first-message-text').value.trim();
    toggleHighlight('first-message-text', hasApiKey && !firstMessageText);
    toggleHighlight('btn-save-message', hasApiKey && firstMessageText && !appState.firstMessage.saved);

    // --- 로어북 탭 ---
    const loreEntries = document.querySelectorAll('#source-lore-entries .lore-entry');
    const hasAnyLoreEntry = loreEntries.length > 0;
    const hasResultLore = appState.lorebook.resultEntries.length > 0;

    // 로어북 엔트리가 없으면 엔트리 추가 버튼에 하이라이트
    toggleHighlight('btn-add-lore', hasApiKey && !hasAnyLoreEntry);

    // 각 로어북 엔트리의 필드와 버튼 하이라이트
    loreEntries.forEach((entryDiv, idx) => {
        const titleInput = entryDiv.querySelector('[data-field="title"]');
        const keywordsInput = entryDiv.querySelector('[data-field="keywords"]');
        const contentInput = entryDiv.querySelector('[data-field="content"]');
        const convertBtn = entryDiv.querySelector('.btn-convert-single');
        const isAlwaysActive = entryDiv.querySelector('[data-field="alwaysActive"]')?.checked;

        const hasTitle = titleInput?.value?.trim();
        const hasKeywords = keywordsInput?.value?.trim();
        const hasContent = contentInput?.value?.trim();

        // 빈 필드에 하이라이트 (상시 활성화일 경우 키워드 제외)
        if (titleInput) {
            titleInput.classList.toggle('guide-highlight', hasApiKey && !hasTitle && appState.settings.guideEnabled);
        }
        if (keywordsInput && !isAlwaysActive) {
            keywordsInput.classList.toggle('guide-highlight', hasApiKey && !hasKeywords && appState.settings.guideEnabled);
        } else if (keywordsInput && isAlwaysActive) {
            keywordsInput.classList.remove('guide-highlight');
        }
        if (contentInput) {
            contentInput.classList.toggle('guide-highlight', hasApiKey && !hasContent && appState.settings.guideEnabled);
        }

        // 모든 필드가 입력되면 개별 변환 버튼에 하이라이트 (상시 활성화일 경우 키워드 제외)
        const isComplete = isAlwaysActive
            ? (hasTitle && hasContent)
            : (hasTitle && hasKeywords && hasContent);
        if (convertBtn) {
            convertBtn.classList.toggle('guide-highlight', hasApiKey && isComplete && appState.settings.guideEnabled);
        }
    });

    // 전체 변환 버튼: 모든 엔트리에 내용이 있고 결과가 없을 때
    const hasSourceLore = appState.lorebook.sourceEntries.some(e => e.content?.trim());
    toggleHighlight('btn-convert-lore', hasApiKey && hasSourceLore && !hasResultLore);
    toggleHighlight('btn-save-lore', hasApiKey && hasResultLore && !appState.lorebook.saved);

    // --- 상태창 탭 ---
    const statusSource = document.getElementById('status-source').value.trim();
    const statusInstruction = document.getElementById('status-instruction').value.trim();
    toggleHighlight('status-source', hasApiKey && !statusSource);
    toggleHighlight('btn-generate-status', hasApiKey && statusSource && !statusInstruction);
    toggleHighlight('btn-save-status', hasApiKey && statusInstruction && !appState.statusWindow.saved);

    // --- 이미지 탭 ---
    const hasIcon = !!appState.image.iconFile;
    const hasAssets = appState.image.assetFiles.length > 0;
    const imageCharName = document.getElementById('image-char-name').value.trim();
    const hasConvertedNames = document.getElementById('converted-names').textContent.trim();

    // 아이콘 프리뷰 영역
    const iconPreview = document.getElementById('icon-preview');
    if (iconPreview) {
        iconPreview.classList.toggle('guide-highlight', hasApiKey && !hasIcon && appState.settings.guideEnabled);
    }

    toggleHighlight('btn-add-assets', hasApiKey && !hasAssets);
    toggleHighlight('image-char-name', hasApiKey && hasAssets && !imageCharName);
    toggleHighlight('btn-convert-names', hasApiKey && hasAssets && imageCharName && !hasConvertedNames);
    // 이미지 저장 버튼: 이름 변환까지 완료한 후에만 하이라이트
    toggleHighlight('btn-save-image', hasApiKey && hasConvertedNames && !appState.image.saved);

    // --- 푸터 ---
    toggleHighlight('btn-generate-charx', appState.characterInfo.saved);
}

/**
 * 요소의 하이라이트 토글
 * @param {string} elementId - 요소 ID
 * @param {boolean} shouldHighlight - 하이라이트 여부
 */
function toggleHighlight(elementId, shouldHighlight) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.toggle('guide-highlight', shouldHighlight && appState.settings.guideEnabled);
    }
}

/**
 * 가이드 시스템 초기화 - 각 입력 필드에 이벤트 리스너 추가
 */
function initGuideSystem() {
    // 캐릭터 정보 탭 입력 필드
    document.getElementById('char-name').addEventListener('input', updateGuideHighlights);
    document.getElementById('source-text').addEventListener('input', updateGuideHighlights);

    // 퍼스트 메시지 탭
    document.getElementById('first-message-text').addEventListener('input', updateGuideHighlights);

    // 상태창 탭
    document.getElementById('status-source').addEventListener('input', updateGuideHighlights);

    // 이미지 탭
    document.getElementById('image-char-name').addEventListener('input', updateGuideHighlights);

    // 탭 전환 시 가이드 업데이트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(updateGuideHighlights, 50);
        });
    });

    // 초기 가이드 표시
    updateGuideHighlights();
}

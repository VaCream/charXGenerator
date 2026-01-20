/**
 * Gemini API 클라이언트
 * Python llm/gemini_client.py 포팅
 */

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MIN_REQUEST_INTERVAL = 30000; // 30초 (ms)
const MAX_RETRIES = 5;

// 탈옥 프리셋
const JAILBREAK_PRESETS = {
    default: {
        prefix: '',
        suffix: ''
    }
};

export class GeminiClient {
    /**
     * Google Gemini API 클라이언트
     * @param {string} apiKey - Google API 키 또는 프록시 사용자명 (예: alice)
     * @param {string} model 
     */
    constructor(apiKey, model = 'gemini-2.5-flash') {
        this.apiKey = apiKey;
        this.model = model;
        this.lastRequestTime = 0;
        // 프록시 모드 여부 확인: API 키가 짧고 점(.)이 없으면 프록시 사용자명으로 간주
        // Google API 키는 보통 'AIza...'로 시작하고 39자
        this.isProxyMode = apiKey && !apiKey.includes('.') && !apiKey.startsWith('AIza') && apiKey.length < 30;
    }

    /**
     * API 요청 URL 생성
     * @param {string} action - API 액션 (예: 'generateContent')
     * @returns {string} 요청 URL
     */
    _buildUrl(action) {
        if (this.isProxyMode) {
            // 프록시 모드: api.solariusk.shop/{username}/v1beta/...
            // apiKey 형식: "username" (예: alice, bob)
            return `https://api.solariusk.shop/${this.apiKey}/v1beta/models/${this.model}:${action}`;
        } else {
            // 일반 모드: Google API 직접 호출
            return `${BASE_URL}/${this.model}:${action}?key=${this.apiKey}`;
        }
    }

    /**
     * 요청 간격 대기
     */
    async _waitForRateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;

        if (elapsed < MIN_REQUEST_INTERVAL && this.lastRequestTime > 0) {
            const waitTime = MIN_REQUEST_INTERVAL - elapsed;
            console.log(`Rate limit: waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * 텍스트 생성 요청
     * @param {string} prompt - 사용자 프롬프트
     * @param {string|null} systemInstruction - 시스템 지시
     * @param {number} maxTokens - 최대 출력 토큰
     * @param {number} temperature - 온도 (창의성)
     * @param {boolean} jailbreak - 탈옥 사용 여부
     * @param {string} jailbreakPreset - 탈옥 프리셋 이름
     * @returns {Promise<{success: boolean, text?: string, error?: string}>}
     */
    async generate(
        prompt,
        {
            systemInstruction = null,
            maxTokens = 8192,
            temperature = 0.7,
            jailbreak = false,
            jailbreakPreset = 'default'
        } = {}
    ) {
        await this._waitForRateLimit();

        const url = this._buildUrl('generateContent');

        // 프롬프트 조합
        let finalPrompt = prompt;
        if (jailbreak) {
            const preset = JAILBREAK_PRESETS[jailbreakPreset] || JAILBREAK_PRESETS.default;
            finalPrompt = preset.prefix + prompt + preset.suffix;
        }

        // 요청 페이로드 구성
        const payload = {
            contents: [{
                role: 'user',
                parts: [{ text: finalPrompt }]
            }],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: temperature
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        };

        // 시스템 지시 추가
        if (systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        return await this._sendRequest(url, payload);
    }

    /**
     * 멀티턴 대화 생성
     * @param {Array} messages - [{role: 'user'|'model', text: '...'}]
     * @param {string|null} systemInstruction 
     * @param {number} maxTokens 
     * @param {number} temperature 
     * @returns {Promise<{success: boolean, text?: string, error?: string}>}
     */
    async generateWithHistory(
        messages,
        {
            systemInstruction = null,
            maxTokens = 8192,
            temperature = 0.7
        } = {}
    ) {
        await this._waitForRateLimit();

        const url = this._buildUrl('generateContent');

        const contents = messages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const payload = {
            contents: contents,
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: temperature
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        };

        if (systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        return await this._sendRequest(url, payload);
    }

    /**
     * 실제 API 요청 전송
     * @param {string} url 
     * @param {Object} payload 
     * @returns {Promise<{success: boolean, text?: string, error?: string}>}
     */
    async _sendRequest(url, payload) {
        let retries = 0;
        let lastError = null;

        console.log('[Gemini API] Request URL:', url);
        console.log('[Gemini API] Model:', this.model);
        console.log('[Gemini API] Payload:', JSON.stringify(payload, null, 2));

        while (retries < MAX_RETRIES) {
            const startTime = performance.now();

            try {
                console.log('[Gemini API] Attempt', retries + 1, '/', MAX_RETRIES);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const elapsed = Math.round(performance.now() - startTime);

                console.log('[Gemini API] Response status:', response.status, response.statusText);
                console.log('[Gemini API] Elapsed:', elapsed, 'ms');

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || response.statusText;

                    console.error('[Gemini API] Error status:', response.status);
                    console.error('[Gemini API] Error data:', JSON.stringify(errorData, null, 2));

                    // Rate limit 에러 처리
                    if (response.status === 429) {
                        retries++;
                        const waitTime = Math.min(60000, MIN_REQUEST_INTERVAL * retries);
                        console.log('[Gemini API] Rate limit, waiting', waitTime, 'ms');
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }

                    return { success: false, error: `API Error (${response.status}): ${errorMessage}` };
                }

                const data = await response.json();
                console.log('[Gemini API] Response data:', JSON.stringify(data, null, 2));

                // 응답 텍스트 추출
                if (data.candidates && data.candidates.length > 0) {
                    const candidate = data.candidates[0];
                    if (candidate.content && candidate.content.parts) {
                        let text = candidate.content.parts.map(p => p.text || '').join('');
                        // 마크다운 볼드(**) 제거
                        text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
                        console.log('[Gemini API] Success, text length:', text.length);
                        return { success: true, text: text };
                    }
                }

                // 차단된 경우
                if (data.promptFeedback?.blockReason) {
                    console.error('[Gemini API] Blocked:', data.promptFeedback.blockReason);
                    return { success: false, error: `Blocked: ${data.promptFeedback.blockReason}` };
                }

                console.warn('[Gemini API] Empty response');
                return { success: false, error: 'Empty response from API' };

            } catch (e) {
                lastError = e;
                retries++;

                console.error('[Gemini API] Exception:', e.name, e.message);
                console.error('[Gemini API] Stack:', e.stack);

                if (retries < MAX_RETRIES) {
                    const waitTime = Math.min(30000, 5000 * retries);
                    console.log('[Gemini API] Retrying in', waitTime, 'ms');
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        console.error('[Gemini API] All retries failed');
        return { success: false, error: `Request failed after ${MAX_RETRIES} retries: ${lastError?.message || 'Unknown error'}` };
    }

    /**
     * API 연결 테스트
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async testConnection() {
        console.log('[Gemini API] Connection test started');
        console.log('[Gemini API] API Key:', this.apiKey);
        console.log('[Gemini API] Model:', this.model);

        try {
            // 테스트 시에는 rate limit 무시
            this.lastRequestTime = 0;

            const result = await this.generate('api 테스트중입니다. 연결이 양호하다고 답해 주세요.', {
                maxTokens: 1024,
                temperature: 0.1
            });

            console.log('[Gemini API] Connection test result:', result);

            if (result.success) {
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
        } catch (e) {
            console.error('[Gemini API] Connection test exception:', e);
            return { success: false, error: e.message };
        }
    }
}

// 싱글톤 인스턴스
let _client = null;

/**
 * 클라이언트 초기화
 * @param {string} apiKey 
 * @param {string} model 
 */
export function initClient(apiKey, model = 'gemini-2.5-flash') {
    _client = new GeminiClient(apiKey, model);
    return _client;
}

/**
 * 현재 클라이언트 가져오기
 * @returns {GeminiClient|null}
 */
export function getClient() {
    return _client;
}

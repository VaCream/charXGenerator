/**
 * RisuAI 모듈용 정규식 템플릿
 * CharX 저장 시 module.risum에 포함되는 정규식들
 */

// =============================================================================
// 이미지 에셋 관련 고정 정규식
// =============================================================================

/**
 * 오래된 이미지 리퀘스트 제거
 * 5턴 이상 지난 이미지 태그만 표시하도록 처리
 */
export const REGEX_OLD_IMAGE_REMOVE = {
    comment: '오래된 이미지 리퀘스트 제거',
    in: '<img="([^"]+)">',
    out: '{{#if {{greater_equal::{{chat_index}}::{{? {{lastmessageid}}-5}}}}}}\n$&\n{{/if}}',
    type: 'editprocess',
    ableFlag: true,
    flag: 'g'
};

/**
 * 에셋 줄바꿈 처리 1
 * 태그 앞에 줄바꿈이 없으면 추가
 */
export const REGEX_ASSET_NEWLINE_1 = {
    comment: '에셋 줄바꿈 처리 1',
    in: '(?<!\\n\\n)<img="([^"_]+)_([^"]+)">',
    out: '\n<img="$1_$2">',
    type: 'editoutput',
    ableFlag: false
};

/**
 * 에셋 줄바꿈 처리 2
 * 태그 뒤에 줄바꿈이 없으면 추가
 */
export const REGEX_ASSET_NEWLINE_2 = {
    comment: '에셋 줄바꿈 처리 2',
    in: '<img="([^"_]+)_([^"]+)">(?!\\n\\n)',
    out: '<img="$1_$2">\n',
    type: 'editoutput',
    ableFlag: false
};

// =============================================================================
// 이미지 에셋 관련 동적 정규식 생성 함수
// =============================================================================

/**
 * 에셋 출력 정규식 생성
 * @param {string} charName - 캐릭터 이름 (예: "Inha")
 * @param {string[]} tags - 감정/상태 태그 목록 (예: ["cute", "angry", "happy"])
 * @returns {Object} 정규식 객체
 */
export function createAssetDisplayRegex(charName, tags) {
    const tagPattern = tags.join('|');
    return {
        comment: '에셋 출력',
        in: `<img="(${charName})_(${tagPattern})">`,
        out: `<div class="container">
  <img
    class="roundedImage asset"
    src="{{raw::{{random::{{spread::{{filter::{{split::{{#each {{assetlist}} a}} {{#if {{startswith::{{slot::a}}::$1_$2}}}} {{slot::a}}$$ {{/if}} {{/each}}::$$}}}}}}}}}}">
</div>`,
        type: 'editdisplay',
        ableFlag: false
    };
}

/**
 * 에셋 오류 처리 정규식 생성
 * 유효하지 않은 태그에 에러 메시지 표시
 * @param {string} charName - 캐릭터 이름
 * @param {string[]} tags - 유효한 태그 목록
 * @returns {Object} 정규식 객체
 */
export function createAssetErrorRegex(charName, tags) {
    const tagPattern = tags.join('|');
    return {
        comment: '에셋 오류 처리',
        in: `<img="(?!(?:${charName})_(?:${tagPattern})")([^"]+)">`,
        out: '<div class="container error">Display Error: $1 </div>',
        type: 'editdisplay',
        ableFlag: true,
        flag: '<order 1>'
    };
}

/**
 * 에셋 오류 리퀘 제거 정규식 생성
 * 유효하지 않은 태그 완전 제거 (비활성화 상태로 저장)
 * @param {string} charName - 캐릭터 이름
 * @param {string[]} tags - 유효한 태그 목록
 * @returns {Object} 정규식 객체
 */
export function createAssetErrorRemoveRegex(charName, tags) {
    const tagPattern = tags.join('|');
    return {
        comment: '에셋 오류 리퀘 제거',
        in: `<img="(?!(?:${charName})_(?:${tagPattern})")([^"]+)">`,
        out: '',
        type: 'editprocess',
        ableFlag: true,
        flag: 'g'
    };
}

// =============================================================================
// 모듈용 정규식 리스트 생성 함수
// =============================================================================

/**
 * 이미지 에셋용 전체 정규식 리스트 생성
 * @param {string} charName - 캐릭터 이름
 * @param {string[]} tags - 감정/상태 태그 목록
 * @returns {Object[]} 정규식 객체 배열
 */
export function createAssetRegexList(charName, tags) {
    if (!charName || !tags || tags.length === 0) {
        return [];
    }

    return [
        REGEX_OLD_IMAGE_REMOVE,
        createAssetDisplayRegex(charName, tags),
        REGEX_ASSET_NEWLINE_1,
        REGEX_ASSET_NEWLINE_2,
        createAssetErrorRegex(charName, tags),
        createAssetErrorRemoveRegex(charName, tags)
    ];
}

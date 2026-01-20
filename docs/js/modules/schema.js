/**
 * CharX 데이터 스키마 정의
 * Python charx/schema.py 포팅
 */

/**
 * 캐릭터 에셋 (이미지, 오디오 등)
 */
export class Asset {
    constructor(type, uri, name, ext) {
        this.type = type;  // icon, emotion, background, user_icon, x-risu-asset
        this.uri = uri;    // embeded://path 또는 외부 URL
        this.name = name;
        this.ext = ext;    // png, jpg, webp 등
    }

    toDict() {
        return {
            type: this.type,
            uri: this.uri,
            name: this.name,
            ext: this.ext
        };
    }
}

/**
 * 로어북 엔트리
 */
export class LorebookEntry {
    constructor({
        keys = [],
        content = '',
        enabled = true,
        insertionOrder = 100,
        caseSensitive = false,
        comment = '',
        name = '',
        constant = false,
        selective = false,
        useRegex = false,
        mode = 'normal'
    } = {}) {
        this.keys = keys;
        this.content = content;
        this.enabled = enabled;
        this.insertionOrder = insertionOrder;
        this.caseSensitive = caseSensitive;
        this.comment = comment;
        this.name = name || comment;
        this.constant = constant;
        this.selective = selective;
        this.useRegex = useRegex;
        this.mode = mode;
    }

    toDict() {
        return {
            keys: this.keys,
            content: this.content,
            extensions: {
                risu_case_sensitive: this.caseSensitive,
                risu_loreCache: null
            },
            enabled: this.enabled,
            insertion_order: this.insertionOrder,
            constant: this.constant,
            selective: this.selective,
            name: this.name || this.comment,
            comment: this.comment,
            case_sensitive: this.caseSensitive,
            use_regex: this.useRegex,
            mode: this.mode
        };
    }
}

/**
 * 캐릭터 로어북
 */
export class CharacterBook {
    constructor({
        entries = [],
        scanDepth = 5,
        tokenBudget = 30000,
        recursiveScanning = false
    } = {}) {
        this.entries = entries;
        this.scanDepth = scanDepth;
        this.tokenBudget = tokenBudget;
        this.recursiveScanning = recursiveScanning;
    }

    toDict() {
        return {
            scan_depth: this.scanDepth,
            token_budget: this.tokenBudget,
            recursive_scanning: this.recursiveScanning,
            extensions: {
                risu_fullWordMatching: false
            },
            entries: this.entries.map(e => e.toDict())
        };
    }
}

/**
 * 플랫폼 독립적 캐릭터 데이터 스키마
 */
export class CharacterData {
    constructor({
        // 필수 필드
        name = '',
        description = '',
        firstMes = '',
        
        // 선택 필드
        personality = '',
        scenario = '',
        mesExample = '',
        systemPrompt = '',
        postHistoryInstructions = '',
        alternateGreetings = [],
        tags = [],
        creator = '',
        characterVersion = '1.0',
        creatorNotes = '',
        
        // 에셋
        assets = [],
        
        // 로어북
        characterBook = null,
        
        // 확장 필드
        extensions = {}
    } = {}) {
        this.name = name;
        this.description = description;
        this.firstMes = firstMes;
        this.personality = personality;
        this.scenario = scenario;
        this.mesExample = mesExample;
        this.systemPrompt = systemPrompt;
        this.postHistoryInstructions = postHistoryInstructions;
        this.alternateGreetings = alternateGreetings;
        this.tags = tags;
        this.creator = creator;
        this.characterVersion = characterVersion;
        this.creatorNotes = creatorNotes;
        this.assets = assets;
        this.characterBook = characterBook;
        this.extensions = extensions;
    }

    /**
     * CharacterCardV3 형식의 card.json 딕셔너리 생성
     */
    toCardJSON() {
        const card = {
            spec: 'chara_card_v3',
            spec_version: '3.0',
            data: {
                name: this.name,
                description: this.description,
                first_mes: this.firstMes,
                personality: this.personality,
                scenario: this.scenario,
                mes_example: this.mesExample,
                system_prompt: this.systemPrompt,
                post_history_instructions: this.postHistoryInstructions,
                alternate_greetings: this.alternateGreetings,
                tags: this.tags,
                creator: this.creator,
                character_version: this.characterVersion,
                creator_notes: this.creatorNotes,
                assets: this.assets.map(a => a.toDict()),
                extensions: this.extensions
            }
        };

        if (this.characterBook) {
            card.data.character_book = this.characterBook.toDict();
        }

        return card;
    }
}

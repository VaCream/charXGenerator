/**
 * CharX 파일 빌더
 * Python charx/builder.py 포팅
 * JSZip을 사용하여 .charx (ZIP) 파일 생성
 */

import { Asset, LorebookEntry, CharacterBook } from './schema.js';

export class CharXBuilder {
    /**
     * CharX (.charx) 파일을 생성하는 빌더 클래스
     * @param {CharacterData} character 
     */
    constructor(character) {
        this.character = character;
        this._assetFiles = new Map();  // path -> Uint8Array
        this._textFiles = new Map();   // path -> string
        this._moduleData = null;       // risum 모듈 데이터
    }

    /**
     * 캐릭터 아이콘 추가
     * @param {Uint8Array} imageData 
     * @param {string} ext 
     * @param {string} filename 
     */
    addIcon(imageData, ext = 'png', filename = 'icon') {
        const path = `assets/icon/image/${filename}.${ext}`;
        const uri = `embeded://${path}`;

        this.character.assets.push(new Asset('icon', uri, 'main', ext));
        this._assetFiles.set(path, imageData);
    }

    /**
     * RisuAI 에셋 추가 (x-risu-asset 타입)
     * @param {string} name 
     * @param {Uint8Array} imageData 
     * @param {string} ext 
     */
    addRisuAsset(name, imageData, ext = 'png') {
        const path = `assets/other/image/${name}.${ext}`;
        const uri = `embeded://${path}`;

        this.character.assets.push(new Asset('x-risu-asset', uri, `${name}.${ext}`, ext));
        this._assetFiles.set(path, imageData);
    }

    /**
     * 텍스트 파일 추가 (regex 등)
     * @param {string} filename 
     * @param {string} content 
     */
    addTextFile(filename, content) {
        this._textFiles.set(filename, content);
    }

    /**
     * 로어북 설정
     * @param {Array} entries - [{title, keywords, content, alwaysActive}, ...]
     */
    setLorebook(entries) {
        if (!entries || entries.length === 0) return;

        const lorebookEntries = entries.map(entry => {
            const keys = (entry.keywords || '').split(',').map(k => k.trim()).filter(k => k);
            const title = entry.title || '';
            const isConstant = entry.alwaysActive || false;

            return new LorebookEntry({
                keys: keys,
                content: entry.content || '',
                comment: title,
                name: title,
                enabled: true,
                insertionOrder: 100,
                caseSensitive: false,
                constant: isConstant,
                mode: isConstant ? 'constant' : 'normal'
            });
        });

        this.character.characterBook = new CharacterBook({ entries: lorebookEntries });
    }

    /**
     * 글로벌 노트 덮어쓰기 설정 (post_history_instructions)
     * @param {string} instructions 
     */
    setPostHistoryInstructions(instructions) {
        this.character.postHistoryInstructions = instructions;
    }

    /**
     * RisuAI 확장 필드 설정
     * @param {string} backgroundHTML 
     */
    setRisuAIExtensions(backgroundHTML = '') {
        if (!this.character.extensions.risuai) {
            this.character.extensions.risuai = {};
        }

        this.character.extensions.risuai.backgroundHTML = backgroundHTML;
        this.character.extensions.risuai.viewScreen = 'none';
        this.character.extensions.risuai.utilityBot = false;
    }

    /**
     * RisuM 모듈 데이터 설정
     * @param {Object} moduleData - {name, description, regex, lorebook, trigger}
     */
    setModule(moduleData) {
        this._moduleData = moduleData;
    }

    /**
     * CharX 파일 생성
     * @param {Function} risumGenerator - risum 생성 함수 (선택)
     * @returns {Promise<Blob>} CharX 파일 Blob
     */
    async build(risumGenerator = null) {
        const zip = new JSZip();

        // card.json 추가
        const cardJson = this.character.toCardJSON();
        zip.file('card.json', JSON.stringify(cardJson, null, 4));

        // 에셋 파일들 추가
        for (const [path, data] of this._assetFiles) {
            zip.file(path, data);
        }

        // 텍스트 파일들 추가
        for (const [path, content] of this._textFiles) {
            zip.file(path, content);
        }

        // module.risum 추가 (모듈 데이터가 있는 경우)
        if (this._moduleData && risumGenerator) {
            try {
                const risumBuffer = await risumGenerator(this._moduleData);
                zip.file('module.risum', risumBuffer);
            } catch (e) {
                console.warn('module.risum 생성 실패:', e);
            }
        }

        // ZIP 생성
        const blob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        return blob;
    }

    /**
     * CharX 파일 다운로드
     * @param {string} filename 
     * @param {Function} risumGenerator 
     */
    async download(filename, risumGenerator = null) {
        const blob = await this.build(risumGenerator);

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.charx') ? filename : `${filename}.charx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 이미지 데이터에서 확장자 추출
     * @param {Uint8Array} imageData 
     * @returns {string}
     */
    static getExtension(imageData) {
        // PNG
        if (imageData[0] === 0x89 && imageData[1] === 0x50 &&
            imageData[2] === 0x4E && imageData[3] === 0x47) {
            return 'png';
        }
        // JPEG
        if (imageData[0] === 0xFF && imageData[1] === 0xD8) {
            return 'jpg';
        }
        // WebP
        if (imageData[0] === 0x52 && imageData[1] === 0x49 &&
            imageData[2] === 0x46 && imageData[3] === 0x46 &&
            imageData[8] === 0x57 && imageData[9] === 0x45 &&
            imageData[10] === 0x42 && imageData[11] === 0x50) {
            return 'webp';
        }
        // GIF
        if (imageData[0] === 0x47 && imageData[1] === 0x49 && imageData[2] === 0x46) {
            return 'gif';
        }
        // AVIF
        if (imageData.length > 12 &&
            imageData[4] === 0x66 && imageData[5] === 0x74 &&
            imageData[6] === 0x79 && imageData[7] === 0x70 &&
            imageData[8] === 0x61 && imageData[9] === 0x76 &&
            imageData[10] === 0x69 && imageData[11] === 0x66) {
            return 'avif';
        }

        return 'png';  // 기본값
    }
}

/**
 * RisuM (.risum) 파일 생성기
 * Python module/risum_generator.py 포팅
 * 브라우저 WebAssembly API 사용
 */

let wasmInstance = null;
let memory = null;

/**
 * RPack WASM 모듈 초기화
 * @param {string} wasmPath - rpack_bg.wasm 파일 경로
 */
export async function initRPack(wasmPath = 'wasm/rpack_bg.wasm') {
    if (wasmInstance) return;

    try {
        const response = await fetch(wasmPath);
        const wasmBytes = await response.arrayBuffer();
        const wasmModule = await WebAssembly.instantiate(wasmBytes, {});

        wasmInstance = wasmModule.instance;
        memory = wasmInstance.exports.memory;

        console.log('RPack WASM initialized successfully');
    } catch (e) {
        console.error('Failed to initialize RPack WASM:', e);
        throw e;
    }
}

/**
 * 메모리에서 i32 읽기 (Little Endian)
 * @param {number} ptr 
 * @returns {number}
 */
function readI32(ptr) {
    const view = new DataView(memory.buffer);
    return view.getInt32(ptr, true);
}

/**
 * 바이트 데이터를 WASM 메모리에 쓰기
 * @param {Uint8Array} data 
 * @returns {{ptr: number, length: number}}
 */
function writeBytesToMemory(data) {
    const malloc = wasmInstance.exports.__wbindgen_malloc;
    const length = data.length;
    const ptr = malloc(length, 1);

    const memView = new Uint8Array(memory.buffer);
    memView.set(data, ptr);

    return { ptr, length };
}

/**
 * WASM 메모리에서 바이트 데이터 읽기
 * @param {number} ptr 
 * @param {number} length 
 * @returns {Uint8Array}
 */
function readBytesFromMemory(ptr, length) {
    const memView = new Uint8Array(memory.buffer);
    return memView.slice(ptr, ptr + length);
}

/**
 * RPack 인코딩
 * @param {Uint8Array} data 
 * @returns {Uint8Array}
 */
export function encode(data) {
    if (!wasmInstance) {
        throw new Error('RPack not initialized. Call initRPack() first.');
    }

    const addToStackPointer = wasmInstance.exports.__wbindgen_add_to_stack_pointer;
    const encodeFn = wasmInstance.exports.encode;
    const free = wasmInstance.exports.__wbindgen_free;

    const retptr = addToStackPointer(-16);

    try {
        const { ptr, length } = writeBytesToMemory(data);
        encodeFn(retptr, ptr, length);

        const resultPtr = readI32(retptr);
        const resultLen = readI32(retptr + 4);

        const result = readBytesFromMemory(resultPtr, resultLen);
        free(resultPtr, resultLen, 1);

        return result;
    } finally {
        addToStackPointer(16);
    }
}

/**
 * RPack 디코딩
 * @param {Uint8Array} data 
 * @returns {Uint8Array}
 */
export function decode(data) {
    if (!wasmInstance) {
        throw new Error('RPack not initialized. Call initRPack() first.');
    }

    const addToStackPointer = wasmInstance.exports.__wbindgen_add_to_stack_pointer;
    const decodeFn = wasmInstance.exports.decode;
    const free = wasmInstance.exports.__wbindgen_free;

    const retptr = addToStackPointer(-16);

    try {
        const { ptr, length } = writeBytesToMemory(data);
        decodeFn(retptr, ptr, length);

        const resultPtr = readI32(retptr);
        const resultLen = readI32(retptr + 4);

        const result = readBytesFromMemory(resultPtr, resultLen);
        free(resultPtr, resultLen, 1);

        return result;
    } finally {
        addToStackPointer(16);
    }
}

/**
 * UUID v4 생성
 * @returns {string}
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * RisuModule을 .risum 파일 바이트로 변환
 * @param {Object} moduleData - RisuModule 딕셔너리
 * @param {Array<Uint8Array>} assetBuffers - 에셋 바이너리 데이터 리스트
 * @returns {Uint8Array} .risum 파일 바이트
 */
export function createRisumBuffer(moduleData, assetBuffers = []) {
    if (!wasmInstance) {
        throw new Error('RPack not initialized. Call initRPack() first.');
    }

    const chunks = [];

    // === 헤더 ===
    chunks.push(new Uint8Array([111]));  // Magic Number
    chunks.push(new Uint8Array([0]));    // Version

    // === 모듈 데이터 준비 ===
    const exportModule = JSON.parse(JSON.stringify(moduleData));  // 딥 카피
    if (!exportModule.id) {
        exportModule.id = generateUUID();
    }

    // 에셋 경로는 내보내기 시 빈 문자열로 설정
    if (exportModule.assets) {
        exportModule.assets = exportModule.assets.map(a => [a[0], '', a[2]]);
    }

    const mainJson = JSON.stringify({
        type: 'risuModule',
        module: exportModule
    }, null, 2);

    const mainData = encode(new TextEncoder().encode(mainJson));

    // Main Data Length (4 bytes, Little Endian)
    const lengthBuffer = new ArrayBuffer(4);
    new DataView(lengthBuffer).setUint32(0, mainData.length, true);
    chunks.push(new Uint8Array(lengthBuffer));
    chunks.push(mainData);

    // === Assets ===
    for (const assetBuffer of assetBuffers) {
        chunks.push(new Uint8Array([1]));  // Asset Mark
        const encodedAsset = encode(assetBuffer);
        const assetLengthBuffer = new ArrayBuffer(4);
        new DataView(assetLengthBuffer).setUint32(0, encodedAsset.length, true);
        chunks.push(new Uint8Array(assetLengthBuffer));
        chunks.push(encodedAsset);
    }

    // === End Mark ===
    chunks.push(new Uint8Array([0]));

    // 모든 청크 결합
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}

/**
 * .risum 파일 읽기
 * @param {Uint8Array} data - .risum 파일 바이트
 * @returns {{module: Object, assets: Array<Uint8Array>}}
 */
export function readRisumFile(data) {
    if (!wasmInstance) {
        throw new Error('RPack not initialized. Call initRPack() first.');
    }

    let pos = 0;

    // Magic Number 확인
    if (data[pos] !== 111) {
        throw new Error('Invalid magic number');
    }
    pos += 1;

    // Version 확인
    if (data[pos] !== 0) {
        throw new Error('Unsupported version');
    }
    pos += 1;

    // Main Data 읽기
    const mainLen = new DataView(data.buffer, data.byteOffset + pos, 4).getUint32(0, true);
    pos += 4;

    const mainData = data.slice(pos, pos + mainLen);
    pos += mainLen;

    const decoded = decode(mainData);
    const jsonData = JSON.parse(new TextDecoder().decode(decoded));

    if (jsonData.type !== 'risuModule') {
        throw new Error('Invalid module type');
    }

    const module = jsonData.module;
    const assets = [];

    // Assets 읽기
    while (pos < data.length) {
        const mark = data[pos];
        pos += 1;

        if (mark === 0) {
            break;
        }
        if (mark !== 1) {
            throw new Error('Invalid asset mark');
        }

        const assetLen = new DataView(data.buffer, data.byteOffset + pos, 4).getUint32(0, true);
        pos += 4;

        const assetData = data.slice(pos, pos + assetLen);
        pos += assetLen;

        const decodedAsset = decode(assetData);
        assets.push(decodedAsset);
    }

    return { module, assets };
}

/**
 * RPack 초기화 여부 확인
 * @returns {boolean}
 */
export function isInitialized() {
    return wasmInstance !== null;
}

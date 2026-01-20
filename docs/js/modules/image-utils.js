/**
 * 이미지 처리 유틸리티
 * Canvas API를 사용한 이미지 리사이즈/포맷 변환
 */

/**
 * 파일을 ArrayBuffer로 읽기
 * @param {File} file 
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

/**
 * 파일을 Data URL로 읽기
 * @param {File} file 
 * @returns {Promise<string>}
 */
export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 이미지를 로드
 * @param {string} src - Data URL 또는 이미지 URL
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * 이미지 리사이즈
 * @param {File|Blob} file - 이미지 파일
 * @param {number} maxWidth - 최대 너비
 * @param {number} maxHeight - 최대 높이
 * @param {string} format - 출력 포맷 ('image/png', 'image/jpeg', 'image/webp')
 * @param {number} quality - 품질 (0-1, JPEG/WebP용)
 * @returns {Promise<{blob: Blob, width: number, height: number}>}
 */
export async function resizeImage(file, maxWidth, maxHeight, format = 'image/png', quality = 0.9) {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);

    let { width, height } = img;

    // 비율 유지하면서 리사이즈
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }

    // Canvas에 그리기
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Blob으로 변환
    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, format, quality);
    });

    return { blob, width, height };
}

/**
 * 이미지 포맷 변환
 * @param {File|Blob} file - 이미지 파일
 * @param {string} format - 출력 포맷 ('image/png', 'image/jpeg', 'image/webp')
 * @param {number} quality - 품질 (0-1, JPEG/WebP용)
 * @returns {Promise<Blob>}
 */
export async function convertFormat(file, format = 'image/png', quality = 0.9) {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    return new Promise(resolve => {
        canvas.toBlob(resolve, format, quality);
    });
}

/**
 * Blob을 Uint8Array로 변환
 * @param {Blob} blob 
 * @returns {Promise<Uint8Array>}
 */
export async function blobToUint8Array(blob) {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
}

/**
 * File/Blob을 Uint8Array로 변환
 * @param {File|Blob} file 
 * @returns {Promise<Uint8Array>}
 */
export async function fileToUint8Array(file) {
    const buffer = await readFileAsArrayBuffer(file);
    return new Uint8Array(buffer);
}

/**
 * 이미지 썸네일 생성
 * @param {File|Blob} file - 이미지 파일
 * @param {number} size - 썸네일 크기 (정사각형)
 * @returns {Promise<string>} - Data URL
 */
export async function createThumbnail(file, size = 60) {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');

    // 중앙 크롭
    const minDim = Math.min(img.width, img.height);
    const sx = (img.width - minDim) / 2;
    const sy = (img.height - minDim) / 2;

    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

    return canvas.toDataURL('image/png');
}

/**
 * 이미지 확장자 추출
 * @param {Uint8Array} data 
 * @returns {string}
 */
export function getImageExtension(data) {
    // PNG
    if (data[0] === 0x89 && data[1] === 0x50 &&
        data[2] === 0x4E && data[3] === 0x47) {
        return 'png';
    }
    // JPEG
    if (data[0] === 0xFF && data[1] === 0xD8) {
        return 'jpg';
    }
    // WebP
    if (data[0] === 0x52 && data[1] === 0x49 &&
        data[2] === 0x46 && data[3] === 0x46 &&
        data[8] === 0x57 && data[9] === 0x45 &&
        data[10] === 0x42 && data[11] === 0x50) {
        return 'webp';
    }
    // GIF
    if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
        return 'gif';
    }

    return 'png';  // 기본값
}

/**
 * 파일명에서 확장자 추출
 * @param {string} filename 
 * @returns {string}
 */
export function getFileExtension(filename) {
    const parts = filename.split('.');
    if (parts.length > 1) {
        return parts.pop().toLowerCase();
    }
    return '';
}

/**
 * 파일명에서 확장자 제외한 이름 추출
 * @param {string} filename 
 * @returns {string}
 */
export function getFileBasename(filename) {
    const parts = filename.split('.');
    if (parts.length > 1) {
        parts.pop();
    }
    return parts.join('.');
}

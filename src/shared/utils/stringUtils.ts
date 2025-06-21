export const FULL_WIDTH_CHARS = /[Ａ-Ｚａ-ｚ０-９＋－＊／＜＝（）]/g;

export function convertFullWidthToHalfWidth(str: string): string {
    return str.replace(FULL_WIDTH_CHARS, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    );
}

export function normalizeAndLowerCase(str: string): string {
    return convertFullWidthToHalfWidth(str).toLowerCase();
}
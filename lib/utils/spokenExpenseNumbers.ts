export function foldExpenseText(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const smallNumbers: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19,
    un: 1, unu: 1, una: 1, o: 1, doi: 2, doua: 2, trei: 3, patru: 4, cinci: 5,
    sase: 6, sapte: 7, opt: 8, noua: 9, zece: 10, unsprezece: 11, doisprezece: 12,
    douasprezece: 12, treisprezece: 13, paisprezece: 14, cincisprezece: 15, saisprezece: 16,
    saptesprezece: 17, optsprezece: 18, nouasprezece: 19,
};
const tens: Record<string, number> = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    douazeci: 20, treizeci: 30, patruzeci: 40, cincizeci: 50, saizeci: 60, saptezeci: 70,
    optzeci: 80, nouazeci: 90,
};

function wholeNumber(text: string): number | undefined {
    if (/^\d+$/.test(text)) return Number(text);
    const hundreds = text.match(/^(\w+)\s+(?:hundred|suta|sute)(?:\s+(?:(?:and|si)\s+)?(.+))?$/);
    if (hundreds) {
        const multiplier = smallNumbers[hundreds[1]];
        const remainder = hundreds[2] ? wholeNumber(hundreds[2]) : 0;
        if (multiplier > 0 && multiplier < 10 && remainder !== undefined && remainder < 100) {
            return 100 * multiplier + remainder;
        }
        return undefined;
    }
    const [word, unit, extra] = text.replace(/\s+(?:and|si)\s+|-/g, ' ').split(/\s+/);
    if (!unit) return smallNumbers[word] ?? tens[word];
    if (!extra && tens[word] && smallNumbers[unit] > 0 && smallNumbers[unit] < 10) {
        return tens[word] + smallNumbers[unit];
    }
    return undefined;
}

const spokenTerms = [...Object.keys(smallNumbers), ...Object.keys(tens)].join('|');
const underHundred = `(?:${spokenTerms})(?:(?:-|\\s+(?:and\\s+|si\\s+)?)(?:${spokenTerms}))?`;
export const spokenNumber = `(?:(?:${spokenTerms})\\s+(?:hundred|suta|sute)(?:\\s+(?:(?:and|si)\\s+)?${underHundred})?|${underHundred})`;

export function readSpokenNumber(text: string): number | undefined {
    const [whole, fraction, extra] = text.split(/\s+(?:point|virgula)\s+/);
    const integer = wholeNumber(whole);
    if (!fraction || extra || integer === undefined) return extra ? undefined : integer;
    const decimals = fraction.split(/\s+/);
    const digits = decimals.map(wholeNumber);
    if (digits.length > 1 && digits.some(digit => digit === undefined || digit > 9)) return undefined;
    if (digits[0] === undefined || digits[0] > 99) return undefined;
    const decimal = digits.join('');
    return decimal.length <= 2 ? Number(`${integer}.${decimal}`) : undefined;
}

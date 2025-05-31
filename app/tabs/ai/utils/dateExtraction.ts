
import { OCRWord, ReceiptPattern } from '../hooks/useOCR';

export const extractDateWithSpatialAwareness = (words: OCRWord[], imageWidth: number, imageHeight: number, similarReceipts: ReceiptPattern[]): string | null => {
    const layout = analyzeReceiptLayoutForDate(words, imageWidth, imageHeight);

    if (similarReceipts.length > 0) {
        const preferredRegions = similarReceipts
            .filter(r => r.layout.datePosition)
            .map(r => r.layout.datePosition!.region);

        for (const region of preferredRegions) {
            const dateInRegion = layout.dateRegions.find(d => d.region === region);
            if (dateInRegion) {
                console.log(`📅 Using learned pattern: found date in ${region} region`);
                return extractValidDate(dateInRegion.word.text);
            }
        }
    }

    const sortedDates = layout.dateRegions.sort((a, b) => b.confidence - a.confidence);
    for (const dateInfo of sortedDates) {
        const validDate = extractValidDate(dateInfo.word.text);
        if (validDate) {
            console.log(`📅 Extracted date from ${dateInfo.region}: ${validDate}`);
            return validDate;
        }
    }

    const allText = words.map(w => w.text).join(' ');
    return extractDateFromReceiptText(allText);
};

const analyzeReceiptLayoutForDate = (words: OCRWord[], imageWidth: number, imageHeight: number) => {
    const layout = {
        dateRegions: [] as Array<{ word: OCRWord; region: string; confidence: number }>
    };

    const topY = imageHeight * 0.25;
    const bottomY = imageHeight * 0.75;
    const rightX = imageWidth * 0.75;
    const leftX = imageWidth * 0.25;

    words.forEach(word => {
        const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
        const centerY = (word.bbox.y0 + word.bbox.y1) / 2;

        const datePattern = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
        if (datePattern.test(word.text)) {
            let region = 'middle';
            let confidence = 60;

            if (centerY < topY && centerX > rightX) {
                region = 'top-right';
                confidence = 95;
            } else if (centerY < topY && centerX < leftX) {
                region = 'top-left';
                confidence = 80;
            } else if (centerY > bottomY) {
                region = 'bottom';
                confidence = 85;
            }

            layout.dateRegions.push({ word, region, confidence });
        }
    });

    return layout;
};

export const extractValidDate = (dateStr: string): string | null => {
    const datePatterns = [
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})/,
        /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/
    ];

    for (const pattern of datePatterns) {
        const match = dateStr.match(pattern);
        if (match) {
            let day: number, month: number, year: number;

            if (match[3].length === 4) {
                day = parseInt(match[1]);
                month = parseInt(match[2]) - 1;
                year = parseInt(match[3]);
            } else if (match[1].length === 4) {
                year = parseInt(match[1]);
                month = parseInt(match[2]) - 1;
                day = parseInt(match[3]);
            } else {
                day = parseInt(match[1]);
                month = parseInt(match[2]) - 1;
                year = parseInt(match[3]) + (parseInt(match[3]) < 50 ? 2000 : 1900);
            }

            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000 && year <= 2030) {
                const date = new Date(year, month, day);
                if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                    const today = new Date();
                    const maxPastDays = 365;
                    const minDate = new Date(today.getTime() - maxPastDays * 24 * 60 * 60 * 1000);

                    if (date >= minDate && date <= today) {
                        return date.toISOString().split('T')[0];
                    }
                }
            }
        }
    }

    return null;
};

export const extractDateFromReceiptText = (text: string): string | null => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const datePatterns = [
        {
            pattern: /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g,
            format: 'DD/MM/YYYY'
        },
        {
            pattern: /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})/g,
            format: 'DD/MM/YY'
        },
        {
            pattern: /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g,
            format: 'YYYY/MM/DD'
        },
        {
            pattern: /(\d{1,2})[\s\-.]?(ian|feb|mar|apr|mai|iun|iul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)[\s\-.]?(\d{2,4})/gi,
            format: 'DD MON YYYY'
        }
    ];

    const timePatterns = [
        /(\d{1,2}):(\d{2}):(\d{2})/g,
        /(\d{1,2}):(\d{2})/g,
    ];

    const dateContextWords = ['data', 'date', 'timpul', 'ora', 'time', 'emitere', 'issued'];

    const searchLines = [
        ...lines.slice(0, 6),
        ...lines.slice(-6),
        ...lines.filter(line =>
            dateContextWords.some(word =>
                line.toLowerCase().includes(word)
            )
        )
    ];

    const foundDates = [];

    for (const line of searchLines) {
        console.log(`📅 Checking line for date: "${line}"`);

        for (const { pattern, format } of datePatterns) {
            pattern.lastIndex = 0;
            const matches = [...line.matchAll(pattern)];

            for (const match of matches) {
                const dateStr = match[0];
                let day, month, year;

                if (format === 'DD MON YYYY') {
                    const monthNames = {
                        'ian': 0, 'january': 0,
                        'feb': 1, 'february': 1,
                        'mar': 2, 'march': 2,
                        'apr': 3, 'april': 3,
                        'mai': 4, 'may': 4,
                        'iun': 5, 'june': 5,
                        'iul': 6, 'july': 6,
                        'aug': 7, 'august': 7,
                        'sep': 8, 'september': 8,
                        'oct': 9, 'october': 9,
                        'nov': 10, 'november': 10,
                        'dec': 11, 'december': 11
                    };

                    day = parseInt(match[1]);
                    month = monthNames[match[2].toLowerCase()];
                    year = parseInt(match[3]);

                    if (year < 100) {
                        year += year > 50 ? 1900 : 2000;
                    }
                } else {
                    const parts = dateStr.split(/[\/\-.]/);

                    if (format === 'YYYY/MM/DD') {
                        year = parseInt(parts[0]);
                        month = parseInt(parts[1]) - 1;
                        day = parseInt(parts[2]);
                    } else {
                        day = parseInt(parts[0]);
                        month = parseInt(parts[1]) - 1;
                        year = parseInt(parts[2]);

                        if (year < 100) {
                            const currentYear = new Date().getFullYear();
                            year += year <= (currentYear % 100 + 5) ? 2000 : 1900;
                        }
                    }
                }

                if (day >= 1 && day <= 31 &&
                    month >= 0 && month <= 11 &&
                    year >= 2000 && year <= 2030 &&
                    !isNaN(day) && !isNaN(month) && !isNaN(year)) {

                    const date = new Date(year, month, day);

                    if (date.getFullYear() === year &&
                        date.getMonth() === month &&
                        date.getDate() === day) {

                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        const maxPastDays = 365;
                        const minDate = new Date(today.getTime() - maxPastDays * 24 * 60 * 60 * 1000);

                        if (date >= minDate && date <= today) {
                            const isoDate = date.toISOString().split('T')[0];
                            const hasTime = timePatterns.some(tp => {
                                tp.lastIndex = 0;
                                return tp.test(line);
                            });
                            const hasContext = dateContextWords.some(word =>
                                line.toLowerCase().includes(word)
                            );

                            foundDates.push({
                                date: isoDate,
                                line: line,
                                hasTime,
                                hasContext,
                                format: format,
                                confidence: (hasTime ? 2 : 0) + (hasContext ? 1 : 0)
                            });

                            console.log(`📅 Found potential date: ${isoDate} from "${dateStr}" (${format}) - confidence: ${(hasTime ? 2 : 0) + (hasContext ? 1 : 0)}`);
                        }
                    }
                }
            }
        }
    }

    foundDates.sort((a, b) => b.confidence - a.confidence);

    if (foundDates.length > 0) {
        const bestDate = foundDates[0];
        console.log(`📅 Extracted date: ${bestDate.date} from line: "${bestDate.line}" (${bestDate.format})`);
        return bestDate.date;
    }

    console.log('📅 No valid date found in receipt, using today');
    return new Date().toISOString().split('T')[0];
};

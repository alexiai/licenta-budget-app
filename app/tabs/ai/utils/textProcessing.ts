
import { romanianToEnglish } from '../../../../lib/translationDictionary';

export const translateText = async (text: string, fromLang = 'ro', toLang = 'en'): Promise<string> => {
    if (fromLang === toLang) return text;

    try {
        if (fromLang === 'ro' && toLang === 'en') {
            let translatedText = text.toLowerCase();
            const originalText = translatedText;

            const sortedEntries = Object.entries(romanianToEnglish)
                .sort(([a], [b]) => b.length - a.length);

            sortedEntries.forEach(([ro, en]) => {
                const regex = new RegExp(`\\b${ro}\\b`, 'gi');
                if (regex.test(translatedText)) {
                    console.log(`🔄 Translation: "${ro}" → "${en}"`);
                    translatedText = translatedText.replace(regex, en);
                }
            });

            console.log(`📝 Full translation: "${text}" → "${translatedText}"`);
            return translatedText;
        }

        return text;
    } catch (error) {
        console.log('Translation error:', error);
        return text;
    }
};

export const detectLanguage = async (text: string): Promise<'ro' | 'en'> => {
    const textLower = text.toLowerCase();
    const hasRomanianChars = /[ăâîșțĂÂÎȘȚ]/.test(text);
    const romanianWords = [
        'am', 'fost', 'cheltuit', 'azi', 'ieri', 'lei', 'pentru', 'și', 'cu', 'la',
        'benzinărie', 'magazin', 'restaurant', 'cafea', 'mâncare', 'băutură',
        'chirie', 'electricitate', 'apă', 'internet', 'haine', 'doctor', 'medicament',
        'plătit', 'cost', 'costa', 'suma', 'bani', 'cheltuială', 'cheltuieli'
    ];
    const hasRomanianWords = romanianWords.some(word => textLower.includes(word));
    const englishWords = ['spent', 'paid', 'cost', 'bought', 'purchase', 'dollar', 'euro'];
    const hasEnglishWords = englishWords.some(word => textLower.includes(word));

    if (hasRomanianChars || hasRomanianWords) {
        return 'ro';
    }
    if (hasEnglishWords) {
        return 'en';
    }
    return 'ro';
};

export const getLocalizedText = (key: string, language: 'en' | 'ro' = 'ro'): string => {
    const texts = {
        amountQuestion: {
            en: 'How much did you spend? Please specify the amount.',
            ro: 'Cât ai cheltuit? Te rog să specifici suma.'
        },
        dateQuestion: {
            en: 'When did this expense occur? You can say "today", "yesterday", "3 days ago" or a specific date.',
            ro: 'Când a avut loc această cheltuială? Poți spune "azi", "ieri", "acum 3 zile" sau o dată specifică.'
        },
        categoryQuestion: {
            en: 'What category was this expense for? Choose one from the options below:',
            ro: 'Pentru ce categorie a fost această cheltuială? Alege una din opțiunile de mai jos:'
        },
        subcategoryQuestion: {
            en: 'You chose {category}. What subcategory?',
            ro: 'Ai ales {category}. Ce subcategorie?'
        },
        today: {
            en: 'Today',
            ro: 'Azi'
        },
        yesterday: {
            en: 'Yesterday',
            ro: 'Ieri'
        },
        twoDaysAgo: {
            en: '2 days ago',
            ro: 'Acum 2 zile'
        },
        oneWeekAgo: {
            en: '1 week ago',
            ro: 'Acum o săptămână'
        },
        expenseSaved: (amount: number, category: string, date: string) =>
            language === 'ro'
                ? `✅ Cheltuială salvată cu succes!\n💰 ${amount} RON pentru ${category} în data de ${date}.`
                : `✅ Expense saved successfully!\n💰 ${amount} RON for ${category} on ${date}.`,
        needMoreInfo: language === 'ro' ? 'Am nevoie de mai multe informații pentru a salva cheltuiala. Te rog să răspunzi la întrebările de mai jos.' : 'I need more information to save the expense. Please answer the questions below.',
        expenseSavedVoice: {
            en: 'Expense saved successfully!',
            ro: 'Cheltuiala a fost salvată cu succes!'
        },
        couldNotUnderstand: {
            en: 'I couldn\'t understand the expense. Could you rephrase? For example: "I spent 50 RON on coffee today"',
            ro: 'Nu am putut înțelege cheltuiala. Poți să reformulezi? De exemplu: "Am cheltuit 50 lei pe cafea azi"'
        }
    };

    return texts[key]?.[language] || texts[key]?.en || key;
};

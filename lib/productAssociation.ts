export interface ProductAssociation {
    keywords: string[];
    category: string;
    subcategory: string;
    confidence: number;
    contextKeywords?: string[]; // Keywords for context matching
}

export interface ReceiptContext {
    timestamp: Date;
    merchantName?: string;
    category?: string;
    subcategory?: string;
    amount?: number;
}

// Add Romanian context keywords
const CONTEXT_KEYWORDS = {
    timeContext: {
        recent: ['ultima', 'precedenta', 'anterioara', 'de dinainte', 'de mai devreme'],
        today: ['azi', 'astazi', 'de azi', 'din ziua asta'],
        yesterday: ['ieri', 'de ieri', 'din ziua precedenta'],
    },
    referenceContext: {
        receipt: ['bon', 'bonul', 'chitanta', 'chitanța', 'factura', 'nota', 'documentul'],
        expense: ['cheltuiala', 'plata', 'tranzactia', 'tranzacția', 'cumparaturi', 'cumpărături'],
    }
};

export const productAssociations: ProductAssociation[] = [
    // TRANSPORT - GAS/FUEL - Enhanced with more Romanian terms
    {
        keywords: [
            'benzinărie', 'benzină', 'combustibil', 'motorină', 'diesel', 'gpl', 'carburant', 
            'alimentare', 'plin', 'rezervor', 'pompă', 'staţie carburant', 'staţie peco', 
            'peco', 'petrom', 'lukoil', 'omv', 'rompetrol', 'mol', 'socar', 'plinul', 
            'alimentat', 'carburanți', 'stație', 'pompa', 'rezervorul', 'benzina'
        ],
        contextKeywords: [
            'la pompa', 'la statie', 'la peco', 'de benzina', 'de motorina',
            'plinul de combustibil', 'alimentarea', 'bonul de la benzinarie'
        ],
        category: 'Transport',
        subcategory: 'Gas',
        confidence: 95
    },

    // TRANSPORT - TAXI/RIDESHARE
    {
        keywords: ['uber', 'bolt', 'taxi', 'cursă', 'rideshare', 'transport privat', 'șofer', 'aplicație transport', 'freeNow', 'clever'],
        category: 'Transport',
        subcategory: 'Taxi',
        confidence: 90
    },

    // TRANSPORT - PUBLIC TRANSPORT
    {
        keywords: ['autobuz', 'autobus', 'bus', 'tramvai', 'tram', 'metro', 'metrou', 'STB', 'RATB', 'bilet transport', 'abonament transport', 'card transport', 'activ', 'transport public', 'stație', 'călătorie'],
        category: 'Transport',
        subcategory: 'Public Transport',
        confidence: 85
    },

    // TRANSPORT - PARKING
    {
        keywords: ['parcare', 'parking', 'parcometru', 'loc de parcare', 'garaj', 'abonament parcare', 'taxă parcare', 'parcat'],
        category: 'Transport',
        subcategory: 'Parking',
        confidence: 85
    },

    // TRANSPORT - CAR MAINTENANCE
    {
        keywords: ['service auto', 'reparații auto', 'revizie', 'schimb ulei', 'anvelope', 'cauciucuri', 'frâne', 'baterie auto', 'acumulator', 'filtru', 'bujii', 'mecanic', 'vulcanizare', 'spălătorie auto', 'car wash', 'verificare tehnică', 'itp', 'rca', 'casco', 'asigurare auto', 'rovinieta', 'taxa pod', 'taxa drum', 'amenda'],
        category: 'Transport',
        subcategory: 'Car Maintenance',
        confidence: 90
    },

    // FOOD & DRINKS - GROCERIES - Enhanced with more Romanian terms
    {
        keywords: [
            'kaufland', 'carrefour', 'mega image', 'auchan', 'lidl', 'penny', 'profi', 
            'cora', 'real', 'selgros', 'metro', 'magazin', 'supermarket', 'hipermarket', 
            'cumpărături', 'shopping', 'alimente', 'băcănie', 'market', 'lapte', 'pâine', 
            'ouă', 'brânză', 'carne', 'legume', 'fructe', 'conserve', 'cereale', 'paste', 
            'orez', 'zahăr', 'sare', 'ulei', 'unt', 'iaurt', 'smântână', 'măsline', 
            'alimentara', 'magazin alimentar', 'la magazin', 'cumparaturi'
        ],
        contextKeywords: [
            'bonul de la magazin', 'cumparaturile de la', 'de la supermarket',
            'factura de la', 'chitanta de la magazin'
        ],
        category: 'Food & Drinks',
        subcategory: 'Groceries',
        confidence: 80
    },

    // FOOD & DRINKS - RESTAURANT
    {
        keywords: ['restaurant', 'restaurante', 'cină', 'prânz', 'masă', 'mâncare', 'local', 'bistro', 'braserie', 'taverna', 'pizzerie', 'pizza', 'burger', 'hamburgeri', 'sushi', 'chinezesc', 'italian', 'mexican', 'indian', 'românesc', 'grătar', 'friptură', 'ciorbă', 'supă', 'salată', 'desert', 'înghețată', 'prăjitură', 'tort', 'bacșiș', 'chelner', 'ospătar', 'meniu', 'comandă', 'masa', 'rezervare', 'terasa'],
        category: 'Food & Drinks',
        subcategory: 'Restaurant',
        confidence: 85
    },

    // FOOD & DRINKS - COFFEE
    {
        keywords: ['cafea', 'coffee', 'espresso', 'cappuccino', 'latte', 'americano', 'macchiato', 'frappuccino', 'cafenea', 'starbucks', 'costa coffee', 'mccafe', 'cafe', 'caffe', 'kaffeehaus', 'cafeteria', 'coffee shop', 'bar', 'ceai', 'tea', 'chai', 'green tea', 'black tea', 'herbal tea'],
        category: 'Food & Drinks',
        subcategory: 'Coffee',
        confidence: 90
    },

    // FOOD & DRINKS - DRINKS
    {
        keywords: ['băutură', 'băuturi', 'suc', 'sucuri', 'coca cola', 'pepsi', 'fanta', 'sprite', 'apă', 'apă minerală', 'limonadă', 'energizant', 'red bull', 'monster', 'bere', 'beer', 'vin', 'wine', 'alcool', 'whisky', 'vodka', 'gin', 'rum', 'tequila', 'coniac', 'țuică', 'pălincă', 'rachiu', 'bar', 'club', 'discotecă', 'pub'],
        category: 'Food & Drinks',
        subcategory: 'Drinks',
        confidence: 85
    },

    // FOOD & DRINKS - FAST FOOD
    {
        keywords: ['mcdonalds', 'kfc', 'subway', 'burger king', 'pizza hut', 'dominos', 'taco bell', 'fast food', 'drive through', 'take away', 'la pachet', 'meniu', 'combo', 'happy meal', 'big mac', 'whopper', 'chicken nuggets'],
        category: 'Food & Drinks',
        subcategory: 'Fast Food',
        confidence: 95
    },

    // FOOD & DRINKS - DESSERTS/SNACKS
    {
        keywords: ['gogoașă', 'gogoasa', 'gogosi', 'gogosi', 'donut', 'donuts', 'papanași', 'papanasi', 'clătite', 'clatite', 'pancakes', 'vafe', 'waffles', 'churros', 'ecler', 'eclere', 'profiterol', 'cremșnit', 'cremsnit', 'savarina', 'cozonac', 'mucenici', 'colaci', 'covrig', 'covrigi', 'bagel', 'croissant', 'briosa', 'briose', 'muffin', 'cupcake', 'brownie', 'cookies', 'biscuit', 'înghețată', 'inghetata', 'gelato', 'desert', 'deserturi', 'dulciuri', 'bomboane', 'prăjituri', 'prajituri', 'tort', 'ciocolată', 'ciocolata'],
        category: 'Food & Drinks',
        subcategory: 'Groceries',
        confidence: 85
    },

    // FOOD & DRINKS - DELIVERY
    {
        keywords: ['foodpanda', 'glovo', 'tazz', 'uber eats', 'delivery', 'livrare', 'comandă online', 'aplicație mâncare', 'food delivery', 'la domiciliu'],
        category: 'Food & Drinks',
        subcategory: 'Delivery',
        confidence: 95
    },

    // HOUSING - RENT
    {
        keywords: ['chirie', 'închiriere', 'rent', 'apartament', 'casă', 'studio', 'garsonieră', 'cameră', 'locuință', 'proprietar', 'agenție imobiliară'],
        category: 'Housing',
        subcategory: 'Rent',
        confidence: 95
    },

    // HOUSING - UTILITIES
    {
        keywords: ['electricitate', 'electricity', 'curent', 'enel', 'electrica', 'cez', 'eon', 'energie', 'factură curent', 'contor electric'],
        category: 'Housing',
        subcategory: 'Electricity',
        confidence: 90
    },

    {
        keywords: ['apă', 'water', 'canal', 'canalizare', 'apa nova', 'aquabis', 'factură apă', 'contor apă', 'apa caldă', 'apa rece'],
        category: 'Housing',
        subcategory: 'Water',
        confidence: 90
    },

    {
        keywords: ['gaz', 'gas', 'distrigaz', 'engie', 'gaze naturale', 'factură gaz', 'contor gaz', 'încălzire'],
        category: 'Housing',
        subcategory: 'Electricity',
        confidence: 85
    },

    {
        keywords: ['internet', 'wifi', 'broadband', 'rcs rds', 'orange', 'vodafone', 'telekom', 'upc', 'digi', 'net', 'cablu', 'televiziune', 'tv', 'abonament tv', 'abonament internet'],
        category: 'Housing',
        subcategory: 'Internet',
        confidence: 90
    },

    // HOUSING - MAINTENANCE
    {
        keywords: ['reparații', 'repairs', 'maintenance', 'întreținere', 'renovare', 'zugrăveală', 'vopsea', 'pensule', 'scule', 'bricolaj', 'dedeman', 'hornbach', 'leroy merlin', 'baumax', 'materiale construcții', 'instalator', 'electrician', 'zugrav', 'tâmplar', 'parchet', 'gresie', 'faianță', 'robinete', 'chiuvete', 'prize', 'întrerupătoare'],
        category: 'Housing',
        subcategory: 'Maintenance',
        confidence: 85
    },

    // LIFESTYLE - CLOTHES
    {
        keywords: ['haine', 'clothes', 'îmbrăcăminte', 'vestimentație', 'pantaloni', 'blugi', 'jeans', 'cămașă', 'tricou', 't-shirt', 'rochie', 'dress', 'fustă', 'skirt', 'jachetă', 'jacket', 'palton', 'coat', 'pulover', 'sweater', 'bluză', 'blouse', 'costum', 'suit', 'pantofi', 'shoes', 'adidași', 'sneakers', 'sandale', 'sandals', 'cizme', 'boots', 'șosete', 'socks', 'lenjerie', 'underwear', 'sutien', 'bra', 'chiloți', 'slip', 'pijama', 'pajamas', 'șapcă', 'cap', 'pălărie', 'hat', 'h&m', 'zara', 'c&a', 'reserved', 'pull&bear', 'bershka', 'mango', 'new yorker', 'fashion days', 'about you', 'answear'],
        category: 'Lifestyle',
        subcategory: 'Clothes',
        confidence: 85
    },

    // LIFESTYLE - BEAUTY
    {
        keywords: ['frumusețe', 'beauty', 'cosmetice', 'cosmetics', 'machiaj', 'makeup', 'parfum', 'perfume', 'cremă', 'cream', 'loțiune', 'lotion', 'șampon', 'shampoo', 'balsam', 'conditioner', 'gel', 'deodorant', 'antiperspirant', 'săpun', 'soap', 'gel de duș', 'shower gel', 'pastă de dinți', 'toothpaste', 'periuță de dinți', 'toothbrush', 'fir dental', 'dental floss', 'apă de gură', 'mouthwash', 'sephora', 'douglas', 'notino', 'makeup revolution', 'maybelline', 'loreal', 'nivea', 'dove', 'pantene', 'head&shoulders', 'salon', 'coafor', 'frizer', 'manichiură', 'pedichiură', 'masaj', 'spa', 'tunsoare', 'vopsire păr', 'highlights', 'balayage', 'tratament păr', 'epilare', 'ceară', 'laser', 'botox', 'filler'],
        category: 'Lifestyle',
        subcategory: 'Beauty',
        confidence: 85
    },

    // LIFESTYLE - SPORTS
    {
        keywords: ['sport', 'sports', 'fitness', 'gym', 'sală', 'antrenament', 'workout', 'abonament sală', 'gym membership', 'antrenor', 'trainer', 'echipament sport', 'sports equipment', 'adidași sport', 'running shoes', 'tricou sport', 'sports shirt', 'pantaloni sport', 'track pants', 'world class', 'fitness one', 'my fitness', 'decathlon', 'intersport', 'sport vision', 'fotbal', 'football', 'tenis', 'tennis', 'baschet', 'basketball', 'volei', 'volleyball', 'înot', 'swimming', 'piscină', 'pool', 'yoga', 'pilates', 'crossfit', 'spinning', 'aerobic', 'zumba'],
        category: 'Lifestyle',
        subcategory: 'Sports',
        confidence: 85
    },

    // HEALTH - DOCTOR
    {
        keywords: ['doctor', 'medic', 'physician', 'consultație', 'consultation', 'cabinet medical', 'medical office', 'clinică', 'clinic', 'spital', 'hospital', 'urgență', 'emergency', 'ambulanță', 'ambulance', 'analize', 'tests', 'radiografie', 'x-ray', 'ecografie', 'ultrasound', 'rmn', 'mri', 'ct', 'ekg', 'control', 'checkup', 'medic de familie', 'family doctor', 'specialist', 'cardiolog', 'cardiologist', 'oftalmolog', 'ophthalmologist', 'dermatolog', 'dermatologist', 'neurolog', 'neurologist', 'ginecolog', 'gynecologist', 'urolog', 'urologist', 'ortopedie', 'orthopedics', 'psihiatru', 'psychiatrist', 'psiholog', 'psychologist'],
        category: 'Health',
        subcategory: 'Doctor',
        confidence: 90
    },

    // HEALTH - MEDICATION
    {
        keywords: ['medicament', 'medication', 'medicamente', 'medications', 'pastile', 'pills', 'comprimate', 'tablets', 'capsule', 'capsules', 'sirop', 'syrup', 'pomadă', 'ointment', 'cremă medicală', 'medical cream', 'antibiotice', 'antibiotics', 'analgezice', 'painkillers', 'vitamina', 'vitamin', 'vitamine', 'vitamins', 'supliment', 'supplement', 'suplimente', 'supplements', 'farmacie', 'pharmacy', 'catena', 'help net', 'dr max', 'farmacia tei', 'sensiblu', 'dona', 'rețetă', 'prescription', 'prescripție', 'otc', 'over the counter', 'paracetamol', 'ibuprofen', 'aspirin', 'nurofen', 'algocalmin', 'parasinus'],
        category: 'Health',
        subcategory: 'Medication',
        confidence: 90
    },

    // HEALTH - DENTIST
    {
        keywords: ['dentist', 'stomatolog', 'dental', 'dinți', 'teeth', 'tooth', 'dinte', 'cabinet stomatologic', 'dental office', 'detartraj', 'cleaning', 'plombă', 'filling', 'coroană', 'crown', 'implanturi', 'implants', 'extractie', 'extraction', 'carie', 'cavity', 'aparat dentar', 'braces', 'ortodonție', 'orthodontics', 'proteză dentară', 'denture', 'radiografie dentară', 'dental x-ray'],
        category: 'Health',
        subcategory: 'Dentist',
        confidence: 95
    },

    // ENTERTAINMENT - MOVIES
    {
        keywords: ['cinema', 'movies', 'filme', 'film', 'cinematograf', 'cinema city', 'hollywood multiplex', 'mall cinema', 'bilet cinema', 'movie ticket', 'popcorn', 'nachos', 'theater', 'teatru', 'spectacol', 'show', 'performance', 'operă', 'opera', 'balet', 'ballet', 'concert', 'muzică', 'music', 'bilet spectacol', 'show ticket'],
        category: 'Entertainment',
        subcategory: 'Movies',
        confidence: 85
    },

    // ENTERTAINMENT - GAMES
    {
        keywords: ['jocuri', 'games', 'gaming', 'video games', 'console', 'playstation', 'ps4', 'ps5', 'xbox', 'nintendo', 'switch', 'pc gaming', 'steam', 'epic games', 'origin', 'uplay', 'battle.net', 'game pass', 'psn', 'live gold', 'fifa', 'pes', 'call of duty', 'gta', 'minecraft', 'fortnite', 'apex legends', 'wow', 'league of legends', 'dota', 'csgo', 'valorant', 'headset', 'controller', 'joystick', 'mouse gaming', 'tastatură gaming'],
        category: 'Entertainment',
        subcategory: 'Games',
        confidence: 85
    },

    // ENTERTAINMENT - STREAMING
    {
        keywords: ['netflix', 'amazon prime', 'disney+', 'hbo max', 'spotify', 'apple music', 'youtube premium', 'deezer', 'tidal', 'abonament streaming', 'streaming subscription', 'video on demand', 'vod', 'music streaming', 'podcasts'],
        category: 'Entertainment',
        subcategory: 'Streaming',
        confidence: 95
    },

    // MISCELLANEOUS - GIFTS
    {
        keywords: ['cadou', 'cadouri', 'gift', 'gifts', 'present', 'birthday', 'zi de naștere', 'aniversare', 'crăciun', 'christmas', 'paște', 'easter', 'valentine', 'ziua îndrăgostiților', 'flowers', 'flori', 'buchete', 'bouquet', 'bijuterii', 'jewelry', 'ceas', 'watch', 'parfum cadou', 'gift perfume'],
        category: 'Other',
        subcategory: 'Gifts',
        confidence: 85
    },

    // EDUCATION
    {
        keywords: ['școală', 'school', 'universitate', 'university', 'facultate', 'faculty', 'colegiu', 'college', 'curs', 'course', 'lecție', 'lesson', 'carte', 'book', 'cărți', 'books', 'manual', 'textbook', 'caiet', 'notebook', 'rechizite', 'school supplies', 'stilou', 'pen', 'creion', 'pencil', 'gumă', 'eraser', 'riglă', 'ruler', 'ghiozdan', 'backpack', 'librărie', 'bookstore', 'humanitas', 'carturesti', 'diverta', 'elefant.ro', 'emag carti'],
        category: 'Other',
        subcategory: 'Miscellaneous',
        confidence: 75
    },

    // PET CARE
    {
        keywords: ['câine', 'dog', 'pisică', 'cat', 'animal de companie', 'pet', 'veterinar', 'vet', 'hrană pentru animale', 'pet food', 'whiskas', 'pedigree', 'royal canin', 'hills', 'brit', 'jucării pentru animale', 'pet toys', 'lesă', 'leash', 'cușcă', 'cage', 'litieră', 'litter', 'vaccin', 'vaccine', 'deparazitare', 'deworming', 'sterilizare', 'spaying', 'dresaj', 'training'],
        category: 'Other',
        subcategory: 'Miscellaneous',
        confidence: 80
    }
];

export const findCategoryByProduct = (text: string): { category: string; subcategory: string; confidence: number } | null => {
    const textLower = text.toLowerCase();

    // Sort by confidence (highest first)
    const sortedAssociations = productAssociations.sort((a, b) => b.confidence - a.confidence);

    for (const association of sortedAssociations) {
        const foundKeyword = association.keywords.find(keyword =>
            textLower.includes(keyword.toLowerCase())
        );

        if (foundKeyword) {
            console.log(`🎯 Product association found: "${foundKeyword}" → ${association.category} (${association.subcategory}) - confidence: ${association.confidence}%`);
            return {
                category: association.category,
                subcategory: association.subcategory,
                confidence: association.confidence
            };
        }
    }

    return null;
};

// Add context-aware search function
export const findCategoryByContext = (
    text: string,
    recentReceipts: ReceiptContext[],
    maxAge: number = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
): { category: string; subcategory: string; confidence: number } | null => {
    const textLower = text.toLowerCase();
    const now = new Date();

    // Check for time context references
    const hasRecentReference = CONTEXT_KEYWORDS.timeContext.recent.some(kw => textLower.includes(kw));
    const hasTodayReference = CONTEXT_KEYWORDS.timeContext.today.some(kw => textLower.includes(kw));
    const hasYesterdayReference = CONTEXT_KEYWORDS.timeContext.yesterday.some(kw => textLower.includes(kw));

    // Check for receipt/expense references
    const hasReceiptReference = CONTEXT_KEYWORDS.referenceContext.receipt.some(kw => textLower.includes(kw));
    const hasExpenseReference = CONTEXT_KEYWORDS.referenceContext.expense.some(kw => textLower.includes(kw));

    if (hasRecentReference || hasTodayReference || hasYesterdayReference) {
        // Filter receipts by time context
        const relevantReceipts = recentReceipts.filter(receipt => {
            const age = now.getTime() - receipt.timestamp.getTime();
            if (hasYesterdayReference) {
                const isYesterday = new Date(receipt.timestamp).toDateString() === 
                    new Date(now.setDate(now.getDate() - 1)).toDateString();
                return isYesterday;
            }
            if (hasTodayReference) {
                const isToday = new Date(receipt.timestamp).toDateString() === new Date().toDateString();
                return isToday;
            }
            return age <= maxAge;
        });

        // Try to match with recent receipts
        for (const receipt of relevantReceipts) {
            if (receipt.category && receipt.subcategory) {
                // Look for category-specific context keywords
                const categoryAssociation = productAssociations.find(
                    assoc => assoc.category === receipt.category && 
                            assoc.subcategory === receipt.subcategory
                );

                if (categoryAssociation?.contextKeywords?.some(kw => textLower.includes(kw))) {
                    return {
                        category: receipt.category,
                        subcategory: receipt.subcategory,
                        confidence: 90
                    };
                }
            }
        }
    }

    // Fall back to regular keyword matching
    return findCategoryByProduct(text);
};

export default productAssociations;

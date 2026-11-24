import { classifyExpenseText, detectExpenseLanguage, parseChatExpense, translateExpenseVocabulary } from '../lib/utils/chatExpense';
import { extractExpenseAmount, extractExpenseDate } from '../lib/utils/chatExpenseParsing';

const today = new Date(2026, 10, 24, 12);

const cases = [
    ['en', 'Add 35 RON for groceries today', 35, 'Food & Drinks', 'Groceries', '2026-11-24'],
    ['en', 'Spent 18 RON on coffee yesterday.', 18, 'Food & Drinks', 'Coffee', '2026-11-23'],
    ['en', 'I paid 21 RON for an Uber', 21, 'Transport', 'Taxi', '2026-11-24'],
    ['en', '35 for a subway ticket', 35, 'Transport', 'Public Transport', '2026-11-24'],
    ['en', 'Paid 50 RON for gasoline last week', 50, 'Transport', 'Gas', '2026-11-17'],
    ['en', 'Spent 24.90 RON on bottled water', 24.9, 'Food & Drinks', 'Drinks', '2026-11-24'],
    ['en', 'Paid 104 RON for the water bill on 12 November', 104, 'Housing', 'Water', '2026-11-12'],
    ['en', 'Paid 1,250.50 RON for rent on 2026-11-01', 1250.5, 'Housing', 'Rent', '2026-11-01'],
    ['en', 'I paid 46 RON for a movie ticket three days ago', 46, 'Entertainment', 'Movies', '2026-11-21'],
    ['en', 'Paid 150 RON for a gym membership', 150, 'Lifestyle', 'Gym', '2026-11-24'],
    ['en', 'Add 49 RON for streaming subscription', 49, 'Entertainment', 'Streaming', '2026-11-24'],
    ['en', 'Spent 87 RON on prescription medicine', 87, 'Health', 'Medication', '2026-11-24'],
    ['en', 'Paid 220 RON for a dental appointment on 2/11/2026', 220, 'Health', 'Dentist', '2026-11-02'],
    ['en', 'Add 25 RON for a charity donation', 25, 'Other', 'Donations', '2026-11-24'],
    ['en', 'Paid 25 RON for a bank fee', 25, 'Other', 'Fees', '2026-11-24'],
    ['en', 'Add 200 RON for my emergency fund', 200, 'Savings', 'Emergency Fund', '2026-11-24'],
    ['ro', 'Am plătit 35 lei pentru cumpărături azi', 35, 'Food & Drinks', 'Groceries', '2026-11-24'],
    ['ro', 'Am platit 12,50 lei pentru cafea ieri', 12.5, 'Food & Drinks', 'Coffee', '2026-11-23'],
    ['ro', 'Am cheltuit 32 de lei pe taxi azi', 32, 'Transport', 'Taxi', '2026-11-24'],
    ['ro', '14 lei pe bilet de autobuz ieri', 14, 'Transport', 'Public Transport', '2026-11-23'],
    ['ro', 'Am platit 55 lei la benzinarie acum două zile', 55, 'Transport', 'Gas', '2026-11-22'],
    ['ro', '45 lei la parcare acum două săptămâni', 45, 'Transport', 'Parking', '2026-11-10'],
    ['ro', 'Am achitat 1.850,75 lei chirie pe 02.11.2026', 1850.75, 'Housing', 'Rent', '2026-11-02'],
    ['ro', 'Am achitat 44 lei factura de net', 44, 'Housing', 'Internet', '2026-11-24'],
    ['ro', 'Am platit 96 lei factura la apă', 96, 'Housing', 'Water', '2026-11-24'],
    ['ro', '32 de lei la farmacia tei azi', 32, 'Health', 'Medication', '2026-11-24'],
    ['ro', 'Am platit 250 lei asigurare de sanatate pe 3 noiembrie', 250, 'Health', 'Health Insurance', '2026-11-03'],
    ['ro', 'Am cheltuit 110 lei pe abonament la sala', 110, 'Lifestyle', 'Gym', '2026-11-24'],
    ['ro', 'Am plătit 27 lei pentru bilet la film', 27, 'Entertainment', 'Movies', '2026-11-24'],
    ['ro', 'Am platit 18 lei comision bancar ieri', 18, 'Other', 'Fees', '2026-11-23'],
    ['ro', 'Am dat 50 lei pentru o donatie caritabila', 50, 'Other', 'Donations', '2026-11-24'],
    ['ro', '150 lei fond de urgență', 150, 'Savings', 'Emergency Fund', '2026-11-24'],
] as const;

test.each(cases)('%s chat: %s', (language, message, amount, category, subcategory, date) => {
    expect(detectExpenseLanguage(message)).toBe(language);
    expect(parseChatExpense(message, today)).toEqual({ amount, category, subcategory, date, note: message });
});

const transcripts = [
    ['I spent twenty-five RON on coffee yesterday', 25, 'Coffee', '2026-11-23'],
    ['Paid thirty RON for a taxi today', 30, 'Taxi', '2026-11-24'],
    ['I spent five point zero five RON for a bus ticket', 5.05, 'Public Transport', '2026-11-24'],
    ['Spent eighteen RON on groceries two days ago', 18, 'Groceries', '2026-11-22'],
    ['I paid forty two RON for a movie ticket one week ago', 42, 'Movies', '2026-11-17'],
    ['I paid one hundred and twenty-five RON for a gym membership', 125, 'Gym', '2026-11-24'],
    ['I paid ninety nine RON for a gym membership', 99, 'Gym', '2026-11-24'],
    ['Am plătit douăzeci și cinci de lei pe cafea ieri', 25, 'Coffee', '2026-11-23'],
    ['Am cheltuit treizeci de lei pe taxi azi', 30, 'Taxi', '2026-11-24'],
    ['Am platit opt lei pentru metrou acum trei zile', 8, 'Public Transport', '2026-11-21'],
    ['Am dat șapte virgulă cinci lei pe cafea', 7.5, 'Coffee', '2026-11-24'],
    ['Am plătit doisprezece lei la supermarket acum o zi', 12, 'Groceries', '2026-11-23'],
    ['Am platit doua sute treizeci si cinci de lei pe chirie', 235, 'Rent', '2026-11-24'],
    ['Am platit saizeci si sase de lei pe abonament la sala', 66, 'Gym', '2026-11-24'],
] as const;

test.each(transcripts)('simulated transcript: %s', (text, amount, subcategory, date) => {
    expect(parseChatExpense(text, today)).toMatchObject({ amount, subcategory, date });
});

test.each([
    'Paid -25 lei', 'Spent −25 RON', 'paid minus twenty five RON', 'Paid 0 RON', '0,00 lei',
    'I spent 25 EUR', 'Paid 25 dollars', '£33 for groceries', '12 USD', '35 CHF', '€20 and 30 RON',
    'Spent 12 RON on coffee and 18 RON on lunch', 'Spent 12 on coffee and 18 on lunch', 'douăzeci de lei și 8 RON',
    'Coffee on 2026-11-19', 'coffee three days ago', 'acum trei zile la farmacie',
    'Hello there', '24,9999 lei', '10 units of coffee', 'paid 0 for groceries',
])('requires a valid single lei amount: %s', text => {
    expect(extractExpenseAmount(text)).toBeUndefined();
});

test.each([
    ['12 noiembrie', '2026-11-12'], ['12 November', '2026-11-12'], ['23.11.2026', '2026-11-23'],
    ['2026-11-23', '2026-11-23'], ['31/11/2026', null], ['2025-02-29', null], ['29/02/2024', '2024-02-29'],
    ['November 12th, 2026', '2026-11-12'], ['the day before yesterday', '2026-11-22'],
    ['alaltăieri', '2026-11-22'], ['mâine', '2026-11-25'], ['tomorrow', '2026-11-25'],
    ['săptămâna viitoare', '2026-12-01'], ['yesterday', '2026-11-23'], ['ieri', '2026-11-23'], ['luni', '2026-11-23'],
    ['two weeks ago', '2026-11-10'], ['acum o luna', '2026-10-24'], ['supermarket', undefined],
])('validates date vocabulary and boundaries: %s', (text, expected) => {
    expect(extractExpenseDate(text, today)).toBe(expected);
});

test.each([
    ['factura de net', 'internet bill'], ['FACTURA LA APĂ', 'water bill'],
    ['abonaMENT LA SALA', 'gym membership'], ['cafea la pachet', 'takeaway coffee'],
    ['cumpărături', 'groceries'], ['cumpărăturile săptămânale', 'groceries'],
    ['comision bancar', 'bank fee'], ['consultatie la dentist', 'dental appointment'],
    ['bilet de autobuz', 'bus ticket'], ['donatie caritabila', 'charity donation'],
])('translates whole Romanian vocabulary phrases: %s', (input, expected) => {
    expect(translateExpenseVocabulary(input)).toBe(expected);
});

test.each(['spent 25 for unspecified', 'hello', 'card repayment reference 339'])('leaves ambiguous category for the user: %s', text => {
    expect(classifyExpenseText(text)).toBeNull();
});

test.each([['twenty-five', 25], ['douăzeci și cinci', 25], ['one hundred and five', 105], ['o sută', 100]])(
    'accepts a dictated answer to the amount question: %s', (text, expected) => {
        expect(extractExpenseAmount(text)).toBe(expected);
    },
);

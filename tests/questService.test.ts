import QuestService from '../lib/services/QuestService';
import { generateSpendingAnalysis } from '../components/bunnyAssistant/analysisUtils';

import { runTransaction } from 'firebase/firestore';

const mockRecords = new Map<string, Record<string, unknown>>();
let mockQueue = Promise.resolve();
const mockSnapshot = (path: string) => ({
    id: path.split('/').pop(),
    exists: () => mockRecords.has(path),
    data: () => mockRecords.get(path),
});
jest.mock('@lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    collection: (_: unknown, name: string) => name,
    doc: (collection: string, id: string) => `${collection}/${id}`,
    where: (_: string, __: string, value: string) => value,
    query: (collection: string, user: string) => ({ collection, user }),
    getDoc: async (path: string) => mockSnapshot(path),
    getDocs: async ({ collection, user }: { collection: string; user: string }) => ({
        docs: [...mockRecords].filter(([path, data]) => path.startsWith(`${collection}/`) && data.userId === user)
            .map(([path]) => mockSnapshot(path)),
    }),
    runTransaction: jest.fn((_: unknown, work: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const result = mockQueue.then(async () => {
            const changes = new Map<string, Record<string, unknown>>();
            const transaction = {
                get: async (path: string) => mockSnapshot(path),
                set: (path: string, data: Record<string, unknown>) => changes.set(path, data),
                update: (path: string, data: Record<string, unknown>) => changes.set(path, { ...mockRecords.get(path), ...data }),
            };
            const value = await work(transaction);
            for (const [path, data] of changes) mockRecords.set(path, data);
            return value;
        });
        mockQueue = result.then(() => {}, () => {});
        return result;
    }),
}));

const user = 'active-bunny';
const another = 'other-bunny';
const firstDay = new Date(2026, 10, 24, 12);
const records = [{
    id: 'first-expense', amount: 23, category: 'Transport', subcategory: 'Taxi',
    userId: user, date: '2026-11-24',
}];
const empty = generateSpendingAnalysis([], firstDay);

beforeEach(() => {
    mockRecords.clear();
    jest.mocked(runTransaction).mockClear();
    jest.useFakeTimers().setSystemTime(firstDay);
    mockRecords.set('expenses/first-expense', records[0]);
});
afterEach(() => jest.useRealTimers());

test('opening quests twice preserves the same daily, weekly, and monthly records', async () => {
    const results = await Promise.all([
        QuestService.generateQuests(user, empty, records),
        QuestService.generateQuests(user, empty, records),
    ]);
    expect(results[0].map(quest => quest.id)).toEqual(results[1].map(quest => quest.id));
    expect([...mockRecords.keys()].filter(path => path.startsWith('quests/'))).toHaveLength(3);
});

test('a quest cannot be claimed before the period ends or by a different user', async () => {
    const [daily] = await QuestService.generateQuests(user, empty, records);
    await expect(QuestService.claimQuestReward(user, daily.id)).rejects.toThrow('not eligible');
    await expect(QuestService.claimQuestReward(another, daily.id)).rejects.toThrow('another user');
    expect((await QuestService.getUserProgress(user)).totalPoints).toBe(0);
});

test('reward claims recheck edited expenses and concurrent requests credit once', async () => {
    const [daily] = await QuestService.generateQuests(user, empty, records);
    jest.setSystemTime(new Date(2026, 10, 25, 12));
    mockRecords.delete('expenses/first-expense');
    await expect(QuestService.claimQuestReward(user, daily.id)).rejects.toThrow('not eligible');
    mockRecords.set('expenses/first-expense', records[0]);
    const [first, second] = await Promise.all([
        QuestService.claimQuestReward(user, daily.id), QuestService.claimQuestReward(user, daily.id),
    ]);
    expect(first).toEqual(second);
    expect(second).toMatchObject({ totalPoints: 50, questsCompleted: 1, badges: [{ id: 'first-hop' }] });
    expect(mockRecords.get(`quests/${daily.id}`)?.status).toBe('claimed');
});

test('refreshing an existing period with edited expenses skips write transactions', async () => {
    await QuestService.generateQuests(user, empty, records);
    expect(runTransaction).toHaveBeenCalledTimes(1);
    const refreshed = await QuestService.generateQuests(user, empty, []);
    expect(refreshed).toHaveLength(3);
    expect(refreshed[0].progress).toBe(0);
    expect(runTransaction).toHaveBeenCalledTimes(1);
});

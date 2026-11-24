/** @jest-environment node */
const axios = require('axios');
const app = require('../server');

jest.mock('axios');
let server;
let base;
beforeAll(async () => {
    await new Promise((resolve, reject) => {
        server = app.listen(0, '127.0.0.1', resolve);
        server.once('error', reject);
    });
    base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
});
beforeEach(() => axios.post.mockReset());

test('health route returns a usable JSON status', async () => {
    const response = await fetch(`${base}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
});

test('bank catalogue works independently of provider credentials', async () => {
    const response = await fetch(`${base}/api/banks`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'Banca Transilvania' }),
    ]));
    expect(axios.post).not.toHaveBeenCalled();
});

test('bank linking validates input and cleanly handles unavailable credentials', async () => {
    for (const [body, expected] of [[{}, 400], [{ institution_id: 'TEST_BANK' }, 503]]) {
        const response = await fetch(`${base}/api/connect-gocardless`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        expect(response.status).toBe(expected);
    }
    expect(axios.post).not.toHaveBeenCalled();
});

function upload(mime, size = 10) {
    const body = new FormData();
    body.append('file', new Blob([Buffer.alloc(size)], { type: mime }), 'receipt.jpg');
    return fetch(`${base}/api/ocr`, { method: 'POST', body });
}

test('OCR validates missing, unsupported, and oversized uploads', async () => {
    expect((await fetch(`${base}/api/ocr`, { method: 'POST', body: new FormData() })).status).toBe(400);
    expect((await upload('text/plain')).status).toBe(400);
    expect((await upload('image/jpeg', 5 * 1024 * 1024 + 1)).status).toBe(413);
    expect(axios.post).not.toHaveBeenCalled();
});

test('OCR forwards a supported upload and returns the provider receipt', async () => {
    const result = { receipts: [{ total: '42.50', currency: 'RON' }] };
    axios.post.mockResolvedValueOnce({ data: result });
    const response = await upload('image/jpeg');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('asprise'), expect.anything(),
        expect.objectContaining({ timeout: 30000 }));
});

test('OCR returns a gateway timeout when the provider times out', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        axios.post.mockRejectedValueOnce(Object.assign(new Error('timed out'), { code: 'ECONNABORTED' }));
        expect((await upload('image/png')).status).toBe(504);
    } finally {
        log.mockRestore();
    }
});

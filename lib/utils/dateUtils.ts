export function parseDateInput(dateStr: string): Date | null {
    // Expected format: dd/mm/yyyy
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // months are 0-based
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 0 || month > 11) return null;
    if (year < 1900 || year > 2100) return null;

    const date = new Date(year, month, day);
    return date;
}

export function formatDateToDDMMYYYY(dateInput: string | Date): string {
    let date: Date;
    if (typeof dateInput === 'string') {
        // Try to parse as ISO or YYYY-MM-DD
        if (dateInput.includes('T')) {
            date = new Date(dateInput);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const [year, month, day] = dateInput.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
            // Already dd/mm/yyyy
            return dateInput;
        } else {
            date = new Date(dateInput);
        }
    } else {
        date = dateInput;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export function toISODateString(dateInput: string | Date): string {
    if (typeof dateInput === 'string') {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
            const [day, month, year] = dateInput.split('/').map(Number);
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return dateInput;
        } else {
            const date = new Date(dateInput);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
    } else {
        const date = dateInput;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
} 
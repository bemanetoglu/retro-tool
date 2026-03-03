/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCommonJS() {
  const code = fs.readFileSync(path.join(__dirname, 'common.js'), 'utf8');
  vm.runInThisContext(code, { filename: 'common.js' });
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.clear();
  window.tr = undefined;
  window.en = undefined;
  window.RetroToolCommon = undefined;

  loadCommonJS();
});

// ============================================================
// Validation Functions
// ============================================================
describe('validateInput', () => {
  const { validateInput } = window.RetroToolCommon;

  test('should accept valid input within default range', () => {
    expect(validateInput('hello')).toBe(true);
  });

  test('should reject null input', () => {
    expect(validateInput(null)).toBe(false);
  });

  test('should reject undefined input', () => {
    expect(validateInput(undefined)).toBe(false);
  });

  test('should reject empty string', () => {
    expect(validateInput('')).toBe(false);
  });

  test('should reject whitespace-only string', () => {
    expect(validateInput('   ')).toBe(false);
  });

  test('should respect custom minLength', () => {
    expect(validateInput('ab', 3)).toBe(false);
    expect(validateInput('abc', 3)).toBe(true);
  });

  test('should respect custom maxLength', () => {
    expect(validateInput('abcde', 1, 4)).toBe(false);
    expect(validateInput('abcd', 1, 4)).toBe(true);
  });

  test('should trim whitespace before validation', () => {
    expect(validateInput('  ab  ', 2, 10)).toBe(true);
    expect(validateInput('  a  ', 2, 10)).toBe(false);
  });
});

describe('validateRoomCode', () => {
  const { validateRoomCode } = window.RetroToolCommon;

  test('should accept valid 6-digit codes', () => {
    expect(validateRoomCode('123456')).toBe(true);
    expect(validateRoomCode('000000')).toBe(true);
    expect(validateRoomCode('999999')).toBe(true);
  });

  test('should reject codes shorter than 6 digits', () => {
    expect(validateRoomCode('12345')).toBe(false);
    expect(validateRoomCode('1')).toBe(false);
  });

  test('should reject codes longer than 6 digits', () => {
    expect(validateRoomCode('1234567')).toBe(false);
  });

  test('should reject non-numeric codes', () => {
    expect(validateRoomCode('abcdef')).toBe(false);
    expect(validateRoomCode('12345a')).toBe(false);
    expect(validateRoomCode('12 345')).toBe(false);
  });

  test('should reject empty or null', () => {
    expect(validateRoomCode('')).toBe(false);
    expect(validateRoomCode(null)).toBe(false);
    expect(validateRoomCode(undefined)).toBe(false);
  });
});

describe('validateUsername', () => {
  const { validateUsername } = window.RetroToolCommon;

  test('should accept valid alphanumeric usernames', () => {
    expect(validateUsername('Ali')).toBe(true);
    expect(validateUsername('User 123')).toBe(true);
    expect(validateUsername('AB')).toBe(true);
  });

  test('should accept Turkish characters', () => {
    expect(validateUsername('Çağrı')).toBe(true);
    expect(validateUsername('Güneş')).toBe(true);
    expect(validateUsername('Şükrü')).toBe(true);
    expect(validateUsername('İlker')).toBe(true);
    expect(validateUsername('Ömer')).toBe(true);
  });

  test('should reject too short usernames (< 2 chars)', () => {
    expect(validateUsername('A')).toBe(false);
    expect(validateUsername('')).toBe(false);
  });

  test('should reject too long usernames (> 20 chars)', () => {
    expect(validateUsername('A'.repeat(21))).toBe(false);
  });

  test('should accept max length username (20 chars)', () => {
    expect(validateUsername('A'.repeat(20))).toBe(true);
  });

  test('should reject special characters', () => {
    expect(validateUsername('user@name')).toBe(false);
    expect(validateUsername('user!name')).toBe(false);
    expect(validateUsername('user#name')).toBe(false);
    expect(validateUsername('<script>')).toBe(false);
  });
});

// ============================================================
// Sanitization
// ============================================================
describe('sanitizeHTML', () => {
  const { sanitizeHTML } = window.RetroToolCommon;

  test('should escape HTML tags', () => {
    expect(sanitizeHTML('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitizeHTML('<b>bold</b>')).not.toContain('<b>');
  });

  test('should escape special characters', () => {
    const result = sanitizeHTML('a < b & c > d');
    expect(result).toContain('&lt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&gt;');
  });

  test('should preserve plain text', () => {
    expect(sanitizeHTML('Hello World')).toBe('Hello World');
  });

  test('should handle empty string', () => {
    expect(sanitizeHTML('')).toBe('');
  });

  test('should escape quotes', () => {
    const result = sanitizeHTML('say "hello"');
    expect(result).toContain('hello');
  });
});

// ============================================================
// Time Formatting
// ============================================================
describe('formatTimeRemaining', () => {
  const { formatTimeRemaining } = window.RetroToolCommon;

  test('should return empty string for 0 milliseconds', () => {
    expect(formatTimeRemaining(0)).toBe('');
  });

  test('should return empty string for negative milliseconds', () => {
    expect(formatTimeRemaining(-1000)).toBe('');
  });

  test('should return empty string for null', () => {
    expect(formatTimeRemaining(null)).toBe('');
  });

  test('should return empty string for undefined', () => {
    expect(formatTimeRemaining(undefined)).toBe('');
  });

  test('should format minutes and seconds correctly', () => {
    const result = formatTimeRemaining(90000); // 1 min 30 sec
    expect(result).toContain('1:30');
  });

  test('should pad seconds with leading zero', () => {
    const result = formatTimeRemaining(65000); // 1 min 5 sec
    expect(result).toContain('1:05');
  });

  test('should show seconds only when under 1 minute', () => {
    const result = formatTimeRemaining(45000); // 45 sec
    expect(result).toContain('45s');
  });

  test('should format exact minutes', () => {
    const result = formatTimeRemaining(300000); // 5 min 0 sec
    expect(result).toContain('5:00');
  });
});

// ============================================================
// Modal Functions
// ============================================================
describe('Modal functions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="errorModal" class="modal" style="display:none">
        <span id="errorMessage"></span>
      </div>
      <div id="testModal" class="modal" style="display:none"></div>
      <div id="successModal" class="modal" style="display:none"></div>
    `;
  });

  test('showError should display error modal with message', () => {
    window.RetroToolCommon.showError('Test error');
    expect(document.getElementById('errorModal').style.display).toBe('block');
    expect(document.getElementById('errorMessage').textContent).toBe('Test error');
  });

  test('showModal should display the target modal', () => {
    window.RetroToolCommon.showModal('testModal');
    expect(document.getElementById('testModal').style.display).toBe('block');
  });

  test('closeModal should hide the target modal', () => {
    document.getElementById('testModal').style.display = 'block';
    window.RetroToolCommon.closeModal('testModal');
    expect(document.getElementById('testModal').style.display).toBe('none');
  });

  test('showModal should not throw for non-existent modal', () => {
    expect(() => window.RetroToolCommon.showModal('nonExistent')).not.toThrow();
  });

  test('closeModal should not throw for non-existent modal', () => {
    expect(() => window.RetroToolCommon.closeModal('nonExistent')).not.toThrow();
  });
});

// ============================================================
// Loading State
// ============================================================
describe('showLoading', () => {
  test('should disable button and change text', () => {
    const button = document.createElement('button');
    button.textContent = 'Submit';

    const restore = window.RetroToolCommon.showLoading(button);

    expect(button.disabled).toBe(true);
    expect(button.textContent).not.toBe('Submit');

    restore();

    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Submit');
  });
});

// ============================================================
// Success Message
// ============================================================
describe('showSuccess', () => {
  test('should append success message to body', () => {
    window.RetroToolCommon.showSuccess('Operation completed');

    const successDiv = document.querySelector('.success-message');
    expect(successDiv).not.toBeNull();
    expect(successDiv.textContent).toBe('Operation completed');
  });

  test('should auto-remove after timeout', () => {
    jest.useFakeTimers();

    window.RetroToolCommon.showSuccess('Temp message');
    expect(document.querySelector('.success-message')).not.toBeNull();

    jest.advanceTimersByTime(3100);
    expect(document.querySelector('.success-message')).toBeNull();

    jest.useRealTimers();
  });
});

// ============================================================
// URL Parsing
// ============================================================
describe('getCurrentRoomCode', () => {
  test('should extract room code from /room/123456', () => {
    delete window.location;
    window.location = { pathname: '/room/123456' };
    expect(window.RetroToolCommon.getCurrentRoomCode()).toBe('123456');
  });

  test('should extract room code from /join/654321', () => {
    delete window.location;
    window.location = { pathname: '/join/654321' };
    expect(window.RetroToolCommon.getCurrentRoomCode()).toBe('654321');
  });

  test('should return null for unrelated paths', () => {
    delete window.location;
    window.location = { pathname: '/' };
    expect(window.RetroToolCommon.getCurrentRoomCode()).toBeNull();
  });

  test('should return null for invalid room codes in path', () => {
    delete window.location;
    window.location = { pathname: '/room/abc' };
    expect(window.RetroToolCommon.getCurrentRoomCode()).toBeNull();
  });
});

// ============================================================
// LocalStorage Functions
// ============================================================
describe('LocalStorage functions', () => {
  test('setRoomCreator and isRoomCreator', () => {
    window.RetroToolCommon.setRoomCreator(true);
    expect(window.RetroToolCommon.isRoomCreator()).toBe(true);

    window.RetroToolCommon.setRoomCreator(false);
    expect(window.RetroToolCommon.isRoomCreator()).toBe(false);
  });

  test('storeUsername and getStoredUsername', () => {
    window.RetroToolCommon.storeUsername('TestUser');
    expect(window.RetroToolCommon.getStoredUsername()).toBe('TestUser');
  });

  test('clearStoredData removes username and creator status', () => {
    window.RetroToolCommon.storeUsername('TestUser');
    window.RetroToolCommon.setRoomCreator(true);

    window.RetroToolCommon.clearStoredData();

    expect(window.RetroToolCommon.getStoredUsername()).toBeNull();
    expect(window.RetroToolCommon.isRoomCreator()).toBe(false);
  });

  test('getStoredUsername returns null when not set', () => {
    expect(window.RetroToolCommon.getStoredUsername()).toBeNull();
  });
});

// ============================================================
// Language / i18n
// ============================================================
describe('getText', () => {
  test('should return default text when no translations loaded', () => {
    expect(window.RetroToolCommon.getText('loading', 'Yükleniyor...')).toBe('Yükleniyor...');
  });

  test('should return key when no default and no translation', () => {
    expect(window.RetroToolCommon.getText('non_existent_key')).toBe('non_existent_key');
  });
});

describe('availableLanguages', () => {
  test('should contain 4 languages', () => {
    const langs = window.RetroToolCommon.availableLanguages;
    expect(Object.keys(langs)).toEqual(['tr', 'en', 'de', 'es']);
  });

  test('should have correct language names', () => {
    const langs = window.RetroToolCommon.availableLanguages;
    expect(langs.tr).toBe('Türkçe');
    expect(langs.en).toBe('English');
    expect(langs.de).toBe('Deutsch');
    expect(langs.es).toBe('Español');
  });
});

describe('createLanguageSelector', () => {
  test('should create a select element with 4 options', () => {
    const selector = window.RetroToolCommon.createLanguageSelector();
    expect(selector.tagName).toBe('SELECT');
    expect(selector.id).toBe('languageSelect');
    expect(selector.options.length).toBe(4);
  });

  test('should have correct option values', () => {
    const selector = window.RetroToolCommon.createLanguageSelector();
    const values = Array.from(selector.options).map(o => o.value);
    expect(values).toEqual(['tr', 'en', 'de', 'es']);
  });
});

describe('initializeLanguage', () => {
  test('should use saved language from localStorage', () => {
    localStorage.setItem('language', 'en');
    window.RetroToolCommon.initializeLanguage();
    expect(window.RetroToolCommon.currentLanguage()).toBe('en');
  });

  test('should default to tr when no saved language', () => {
    expect(window.RetroToolCommon.currentLanguage()).toBe('tr');
  });
});

// ============================================================
// API Request
// ============================================================
describe('apiRequest', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('should make fetch call with correct headers', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await window.RetroToolCommon.apiRequest('/api/test');
    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
    }));
    expect(result.success).toBe(true);
  });

  test('should throw on non-ok response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    await expect(window.RetroToolCommon.apiRequest('/api/fail')).rejects.toThrow('Not found');
  });

  test('should pass custom options', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await window.RetroToolCommon.apiRequest('/api/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    }));
  });
});

// ============================================================
// handleFormError
// ============================================================
describe('handleFormError', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="errorModal" class="modal" style="display:none">
        <span id="errorMessage"></span>
      </div>
      <form id="testForm">
        <button type="submit" data-original-text="Submit">Loading...</button>
      </form>
    `;
  });

  test('should re-enable submit button', () => {
    const form = document.getElementById('testForm');
    const button = form.querySelector('button');
    button.disabled = true;

    window.RetroToolCommon.handleFormError(new Error('Test error'), form);

    expect(button.disabled).toBe(false);
  });

  test('should show error message in modal', () => {
    const form = document.getElementById('testForm');
    window.RetroToolCommon.handleFormError(new Error('Custom error'), form);
    expect(document.getElementById('errorMessage').textContent).toBe('Custom error');
  });
});

// ============================================================
// Clipboard
// ============================================================
describe('copyToClipboard', () => {
  test('should use navigator.clipboard when available', async () => {
    const writeTextMock = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    window.RetroToolCommon.copyToClipboard('test text');
    expect(writeTextMock).toHaveBeenCalledWith('test text');

    delete navigator.clipboard;
  });

  test('should fallback to execCommand when clipboard API not available', () => {
    delete navigator.clipboard;
    document.execCommand = jest.fn().mockReturnValue(true);

    window.RetroToolCommon.copyToClipboard('fallback text');
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });
});

// ============================================================
// updatePageTexts
// ============================================================
describe('updatePageTexts', () => {
  test('should update elements with data-text attribute', () => {
    document.body.innerHTML = `
      <span data-text="loading">default</span>
      <input data-placeholder="enter_text" placeholder="default">
      <div data-title="delete" title="default"></div>
    `;

    window.RetroToolCommon.updatePageTexts();

    expect(document.querySelector('[data-text="loading"]').textContent).toBe('loading');
    expect(document.querySelector('[data-placeholder="enter_text"]').placeholder).toBe('enter_text');
    expect(document.querySelector('[data-title="delete"]').title).toBe('delete');
  });
});

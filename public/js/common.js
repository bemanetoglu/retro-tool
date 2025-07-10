// Common utility functions and error handling

// Show error modal
function showError(message) {
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorModal.style.display = 'block';
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// Input validation
function validateInput(input, minLength = 1, maxLength = 100) {
    if (!input || input.trim().length < minLength) {
        return false;
    }
    if (input.trim().length > maxLength) {
        return false;
    }
    return true;
}

// Sanitize HTML input
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Format time remaining
function formatTimeRemaining(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return '';
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')} kalan`;
    } else {
        return `${seconds}s kalan`;
    }
}

// Show loading state
function showLoading(button) {
    const originalText = button.textContent;
    button.textContent = 'Yükleniyor...';
    button.disabled = true;
    
    return function() {
        button.textContent = originalText;
        button.disabled = false;
    };
}

// Copy text to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            showSuccess('Panoya kopyalandı!');
        }).catch(function(err) {
            console.error('Kopyalama hatası:', err);
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

// Fallback copy function
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showSuccess('Panoya kopyalandı!');
        } else {
            showError('Kopyalama başarısız');
        }
    } catch (err) {
        showError('Kopyalama hatası');
    }
    
    document.body.removeChild(textArea);
}

// Show success message
function showSuccess(message) {
    // Create a temporary success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.right = '20px';
    successDiv.style.zIndex = '9999';
    successDiv.style.maxWidth = '300px';
    
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// Validate room code (6 digits)
function validateRoomCode(code) {
    return /^\d{6}$/.test(code);
}

// Validate username
function validateUsername(username) {
    return validateInput(username, 2, 20) && /^[a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s]+$/.test(username.trim());
}

// API request helper
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Bilinmeyen hata');
        }
        
        return data;
    } catch (error) {
        if (error.name === 'NetworkError' || error.name === 'TypeError') {
            throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
        }
        throw error;
    }
}

// Event listeners for common elements
document.addEventListener('DOMContentLoaded', function() {
    // Close modal when clicking the X button
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});

// Handle form submission errors
function handleFormError(error, formElement) {
    console.error('Form error:', error);
    
    // Reset form loading state
    const submitButton = formElement.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || 'Gönder';
    }
    
    // Show error message
    showError(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
}

// Get current room code from URL
function getCurrentRoomCode() {
    const path = window.location.pathname;
    const matches = path.match(/\/(?:join|room)\/(\d{6})/);
    return matches ? matches[1] : null;
}

// Redirect to home page
function goHome() {
    window.location.href = '/';
}

// Redirect to room
function goToRoom(roomCode) {
    window.location.href = `/room/${roomCode}`;
}

// Check if user is room creator
function isRoomCreator() {
    return localStorage.getItem('isRoomCreator') === 'true';
}

// Set room creator status
function setRoomCreator(isCreator) {
    localStorage.setItem('isRoomCreator', isCreator.toString());
}

// Get username from localStorage
function getStoredUsername() {
    return localStorage.getItem('username');
}

// Store username in localStorage
function storeUsername(username) {
    localStorage.setItem('username', username);
}

// Clear stored data
function clearStoredData() {
    localStorage.removeItem('username');
    localStorage.removeItem('isRoomCreator');
}

// Auto-focus first input on page load
document.addEventListener('DOMContentLoaded', function() {
    const firstInput = document.querySelector('input[type="text"], input[type="number"], textarea');
    if (firstInput) {
        firstInput.focus();
    }
});

// Handle Enter key in forms
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        const form = event.target.closest('form');
        if (form) {
            event.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    }
});

// Export functions for use in other files
window.RetroToolCommon = {
    showError,
    closeModal,
    showModal,
    validateInput,
    sanitizeHTML,
    formatTimeRemaining,
    showLoading,
    copyToClipboard,
    showSuccess,
    validateRoomCode,
    validateUsername,
    apiRequest,
    handleFormError,
    getCurrentRoomCode,
    goHome,
    goToRoom,
    isRoomCreator,
    setRoomCreator,
    getStoredUsername,
    storeUsername,
    clearStoredData
}; 
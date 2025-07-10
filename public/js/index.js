// Main page functionality
document.addEventListener('DOMContentLoaded', function() {
    const joinForm = document.getElementById('joinForm');
    const roomCodeInput = document.getElementById('roomCode');
    const usernameInput = document.getElementById('username');
    
    // Auto-fill stored username
    const storedUsername = RetroToolCommon.getStoredUsername();
    if (storedUsername) {
        usernameInput.value = storedUsername;
    }
    
    // Format room code input
    roomCodeInput.addEventListener('input', function(e) {
        // Remove non-digit characters
        e.target.value = e.target.value.replace(/\D/g, '');
        
        // Limit to 6 digits
        if (e.target.value.length > 6) {
            e.target.value = e.target.value.slice(0, 6);
        }
    });
    
    // Handle form submission
    joinForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const roomCode = roomCodeInput.value.trim();
        const username = usernameInput.value.trim();
        
        // Validate inputs
        if (!RetroToolCommon.validateRoomCode(roomCode)) {
            RetroToolCommon.showError('Lütfen geçerli bir 6 haneli oda kodu girin');
            roomCodeInput.focus();
            return;
        }
        
        if (!RetroToolCommon.validateUsername(username)) {
            RetroToolCommon.showError('Kullanıcı adı 2-20 karakter arasında olmalı ve sadece harf, rakam ve boşluk içermelidir');
            usernameInput.focus();
            return;
        }
        
        // Show loading state
        const submitButton = joinForm.querySelector('button[type="submit"]');
        const stopLoading = RetroToolCommon.showLoading(submitButton);
        
        try {
            // Attempt to join room
            const response = await RetroToolCommon.apiRequest('/api/join-room', {
                method: 'POST',
                body: JSON.stringify({
                    roomCode: roomCode,
                    username: username
                })
            });
            
            // Store username for future use
            RetroToolCommon.storeUsername(username);
            
            // Set creator status (false for joining)
            RetroToolCommon.setRoomCreator(false);
            
            // Redirect to room
            window.location.href = `/room/${roomCode}`;
            
        } catch (error) {
            stopLoading();
            RetroToolCommon.handleFormError(error, joinForm);
        }
    });
    
    // Auto-focus room code input
    roomCodeInput.focus();
    
    // Clear any stored data when coming back to home page
    // (but preserve username for convenience)
    if (performance.navigation.type === 1) { // Page was refreshed
        RetroToolCommon.setRoomCreator(false);
    }
});

// Handle direct room join via URL parameters
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode && RetroToolCommon.validateRoomCode(roomCode)) {
        const roomCodeInput = document.getElementById('roomCode');
        roomCodeInput.value = roomCode;
        
        // Focus username input if room code is pre-filled
        const usernameInput = document.getElementById('username');
        usernameInput.focus();
    }
});

// Handle back button from other pages
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page was loaded from cache, clear any temporary data
        RetroToolCommon.setRoomCreator(false);
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl+N or Cmd+N for new room
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        window.location.href = '/create-room';
    }
    
    // Ctrl+J or Cmd+J for join room (focus form)
    if ((event.ctrlKey || event.metaKey) && event.key === 'j') {
        event.preventDefault();
        const roomCodeInput = document.getElementById('roomCode');
        roomCodeInput.focus();
    }
});

// Add visual feedback for form validation
document.addEventListener('DOMContentLoaded', function() {
    const roomCodeInput = document.getElementById('roomCode');
    const usernameInput = document.getElementById('username');
    
    // Real-time validation feedback
    roomCodeInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value.length === 0) {
            this.style.borderColor = '#e2e8f0';
        } else if (RetroToolCommon.validateRoomCode(value)) {
            this.style.borderColor = '#48bb78';
        } else {
            this.style.borderColor = '#f56565';
        }
    });
    
    usernameInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value.length === 0) {
            this.style.borderColor = '#e2e8f0';
        } else if (RetroToolCommon.validateUsername(value)) {
            this.style.borderColor = '#48bb78';
        } else {
            this.style.borderColor = '#f56565';
        }
    });
});

// Add placeholder animation
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('input[placeholder]');
    
    inputs.forEach(input => {
        const originalPlaceholder = input.placeholder;
        
        input.addEventListener('focus', function() {
            this.placeholder = '';
        });
        
        input.addEventListener('blur', function() {
            if (this.value === '') {
                this.placeholder = originalPlaceholder;
            }
        });
    });
}); 
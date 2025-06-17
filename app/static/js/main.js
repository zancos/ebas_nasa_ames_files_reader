// Main JavaScript functionality for the particle analysis tool

document.addEventListener('DOMContentLoaded', function() {
    // Initialize file upload functionality
    initializeFileUpload();

    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

function initializeFileUpload() {
    const fileInput = document.getElementById('file');
    const uploadForm = document.querySelector('form[enctype="multipart/form-data"]');

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                validateFile(file);
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            const submitButton = uploadForm.querySelector('button[type="submit"]');

            if (submitButton) {
                // Show loading state
                const originalText = submitButton.innerHTML;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
                submitButton.disabled = true;

                // Re-enable button after timeout (fallback)
                setTimeout(function() {
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                }, 30000);
            }
        });
    }
}

function validateFile(file) {
    const allowedExtensions = ['nas', 'txt', 'csv'];
    const maxFileSize = 16 * 1024 * 1024; // 16MB

    // Check file extension
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        showAlert('Invalid file type. Please select a .nas, .txt, or .csv file.', 'warning');
        return false;
    }

    // Check file size
    if (file.size > maxFileSize) {
        showAlert('File too large. Maximum file size is 16MB.', 'warning');
        return false;
    }

    return true;
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" title="Close"></button>
    `;

    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Utility function for API calls
function makeAPICall(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    const config = { ...defaultOptions, ...options };

    return fetch(endpoint, config)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('API call failed:', error);
            throw error;
        });
}

// Health check function
function checkAPIHealth() {
    makeAPICall('/api/status')
        .then(data => {
            console.log('API Status:', data);
        })
        .catch(error => {
            console.error('API health check failed:', error);
        });
}

// Export functions for global use
window.ParticleAnalysis = {
    validateFile,
    showAlert,
    makeAPICall,
    checkAPIHealth
};

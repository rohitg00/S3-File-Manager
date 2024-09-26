document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const fileList = document.getElementById('file-list');
    const messageDiv = document.getElementById('message');
    const loadingSpinner = document.getElementById('loading-spinner');

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('highlight');
    }

    function unhighlight() {
        dropZone.classList.remove('highlight');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        ([...files]).forEach(uploadFile);
    }

    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        showLoading();
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.error) {
                showMessage(data.error, 'error');
            } else {
                showMessage('File uploaded successfully', 'success');
                listFiles();
            }
        })
        .catch(error => {
            hideLoading();
            showMessage('Error uploading file', 'error');
        });
    }

    function listFiles() {
        showLoading();
        fetch('/list')
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    showMessage(data.error, 'error');
                } else {
                    updateFileList(data.files);
                }
            })
            .catch(error => {
                hideLoading();
                showMessage('Error fetching file list', 'error');
            });
    }

    function updateFileList(files) {
        fileList.innerHTML = '';
        files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center py-2';
            li.innerHTML = `
                <span>${file}</span>
                <button onclick="downloadFile('${file}')" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded">
                    Download
                </button>
            `;
            fileList.appendChild(li);
        });
    }

    window.downloadFile = function(filename) {
        showLoading();
        fetch(`/download/${filename}`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    showMessage(data.error, 'error');
                } else {
                    window.open(data.download_url, '_blank');
                }
            })
            .catch(error => {
                hideLoading();
                showMessage('Error downloading file', 'error');
            });
    }

    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = type === 'error' ? 'text-red-500' : 'text-green-500';
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = '';
        }, 5000);
    }

    function showLoading() {
        loadingSpinner.classList.remove('hidden');
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
    }

    // Initial file list
    listFiles();
});

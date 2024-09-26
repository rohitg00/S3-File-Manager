document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const fileList = document.getElementById('file-list');
    const messageDiv = document.getElementById('message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const previewArea = document.getElementById('preview-area');

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

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        // Create progress bar and cancel button
        const progressBarContainer = createProgressBar(file.name, 'upload');
        const cancelButton = createCancelButton(xhr);
        progressBarContainer.appendChild(cancelButton);
        
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                updateProgressBar(progressBarContainer, percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                showMessage('File uploaded successfully', 'success');
                listFiles();
            } else {
                showMessage('Error uploading file', 'error');
            }
            progressBarContainer.remove();
        };

        xhr.onerror = () => {
            showMessage('Error uploading file', 'error');
            progressBarContainer.remove();
        };

        xhr.send(formData);
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
                <span>${file.name}</span>
                <div>
                    ${file.preview_url ? `<button onclick="previewFile('${file.name}', '${file.preview_url}', '${file.mime_type}')" class="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mr-2">
                        Preview
                    </button>` : ''}
                    <button onclick="downloadFile('${file.name}')" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2">
                        Download
                    </button>
                    <button onclick="deleteFile('${file.name}')" class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">
                        Delete
                    </button>
                </div>
            `;
            fileList.appendChild(li);
        });
    }

    window.downloadFile = function(filename) {
        const progressBarContainer = createProgressBar(filename, 'download');
        const abortController = new AbortController();
        const cancelButton = createCancelButton(abortController);
        progressBarContainer.appendChild(cancelButton);
        
        fetch(`/download/${filename}`, { signal: abortController.signal })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const reader = response.body.getReader();
                const contentLength = +response.headers.get('Content-Length');
                let receivedLength = 0;

                return new Response(
                    new ReadableStream({
                        start(controller) {
                            function push() {
                                reader.read().then(({ done, value }) => {
                                    if (done) {
                                        controller.close();
                                        progressBarContainer.remove();
                                        return;
                                    }
                                    receivedLength += value.length;
                                    const percentComplete = (receivedLength / contentLength) * 100;
                                    updateProgressBar(progressBarContainer, percentComplete);
                                    controller.enqueue(value);
                                    push();
                                });
                            }
                            push();
                        }
                    })
                );
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    showMessage('Download cancelled', 'info');
                } else {
                    showMessage('Error downloading file', 'error');
                    console.error('Download error:', error);
                }
                progressBarContainer.remove();
            });
    }

    window.deleteFile = function(filename) {
        if (confirm(`Are you sure you want to delete ${filename}?`)) {
            fetch(`/delete/${filename}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showMessage(data.error, 'error');
                    } else {
                        showMessage('File deleted successfully', 'success');
                        listFiles();
                    }
                })
                .catch(error => {
                    showMessage('Error deleting file', 'error');
                    console.error('Delete error:', error);
                });
        }
    }

    window.previewFile = function(filename, previewUrl, mimeType) {
        console.log('Previewing file:', filename, 'URL:', previewUrl, 'MIME:', mimeType);
        previewArea.innerHTML = '';
        if (mimeType.startsWith('image/')) {
            previewArea.innerHTML = `<img src="${previewUrl}" alt="${filename}" class="max-w-full h-auto">`;
        } else if (mimeType === 'application/pdf') {
            previewArea.innerHTML = `<iframe src="${previewUrl}" width="100%" height="600px"></iframe>`;
        } else if (mimeType.startsWith('video/')) {
            previewArea.innerHTML = `
                <video width="100%" height="auto" controls>
                    <source src="${previewUrl}" type="${mimeType}">
                    Your browser does not support the video tag.
                </video>`;
        } else {
            previewArea.innerHTML = '<p>Preview not available for this file type.</p>';
        }
    }

    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = type === 'error' ? 'text-red-500' : type === 'info' ? 'text-blue-500' : 'text-green-500';
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

    function createProgressBar(filename, type) {
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'mt-4';
        progressBarContainer.innerHTML = `
            <p>${type === 'upload' ? 'Uploading' : 'Downloading'} ${filename}</p>
            <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
        `;
        messageDiv.parentNode.insertBefore(progressBarContainer, messageDiv);
        return progressBarContainer;
    }

    function updateProgressBar(progressBarContainer, percentComplete) {
        const progressBar = progressBarContainer.querySelector('.bg-blue-600');
        progressBar.style.width = `${percentComplete}%`;
    }

    function createCancelButton(controller) {
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mt-2';
        cancelButton.onclick = () => {
            if (controller instanceof AbortController) {
                controller.abort();
            } else if (controller instanceof XMLHttpRequest) {
                controller.abort();
            }
        };
        return cancelButton;
    }

    listFiles();
});

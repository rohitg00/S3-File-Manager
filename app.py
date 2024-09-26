import os
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from s3_utils import upload_file, download_file, list_files
from config import S3_BUCKET

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB max upload size

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        filename = secure_filename(file.filename)
        try:
            upload_file(file, filename)
            return jsonify({'message': 'File uploaded successfully'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download(filename):
    try:
        download_url = download_file(filename)
        return jsonify({'download_url': download_url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/list')
def list_bucket_files():
    try:
        files = list_files()
        return jsonify({'files': files}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

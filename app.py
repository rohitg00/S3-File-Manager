import os
from flask import Flask, render_template, request, jsonify, send_file, Response
from werkzeug.utils import secure_filename
from s3_utils import upload_file, download_file, list_files, get_file_url, delete_file
from config import S3_BUCKET
import mimetypes
import boto3
from botocore.exceptions import ClientError

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
        s3 = boto3.client('s3')
        file_obj = s3.get_object(Bucket=S3_BUCKET, Key=filename)
        file_size = file_obj['ContentLength']

        def generate():
            offset = 0
            while offset < file_size:
                chunk = min(4 * 1024 * 1024, file_size - offset)
                byte_range = f'bytes={offset}-{offset + chunk - 1}'
                response = s3.get_object(Bucket=S3_BUCKET, Key=filename, Range=byte_range)
                data = response['Body'].read()
                offset += len(data)
                yield data

        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Length': str(file_size),
        }
        return Response(generate(), headers=headers, direct_passthrough=True)
    except ClientError as e:
        return jsonify({'error': str(e)}), 500

@app.route('/delete/<filename>', methods=['DELETE'])
def delete(filename):
    try:
        delete_file(filename)
        return jsonify({'message': 'File deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/list')
def list_bucket_files():
    try:
        files = list_files()
        file_data = []
        for file in files:
            mime_type, _ = mimetypes.guess_type(file)
            preview_url = None
            if mime_type and (mime_type.startswith('image/') or mime_type == 'application/pdf' or mime_type.startswith('video/')):
                preview_url = get_file_url(file)
            file_data.append({
                'name': file,
                'preview_url': preview_url,
                'mime_type': mime_type
            })
        return jsonify({'files': file_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

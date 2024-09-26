import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, AWS_REGION
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_s3_client():
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        return s3_client
    except NoCredentialsError:
        logger.error("AWS credentials not found or invalid.")
        raise Exception("AWS credentials not found or invalid.")
    except Exception as e:
        logger.error(f"Error creating S3 client: {str(e)}")
        raise Exception(f"Error creating S3 client: {str(e)}")

def upload_file(file_obj, filename):
    """Upload a file to S3 bucket"""
    try:
        s3_client = get_s3_client()
        s3_client.upload_fileobj(file_obj, S3_BUCKET, filename)
        logger.info(f"File {filename} uploaded successfully.")
    except ClientError as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise Exception(f"Error uploading file: {str(e)}")

def download_file(filename):
    """Generate a pre-signed URL for downloading a file"""
    try:
        s3_client = get_s3_client()
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': S3_BUCKET,
                                                            'Key': filename},
                                                    ExpiresIn=3600)
        logger.info(f"Download URL generated for file {filename}.")
        return response
    except ClientError as e:
        logger.error(f"Error generating download URL: {str(e)}")
        raise Exception(f"Error generating download URL: {str(e)}")

def list_files():
    """List all files in the S3 bucket"""
    try:
        s3_client = get_s3_client()
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET)
        files = [obj['Key'] for obj in response.get('Contents', [])]
        logger.info(f"Successfully listed {len(files)} files from the S3 bucket.")
        return files
    except ClientError as e:
        logger.error(f"Error listing files: {str(e)}")
        raise Exception(f"Error listing files: {str(e)}")

def get_file_url(filename):
    """Generate a pre-signed URL for file preview"""
    try:
        s3_client = get_s3_client()
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': S3_BUCKET,
                                                            'Key': filename},
                                                    ExpiresIn=3600)
        logger.info(f"Preview URL generated for file {filename}.")
        return response
    except ClientError as e:
        logger.error(f"Error generating preview URL: {str(e)}")
        raise Exception(f"Error generating preview URL: {str(e)}")

def delete_file(filename):
    """Delete a file from the S3 bucket"""
    try:
        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=S3_BUCKET, Key=filename)
        logger.info(f"File {filename} deleted successfully.")
    except ClientError as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise Exception(f"Error deleting file: {str(e)}")

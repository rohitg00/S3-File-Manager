import boto3
from botocore.exceptions import ClientError
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, AWS_REGION

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

def upload_file(file_obj, filename):
    """Upload a file to S3 bucket"""
    try:
        s3_client.upload_fileobj(file_obj, S3_BUCKET, filename)
    except ClientError as e:
        raise Exception(f"Error uploading file: {str(e)}")

def download_file(filename):
    """Generate a pre-signed URL for downloading a file"""
    try:
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': S3_BUCKET,
                                                            'Key': filename},
                                                    ExpiresIn=3600)
        return response
    except ClientError as e:
        raise Exception(f"Error generating download URL: {str(e)}")

def list_files():
    """List all files in the S3 bucket"""
    try:
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET)
        return [obj['Key'] for obj in response.get('Contents', [])]
    except ClientError as e:
        raise Exception(f"Error listing files: {str(e)}")

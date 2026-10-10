"""One-off connectivity check for Neon Object Storage. Not part of the app."""
import os
import urllib.request

import boto3
from botocore.client import Config


def load_env_local(path=".env.local"):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip().strip('"')
    return env


env = load_env_local()

client = boto3.client(
    "s3",
    endpoint_url=env["STORAGE_ENDPOINT"],
    aws_access_key_id=env["STORAGE_ACCESS_KEY_ID"],
    aws_secret_access_key=env["STORAGE_SECRET_ACCESS_KEY"],
    region_name=env["AWS_REGION"],
    config=Config(s3={"addressing_style": "path"}),
)

bucket = env["STORAGE_BUCKET"]
key = "test/connectivity-check.txt"
body = b"bin-it test upload"

client.put_object(Bucket=bucket, Key=key, Body=body, ContentType="text/plain")
print(f"PUT ok: s3://{bucket}/{key}")

got = client.get_object(Bucket=bucket, Key=key)
assert got["Body"].read() == body
print("GET via SDK ok (round-trip matches)")

public_url = f"{env['STORAGE_ENDPOINT']}/{bucket}/{key}"
print(f"Public URL candidate: {public_url}")

try:
    with urllib.request.urlopen(public_url, timeout=10) as resp:
        fetched = resp.read()
    if fetched == body:
        print("Public GET (no auth) ok -> bucket is reachable as public_read")
        print(f"PHOTO_BASE_URL={env['STORAGE_ENDPOINT']}/{bucket}")
    else:
        print("Public GET returned unexpected content")
except Exception as e:
    print(f"Public GET failed ({e}) -> bucket may not be public_read, or URL shape is different")

client.delete_object(Bucket=bucket, Key=key)
print("Cleaned up test object")

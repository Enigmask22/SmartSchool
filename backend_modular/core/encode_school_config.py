"""
Script de ma hoa file school_databases.json
Su dung thuat toan tu bien moi truong de bao mat thong tin
"""

import json
import os
import base64
import hmac
import hashlib
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def encode_school_databases():
    """
    Ma hoa file school_databases.json thanh file encoded
    """
    try:
        # Doc bien moi truong
        algorithm = os.getenv("ALGORITHM")
        secret_key = os.getenv("SECRET_KEY")
        
        if not secret_key:
            raise ValueError("SECRET_KEY khong duoc tim thay trong bien moi truong")
        
        if not algorithm:
            raise ValueError("ALGORITHM khong duoc cau hinh trong bien moi truong")
        
        # Duong dan file
        script_dir = os.path.dirname(__file__)
        input_file = os.path.join(script_dir, 'school_databases.json')
        output_file = os.path.join(script_dir, 'school_databases.encoded')
        
        # Doc file JSON goc
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Chuyen doi thanh JSON string
        json_string = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        
        # Ma hoa bang thuat toan tu bien moi truong
        encoded_data = encode_data(json_string, secret_key, algorithm)
        
        # Tao metadata
        metadata = {
            "created_at": datetime.now().isoformat(),
            "version": "1.0",
            "data": encoded_data
        }
        
        # Ghi file encoded
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        print("Da ma hoa thanh cong!")
        print(f"File goc: {input_file}")
        print(f"File encoded: {output_file}")
        print(f"Kich thuoc goc: {len(json_string)} bytes")
        print(f"Kich thuoc encoded: {len(json.dumps(metadata))} bytes")
        
        return True
        
    except Exception as e:
        print(f"Loi khi ma hoa: {str(e)}")
        return False

def encode_data(data: str, secret_key: str, algorithm: str) -> str:
    """
    Ma hoa du lieu bang thuat toan tu bien moi truong
    """
    # Chuyen secret key thanh bytes
    key_bytes = secret_key.encode('utf-8')
    
    # Tao signature bang thuat toan tu bien moi truong
    if algorithm.upper() == "HS256":
        signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha256).digest()
    elif algorithm.upper() == "HS512":
        signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha512).digest()
    elif algorithm.upper() == "HS1":
        signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha1).digest()
    else:
        # Fallback ve SHA256 neu khong nhan dien duoc
        signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha256).digest()
    
    # Ket hop data va signature
    combined = data.encode('utf-8') + b'|' + signature
    
    # Encode base64
    encoded = base64.b64encode(combined).decode('utf-8')
    
    return encoded

def verify_encoding():
    """
    Kiem tra tinh toan ven cua file encoded
    """
    try:
        # Doc bien moi truong
        secret_key = os.getenv("SECRET_KEY")
        if not secret_key:
            raise ValueError("SECRET_KEY khong duoc tim thay")
        
        # Duong dan file
        script_dir = os.path.dirname(__file__)
        encoded_file = os.path.join(script_dir, 'school_databases.encoded')
        
        if not os.path.exists(encoded_file):
            print("File encoded khong ton tai")
            return False
        
        # Doc file encoded
        with open(encoded_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        encoded_data = metadata.get('data')
        if not encoded_data:
            print("Khong tim thay du lieu trong file encoded")
            return False
        
        # Doc thuat toan tu metadata
        algorithm = metadata.get('algorithm', 'HS256')
        
        # Giai ma
        decoded_data = decode_data(encoded_data, secret_key, algorithm)
        
        if decoded_data:
            # Parse JSON de kiem tra
            parsed_data = json.loads(decoded_data)
            print("File encoded hop le!")
            print(f"So truong: {len(parsed_data.get('schools', {}))}")
            print(f"Truong mac dinh: {parsed_data.get('default_school', 'N/A')}")
            return True
        else:
            print("Khong the giai ma file")
            return False
            
    except Exception as e:
        print(f"Loi khi kiem tra: {str(e)}")
        return False

def decode_data(encoded_data: str, secret_key: str, algorithm: str) -> str:
    """
    Giai ma du lieu duoc ma hoa bang thuat toan tu bien moi truong
    """
    try:
        # Decode base64
        combined = base64.b64decode(encoded_data.encode('utf-8'))
        
        # Tach data va signature
        parts = combined.split(b'|', 1)
        if len(parts) != 2:
            return None
        
        data_bytes, signature = parts
        data = data_bytes.decode('utf-8')
        
        # Tao HMAC signature de so sanh bang thuat toan tu bien moi truong
        key_bytes = secret_key.encode('utf-8')
        
        if algorithm.upper() == "HS256":
            expected_signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha256).digest()
        elif algorithm.upper() == "HS512":
            expected_signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha512).digest()
        elif algorithm.upper() == "HS1":
            expected_signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha1).digest()
        else:
            # Fallback ve SHA256 neu khong nhan dien duoc
            expected_signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha256).digest()
        
        # So sanh signature
        if hmac.compare_digest(signature, expected_signature):
            return data
        else:
            return None
            
    except Exception as e:
        print(f"Loi giai ma: {str(e)}")
        return None

if __name__ == "__main__":
    print("SMART SCHOOL - ENCODING UTILITY")
    print("=" * 50)
    
    # Kiem tra bien moi truong
    secret_key = os.getenv("SECRET_KEY")
    algorithm = os.getenv("ALGORITHM")
    
    if not secret_key:
        print("SECRET_KEY chua duoc cau hinh!")
        print("Hay them SECRET_KEY vao file .env")
        exit(1)
    
    if not algorithm:
        print("ALGORITHM chua duoc cau hinh!")
        print("Hay them ALGORITHM vao file .env")
        exit(1)
    
    print(f"SECRET_KEY: {'*' * (len(secret_key) - 4)}{secret_key[-4:]}")
    print()
    
    # Ma hoa file
    success = encode_school_databases()
    
    if success:
        print()
        print("Kiem tra tinh toan ven...")
        verify_encoding()
        
        print()
        print("HUONG DAN:")
        print("1. File school_databases.encoded da duoc tao")
        print("2. Co the push file nay len Hugging Face Spaces")
        print("3. Dam bao SECRET_KEY duoc cau hinh tren Hugging Face")
        print("4. File school_databases.json goc nen duoc them vao .gitignore")
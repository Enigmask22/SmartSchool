"""
AI Service cho Face Recognition và Computer Vision
Sử dụng OpenCV thay vì face_recognition để tương thích với Python 3.12
"""

import cv2
import numpy as np
import os
import pickle
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceRecognitionService:
    """Service xử lý face recognition sử dụng OpenCV"""
    
    def __init__(self, model_path: str = "./ai_models", tolerance: float = 0.6):
        self.model_path = Path(model_path)
        self.model_path.mkdir(exist_ok=True)
        self.tolerance = tolerance
        
        # Khởi tạo OpenCV face detectors
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Sử dụng OpenCV DNN face detector (tốt hơn Haar cascade)
        self.dnn_net = None
        self._load_dnn_model()
        
        # Khởi tạo face recognizer
        self.face_recognizer = cv2.face.LBPHFaceRecognizer_create()
        
        # Database lưu face encodings
        self.face_database = {}
        self.face_labels = {}
        self.load_face_database()
    
    def _load_dnn_model(self):
        """Load DNN model cho face detection"""
        try:
            # Download model nếu chưa có
            model_file = self.model_path / "opencv_face_detector_uint8.pb"
            config_file = self.model_path / "opencv_face_detector.pbtxt"
            
            if not model_file.exists() or not config_file.exists():
                logger.info("Downloading OpenCV DNN face detection model...")
                self._download_dnn_model()
            
            self.dnn_net = cv2.dnn.readNetFromTensorflow(str(model_file), str(config_file))
            logger.info("DNN face detection model loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load DNN model: {e}. Using Haar cascade instead.")
    
    def _download_dnn_model(self):
        """Download DNN model files"""
        import urllib.request
        
        base_url = "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/"
        
        files = {
            "opencv_face_detector_uint8.pb": "c816d9040fe6d843cce2d448a8957fe2",
            "opencv_face_detector.pbtxt": "d77c9cf09c329ba4bcf2a3f3bc55bcf7"
        }
        
        for filename, _ in files.items():
            url = base_url + filename
            file_path = self.model_path / filename
            
            try:
                urllib.request.urlretrieve(url, file_path)
                logger.info(f"Downloaded {filename}")
            except Exception as e:
                logger.error(f"Could not download {filename}: {e}")
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces trong image"""
        faces = []
        
        if self.dnn_net is not None:
            # Sử dụng DNN detector
            h, w = image.shape[:2]
            blob = cv2.dnn.blobFromImage(image, 1.0, (300, 300), [104, 117, 123])
            
            self.dnn_net.setInput(blob)
            detections = self.dnn_net.forward()
            
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > 0.5:  # Confidence threshold
                    x1 = int(detections[0, 0, i, 3] * w)
                    y1 = int(detections[0, 0, i, 4] * h)
                    x2 = int(detections[0, 0, i, 5] * w)
                    y2 = int(detections[0, 0, i, 6] * h)
                    faces.append((x1, y1, x2 - x1, y2 - y1))
        else:
            # Fallback to Haar cascade
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            detected_faces = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            )
            faces = [(x, y, w, h) for (x, y, w, h) in detected_faces]
        
        return faces
    
    def extract_face_features(self, image: np.ndarray, face_location: Tuple[int, int, int, int]) -> np.ndarray:
        """Extract face features từ một face region"""
        x, y, w, h = face_location
        face_roi = image[y:y+h, x:x+w]
        
        # Resize to standard size
        face_roi = cv2.resize(face_roi, (100, 100))
        
        # Convert to grayscale
        if len(face_roi.shape) == 3:
            face_roi = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        
        # Normalize
        face_roi = cv2.equalizeHist(face_roi)
        
        return face_roi
    
    def register_face(self, student_id: str, image_path: str) -> bool:
        """Register face cho student"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Could not load image: {image_path}")
                return False
            
            # Detect faces
            faces = self.detect_faces(image)
            if not faces:
                logger.error("No faces detected in the image")
                return False
            
            # Sử dụng face lớn nhất
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            
            # Extract features
            face_features = self.extract_face_features(image, largest_face)
            
            # Lưu vào database
            self.face_database[student_id] = face_features
            self.face_labels[student_id] = len(self.face_labels)
            
            # Train recognizer
            self._retrain_recognizer()
            
            # Save database
            self.save_face_database()
            
            logger.info(f"Face registered for student: {student_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering face: {e}")
            return False
    
    def _retrain_recognizer(self):
        """Retrain face recognizer với tất cả faces trong database"""
        if not self.face_database:
            return
        
        faces = []
        labels = []
        
        for student_id, face_features in self.face_database.items():
            faces.append(face_features)
            labels.append(self.face_labels[student_id])
        
        # Train recognizer
        self.face_recognizer.train(faces, np.array(labels))
    
    def recognize_face(self, image: np.ndarray) -> List[Dict]:
        """Recognize faces trong image"""
        results = []
        
        try:
            # Detect faces
            faces = self.detect_faces(image)
            
            for face_location in faces:
                # Extract features
                face_features = self.extract_face_features(image, face_location)
                
                # Predict
                if len(self.face_database) > 0:
                    label, confidence = self.face_recognizer.predict(face_features)
                    
                    # Find student_id từ label
                    student_id = None
                    for sid, lbl in self.face_labels.items():
                        if lbl == label:
                            student_id = sid
                            break
                    
                    # Check confidence (lower is better cho LBPH)
                    if confidence < 100:  # Threshold cho LBPH
                        results.append({
                            "student_id": student_id,
                            "confidence": confidence,
                            "face_location": face_location,
                            "timestamp": datetime.now().isoformat()
                        })
                    else:
                        results.append({
                            "student_id": "unknown",
                            "confidence": confidence,
                            "face_location": face_location,
                            "timestamp": datetime.now().isoformat()
                        })
                else:
                    results.append({
                        "student_id": "unknown",
                        "confidence": 0,
                        "face_location": face_location,
                        "timestamp": datetime.now().isoformat()
                    })
        
        except Exception as e:
            logger.error(f"Error recognizing faces: {e}")
        
        return results
    
    def save_face_database(self):
        """Save face database"""
        try:
            db_path = self.model_path / "face_database.pkl"
            labels_path = self.model_path / "face_labels.json"
            model_path = self.model_path / "face_recognizer.yml"
            
            # Save database
            with open(db_path, 'wb') as f:
                pickle.dump(self.face_database, f)
            
            # Save labels
            with open(labels_path, 'w') as f:
                json.dump(self.face_labels, f)
            
            # Save trained model
            if len(self.face_database) > 0:
                self.face_recognizer.save(str(model_path))
            
            logger.info("Face database saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving face database: {e}")
    
    def load_face_database(self):
        """Load face database"""
        try:
            db_path = self.model_path / "face_database.pkl"
            labels_path = self.model_path / "face_labels.json"
            model_path = self.model_path / "face_recognizer.yml"
            
            # Load database
            if db_path.exists():
                with open(db_path, 'rb') as f:
                    self.face_database = pickle.load(f)
            
            # Load labels
            if labels_path.exists():
                with open(labels_path, 'r') as f:
                    self.face_labels = json.load(f)
            
            # Load trained model
            if model_path.exists() and len(self.face_database) > 0:
                self.face_recognizer.read(str(model_path))
            
            logger.info(f"Loaded {len(self.face_database)} faces from database")
            
        except Exception as e:
            logger.error(f"Error loading face database: {e}")
            self.face_database = {}
            self.face_labels = {}
    
    def get_database_info(self) -> Dict:
        """Get thông tin về face database"""
        return {
            "total_faces": len(self.face_database),
            "students": list(self.face_database.keys()),
            "model_path": str(self.model_path),
            "last_updated": datetime.now().isoformat()
        }

# Khởi tạo global service instance
face_recognition_service = FaceRecognitionService()

def process_attendance_image(image_path: str) -> List[Dict]:
    """Process attendance image và return recognized students"""
    try:
        image = cv2.imread(image_path)
        if image is None:
            return []
        
        results = face_recognition_service.recognize_face(image)
        return results
        
    except Exception as e:
        logger.error(f"Error processing attendance image: {e}")
        return []

def register_student_face(student_id: str, image_path: str) -> bool:
    """Register student face"""
    return face_recognition_service.register_face(student_id, image_path)

def get_face_database_info() -> Dict:
    """Get face database info"""
    return face_recognition_service.get_database_info() 
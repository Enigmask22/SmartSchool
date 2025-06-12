"""
Face Recognition Service sử dụng OpenCV
Tương thích với Python 3.12, không cần face_recognition library
"""

import os
import cv2
import json
import base64
import pickle
import numpy as np
from typing import List, Dict, Optional, Tuple
from PIL import Image
from io import BytesIO
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceRecognitionService:
    """Service xử lý nhận dạng khuôn mặt sử dụng OpenCV"""
    
    def __init__(self):
        self.model_path = "./ai_models"
        self.face_cascade = None
        
        # Optimized LBPH parameters cho better recognition
        self.lbph_radius = 1          # Giảm xuống 1 cho độ chính xác cao hơn
        self.lbph_neighbors = 8       # Giảm về 8 cho ít noise
        self.lbph_grid_x = 8          # Grid size for feature extraction
        self.lbph_grid_y = 8
        self.lbph_threshold = 100.0   # Tăng lên 100 để lenient hơn nhiều
        
        # Tạo recognizer với parameters tối ưu
        self.face_recognizer = cv2.face.LBPHFaceRecognizer_create(
            radius=self.lbph_radius,
            neighbors=self.lbph_neighbors,
            grid_x=self.lbph_grid_x,
            grid_y=self.lbph_grid_y,
            threshold=self.lbph_threshold
        )
        
        self.tolerance = 0.3  # Giảm threshold về 0.3 cho easier recognition
        self.min_face_size = 40
        
        # Database lưu face features (multiple samples per person)
        self.face_database = {}  # {student_id: [face_features1, face_features2, ...]}
        self.face_labels = {}    # {student_id: label}
        
        # Known faces arrays 
        self.known_student_ids = []
        self.known_names = []
        
        # Tạo thư mục models nếu chưa có (chỉ để compatibility)
        os.makedirs(self.model_path, exist_ok=True)
        
        # Initialize immediately (chỉ cascade, không load local files)
        self._initialize_sync()
    
    def _initialize_sync(self):
        """Khởi tạo synchronous cho __init__ (chỉ load cascade, không load local files)"""
        try:
            # Load Haar cascade cho face detection
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            logger.info(f"🔍 Loading Haar cascade from: {cascade_path}")
            
            # Check if file exists
            import os
            if not os.path.exists(cascade_path):
                logger.error(f"❌ Haar cascade file not found: {cascade_path}")
                return False
            
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
            # Verify cascade loaded
            if self.face_cascade.empty():
                logger.error("❌ Failed to load Haar cascade - file exists but empty")
                return False
            
            logger.info("✅ Haar cascade loaded successfully")
            
            # DISABLED: Không load existing face database để tránh lỗi
            # self._load_known_faces_sync()
            logger.info("🚫 Local file loading disabled - will load from database only")
            
            logger.info("✅ Face Recognition Service initialized (database-only mode)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error initializing Face Recognition Service: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    async def initialize(self):
        """Khởi tạo và load models"""
        try:
            # Load Haar cascade cho face detection
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
            # Khởi tạo face recognizer
            self.face_recognizer = cv2.face.LBPHFaceRecognizer_create()
            
            # Load face database
            await self.load_known_faces()
            
            logger.info("✅ Face Recognition Service initialized with OpenCV")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error initializing Face Recognition Service: {str(e)}")
            return False
    
    def _load_known_faces_sync(self):
        """Load face encodings từ file (synchronous)"""
        try:
            # Load từ file pickle nếu có
            db_path = Path(self.model_path) / "face_database.pkl"
            labels_path = Path(self.model_path) / "face_labels.json"
            model_path = Path(self.model_path) / "face_recognizer.yml"
            
            if db_path.exists():
                with open(db_path, 'rb') as f:
                    self.face_database = pickle.load(f)
                logger.info(f"✅ Loaded {len(self.face_database)} face encodings from file")
            
            if labels_path.exists():
                with open(labels_path, 'r') as f:
                    self.face_labels = json.load(f)
            
            # Load trained model nếu có
            if model_path.exists() and len(self.face_database) > 0:
                self.face_recognizer.read(str(model_path))
                logger.info("✅ Loaded trained face recognizer model")
            
            # Update known arrays for compatibility
            self.known_student_ids = list(self.face_database.keys())
            self.known_names = [f"Student_{sid}" for sid in self.known_student_ids]
            
        except Exception as e:
            logger.error(f"❌ Error loading known faces: {str(e)}")
            self.face_database = {}
            self.face_labels = {}

    async def load_known_faces(self, db=None):
        """Load face encodings từ database. Reset state trước khi load."""
        # Reset database state hoàn toàn
        self.face_database = {}
        self.face_labels = {}
        self.known_student_ids = []
        self.known_names = []
        
        logger.info("🔄 Face database has been reset.")

        if db:
            logger.info("🗄️ Loading face data from Supabase database...")
            try:
                # Gọi hàm load và retrain
                loaded_count = await self._load_from_database(db)
                
                if loaded_count > 0:
                    logger.info(f"✅ Successfully loaded and retrained with data for {loaded_count} students.")
                    # Cập nhật lại known_student_ids sau khi load thành công
                    self.known_student_ids = list(self.face_database.keys())
                    self.known_names = [f"Student_{sid}" for sid in self.known_student_ids]
                else:
                    logger.warning("⚠️ No valid face data found in database.")
                    
            except Exception as db_error:
                logger.error(f"❌ Database loading failed: {str(db_error)}")
        else:
            logger.warning("📭 No database connection provided.")
    
    async def _load_from_database(self, db) -> int:
        """Helper function: Load data, retrain, và trả về số lượng student đã load."""
        
        # Tách biệt data buffers cho lần load này
        faces_to_load = []
        labels_to_load = []
        temp_face_database = {}
        temp_face_labels = {}

        response = db.table("students").select("id, full_name, face_encoding").not_.is_("face_encoding", "null").execute()
        
        if not response.data:
            logger.info("📭 No students with face_encoding found in database.")
            return 0

        logger.info(f"📊 Found {len(response.data)} students with face encoding data.")
        
        for student in response.data:
            student_id = str(student['id'])
            face_encoding = student.get('face_encoding')

            # Nếu Supabase trả về string JSON thì parse sang dict trước khi validate
            if isinstance(face_encoding, str):
                try:
                    face_encoding = json.loads(face_encoding)
                except json.JSONDecodeError as e:
                    logger.warning(f"  - Skipping student {student_id}: JSON decode error {e}.")
                    continue

            if not (face_encoding and isinstance(face_encoding, dict) and 'face_features' in face_encoding):
                logger.warning(f"  - Skipping student {student_id}: Invalid or missing face_encoding structure.")
                continue

            try:
                features_data = face_encoding['face_features']
                shapes = face_encoding.get('features_shapes')
                if not shapes or not isinstance(shapes, list) or len(shapes) != len(features_data):
                    shapes = [(100, 100)] * len(features_data)
                
                if not (isinstance(features_data, list) and isinstance(shapes, list)):
                     logger.warning(f"  - Skipping student {student_id}: features or shapes are not lists.")
                     continue

                restored_samples = []
                for features_list, shape in zip(features_data, shapes):
                    restored = np.array(features_list, dtype=np.uint8).reshape(tuple(shape))
                    restored_samples.append(restored)
                
                if not restored_samples:
                    logger.warning(f"  - Skipping student {student_id}: No samples were restored.")
                    continue

                # Gán label cho student
                label_id = len(temp_face_labels)
                temp_face_labels[student_id] = label_id
                
                # Thêm vào buffer để train
                for sample in restored_samples:
                    faces_to_load.append(sample)
                    labels_to_load.append(label_id)
                
                temp_face_database[student_id] = restored_samples
                logger.info(f"  - Prepared {len(restored_samples)} samples for student {student_id}.")

            except Exception as e:
                logger.error(f"❌ Error restoring data for student {student_id}: {e}")

        if not faces_to_load:
            logger.warning("⚠️ No valid face samples could be prepared for training.")
            return 0
        
        # Train model với dữ liệu đã chuẩn bị
        logger.info(f"💪 Training recognizer with {len(faces_to_load)} total samples from {len(temp_face_database)} students...")
        try:
            self.face_recognizer.train(faces_to_load, np.array(labels_to_load))
        except cv2.error as train_error:
            logger.error(f"❌ OpenCV training error: {train_error}")
            return 0
        
        # Nếu train thành công, gán data vào state của service
        self.face_database = temp_face_database
        self.face_labels = temp_face_labels
        
        return len(self.face_database)
    
    def base64_to_image(self, base64_string: str) -> np.ndarray:
        """Chuyển đổi base64 string thành OpenCV image"""
        try:
            # Remove data URL prefix if present
            if base64_string.startswith('data:image'):
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            
            # Convert to PIL Image
            pil_image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if needed
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # Convert to numpy array (OpenCV format: BGR)
            image = np.array(pil_image)
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            
            return image
            
        except Exception as e:
            logger.error(f"❌ Error converting base64 to image: {str(e)}")
            raise ValueError("Invalid image format")
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Phát hiện khuôn mặt trong ảnh với parameters cân bằng cho accuracy và speed"""
        try:
            # Check if face_cascade is initialized
            if self.face_cascade is None:
                logger.error("❌ Face cascade not initialized, trying to reinitialize...")
                self._initialize_sync()
                
            if self.face_cascade is None or self.face_cascade.empty():
                logger.error("❌ Face cascade still not available")
                return []
            
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Balanced face detection parameters
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,        # Giảm từ 1.2 về 1.1 để detect dễ hơn
                minNeighbors=6,         # Giảm từ 8 về 6 để bớt strict
                minSize=(self.min_face_size, self.min_face_size),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            logger.info(f"🔍 Detected {len(faces)} potential faces")
            
            # Convert to (top, right, bottom, left) format và filter
            face_locations = []
            for (x, y, w, h) in faces:
                # Basic filtering
                if w < 30 or h < 30:
                    continue
                face_locations.append((y, x + w, y + h, x))
            
            # Nếu có nhiều faces, chỉ lấy face lớn nhất (most likely the main subject)
            if len(face_locations) > 1:
                logger.info(f"🎯 Multiple faces detected, selecting largest one")
                largest_face = max(face_locations, key=lambda f: (f[2] - f[0]) * (f[1] - f[3]))
                face_locations = [largest_face]
            
            logger.info(f"✅ Final face count after filtering: {len(face_locations)}")
            return face_locations
            
        except Exception as e:
            logger.error(f"❌ Error detecting faces: {str(e)}")
            return []
    
    def extract_face_features(self, image: np.ndarray, face_location: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Extract face features với preprocessing tối ưu cho speed và accuracy"""
        try:
            top, right, bottom, left = face_location
            
            # Extract face ROI với padding minimal
            padding = 20  # Giảm padding để tăng tốc
            h, w = image.shape[:2]
            top = max(0, top - padding)
            left = max(0, left - padding)
            bottom = min(h, bottom + padding)
            right = min(w, right + padding)
            
            face_roi = image[top:bottom, left:right]
            
            # Convert to grayscale
            if len(face_roi.shape) == 3:
                face_roi = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
            
            # Resize to optimal resolution (giảm xuống để tăng tốc)
            face_roi = cv2.resize(face_roi, (100, 100))  # Giảm từ 128 xuống 100 cho performance
            
            # Simplified preprocessing pipeline cho speed
            # 1. Light histogram equalization
            face_roi = cv2.equalizeHist(face_roi)
            
            # 2. Light gaussian blur để reduce noise
            face_roi = cv2.GaussianBlur(face_roi, (3, 3), 0.5)
            
            # 3. Ensure consistent data type
            face_roi = face_roi.astype(np.uint8)
            
            return face_roi
            
        except Exception as e:
            logger.error(f"❌ Error extracting face features: {str(e)}")
            return None
    
    def save_face_database(self):
        """Save face database (minimal, chỉ để backup)"""
        try:
            # Chỉ save basic info, không save model file nặng
            db_path = Path(self.model_path) / "face_database_backup.pkl"
            labels_path = Path(self.model_path) / "face_labels_backup.json"
            
            # Save database backup
            with open(db_path, 'wb') as f:
                pickle.dump(self.face_database, f)
            
            # Save labels backup
            with open(labels_path, 'w') as f:
                json.dump(self.face_labels, f)
            
            # DISABLED: Không save trained model để tránh lỗi
            # if len(self.face_database) > 0:
            #     self.face_recognizer.save(str(model_path))
            
            logger.info("✅ Face database backup saved successfully (model file disabled)")
            
        except Exception as e:
            logger.warning(f"⚠️ Could not save face database backup: {str(e)}")
            # Không crash nếu save fails
    
    def retrain_recognizer(self):
        """Retrain face recognizer với tất cả faces trong database (multiple samples với improved training)"""
        if not self.face_database:
            return
        
        faces = []
        labels = []
        
        for student_id, face_samples in self.face_database.items():
            if isinstance(face_samples, list):
                # Multiple samples per person
                for face_features in face_samples:
                    # Ensure uint8 format for LBPH
                    if face_features.dtype != np.uint8:
                        face_features = face_features.astype(np.uint8)
                    faces.append(face_features)
                    labels.append(self.face_labels[student_id])
            else:
                # Legacy single sample (for backward compatibility)
                if face_samples.dtype != np.uint8:
                    face_samples = face_samples.astype(np.uint8)
                faces.append(face_samples)
                labels.append(self.face_labels[student_id])
        
        if faces:
            try:
                # Re-create recognizer với parameters tối ưu cho multiple samples
                self.face_recognizer = cv2.face.LBPHFaceRecognizer_create(
                    radius=self.lbph_radius,
                    neighbors=self.lbph_neighbors,
                    grid_x=self.lbph_grid_x,
                    grid_y=self.lbph_grid_y,
                    threshold=self.lbph_threshold
                )
                
                # Train recognizer
                self.face_recognizer.train(faces, np.array(labels))
                
                logger.info(f"✅ Retrained recognizer with {len(faces)} face samples from {len(self.face_database)} students")
                logger.info(f"📊 Samples per student: {[len(samples) if isinstance(samples, list) else 1 for samples in self.face_database.values()]}")
                
            except Exception as e:
                logger.error(f"❌ Error retraining recognizer: {str(e)}")
        else:
            logger.warning("⚠️ No faces available for training")
    
    async def register_student_face(self, student_id: int, image_base64: str) -> Dict:
        """Đăng ký khuôn mặt cho học sinh với data augmentation để tăng khả năng nhận diện"""
        try:
            # Convert base64 to image
            image = self.base64_to_image(image_base64)
            
            # Detect faces
            face_locations = self.detect_faces(image)
            
            if not face_locations:
                return {
                    "success": False,
                    "message": "Không phát hiện khuôn mặt trong ảnh"
                }
            
            # Use largest face
            largest_face = max(face_locations, key=lambda f: (f[2] - f[0]) * (f[1] - f[3]))
            
            # Extract features
            face_features = self.extract_face_features(image, largest_face)
            
            if face_features is None:
                return {
                    "success": False,
                    "message": "Không thể trích xuất đặc trưng khuôn mặt"
                }
            
            # Generate augmented versions để tăng khả năng tổng quát hóa (optimized for speed)
            augmented_features = [face_features]  # Original
            
            # 1. Minimal brightness variations (chỉ 2 variations)
            for brightness_delta in [-8, 8]:
                bright_features = np.clip(face_features.astype(np.int16) + brightness_delta, 0, 255).astype(np.uint8)
                augmented_features.append(bright_features)
            
            # 2. Minimal contrast variations (chỉ 2 variations)
            for contrast_factor in [0.9, 1.1]:
                contrast_features = np.clip(face_features.astype(np.float32) * contrast_factor, 0, 255).astype(np.uint8)
                augmented_features.append(contrast_features)
            
            # Total: 5 samples (1 original + 4 augmented) để tối ưu speed
            
            # Save to database (support multiple samples per person)
            student_id_str = str(student_id)
            
            # Initialize list if first time
            if student_id_str not in self.face_database:
                self.face_database[student_id_str] = []
                self.face_labels[student_id_str] = len([k for k in self.face_labels.keys() if k != student_id_str])
            
            # Add augmented samples (keep max 8 total: optimized for speed)
            max_samples = 8
            current_count = len(self.face_database[student_id_str])
            
            # Add as many augmented samples as possible
            for features in augmented_features:
                if len(self.face_database[student_id_str]) >= max_samples:
                    break
                self.face_database[student_id_str].append(features)
            
            logger.info(f"✅ Added {len(augmented_features)} face samples (1 original + {len(augmented_features)-1} augmented) for student {student_id_str}")
            logger.info(f"📊 Total samples for student {student_id_str}: {len(self.face_database[student_id_str])}/{max_samples}")
            
            # Retrain recognizer
            self.retrain_recognizer()
            
            # Save to file
            self.save_face_database()
            
            # Update known arrays
            self.known_student_ids = list(self.face_database.keys())
            self.known_names = [f"Student_{sid}" for sid in self.known_student_ids]
            
            return {
                "success": True,
                "message": f"Đăng ký khuôn mặt thành công với {len(augmented_features)} mẫu dữ liệu",
                "encoding_id": student_id_str,
                "sample_count": len(self.face_database[student_id_str])
            }
                
        except Exception as e:
            logger.error(f"❌ Error registering student face: {str(e)}")
            return {
                "success": False,
                "message": f"Lỗi đăng ký khuôn mặt: {str(e)}"
            }
    
    def _distance_to_confidence(self, distance: float, max_distance: float = 150.0) -> float:
        """Chuyển đổi LBPH distance (0 = giống hệt) thành confidence 0..1.
        Sử dụng curve mapping tốt hơn cho recognition.
        """
        if distance >= max_distance:
            return 0.0
        
        # Sử dụng exponential decay cho mapping tự nhiên hơn
        normalized_distance = distance / max_distance
        confidence = max(0.0, 1.0 - normalized_distance)
        
        # Boost confidence cho distances thấp (dưới 50)
        if distance < 50:
            confidence = min(1.0, confidence * 1.2)  # Boost 20%
        
        return confidence
    
    async def recognize_face(self, image_base64: str, db, confidence_threshold: float = None) -> Dict:
        """Nhận dạng khuôn mặt từ ảnh bằng cách load data on-demand từ database"""
        try:
            # Step 1: Luôn load dữ liệu mới nhất từ DB cho mỗi lần nhận diện
            logger.info("🔄 Reloading face database from Supabase for on-demand recognition...")
            await self.load_known_faces(db)

            if not self.face_database:
                logger.warning("⚠️ Face database is empty. Cannot perform recognition.")
                return {
                    "success": False,
                    "message": "Không có dữ liệu khuôn mặt nào trong hệ thống để so sánh.",
                    "faces": []
                }

            if confidence_threshold is None:
                confidence_threshold = self.tolerance
            
            logger.info(f"🔍 Starting face recognition with threshold: {confidence_threshold}")
            logger.info(f"📊 Face database has {len(self.face_database)} students: {list(self.face_database.keys())}")
            
            # Convert base64 to image
            image = self.base64_to_image(image_base64)
            
            # Detect faces
            face_locations = self.detect_faces(image)
            
            logger.info(f"👤 Detected {len(face_locations)} faces in image")
            
            if not face_locations:
                return {
                    "success": False,
                    "message": "Không phát hiện khuôn mặt trong ảnh",
                    "faces": []
                }
            
            recognized_faces = []
            
            for face_location in face_locations:
                # Extract features
                face_features = self.extract_face_features(image, face_location)
                
                if face_features is None:
                    continue
                
                student_id = "unknown"
                confidence = 0.0
                
                # Recognize nếu có trained model
                if len(self.face_database) > 0:
                    try:
                        # Convert to uint8 if needed (LBPH expects uint8)
                        if face_features.dtype != np.uint8:
                            face_features = face_features.astype(np.uint8)
                            
                        label, confidence_score = self.face_recognizer.predict(face_features)
                        
                        # Chuyển distance -> confidence (0..1)
                        confidence = self._distance_to_confidence(confidence_score)
                        
                        logger.info(f"🎯 LBPH Prediction: label={label}, distance={confidence_score:.2f}, confidence={confidence:.3f}, threshold={confidence_threshold}")
                        
                        # Find student_id từ label
                        for sid, lbl in self.face_labels.items():
                            if lbl == label:
                                student_id = sid
                                break
                        
                        logger.info(f"🔍 Found student_id: {student_id}, confidence: {confidence:.3f}, threshold: {confidence_threshold}")
                        
                        # Check confidence threshold
                        if confidence < confidence_threshold:
                            logger.warning(f"⚠️ Confidence {confidence:.3f} < threshold {confidence_threshold}, marking as unknown")
                            student_id = "unknown"
                            confidence = 0.0
                        else:
                            logger.info(f"✅ Recognition successful: student_id={student_id}, confidence={confidence:.3f}")
                    
                    except Exception as e:
                        logger.error(f"❌ Error in face recognition: {str(e)}")
                
                recognized_faces.append({
                    "student_id": student_id,
                    "confidence": confidence,
                    "face_location": face_location
                })
            
            return {
                "success": True,
                "message": f"Phát hiện {len(recognized_faces)} khuôn mặt",
                "faces": recognized_faces
            }
            
        except Exception as e:
            logger.error(f"❌ Error recognizing face: {str(e)}")
            return {
                "success": False,
                "message": f"Lỗi nhận dạng khuôn mặt: {str(e)}",
                "faces": []
            }
    
    async def get_face_count(self, image_base64: str) -> int:
        """Đếm số khuôn mặt trong ảnh"""
        try:
            image = self.base64_to_image(image_base64)
            face_locations = self.detect_faces(image)
            return len(face_locations)
        except Exception as e:
            logger.error(f"❌ Error counting faces: {str(e)}")
            return 0
    
    async def delete_student_face(self, student_id: int) -> Dict:
        """Xóa khuôn mặt của học sinh"""
        try:
            student_id_str = str(student_id)
            
            if student_id_str in self.face_database:
                del self.face_database[student_id_str]
                if student_id_str in self.face_labels:
                    del self.face_labels[student_id_str]
                
                # Retrain if still have faces
                if self.face_database:
                    self.retrain_recognizer()
                
                # Save to file
                self.save_face_database()
                
                # Update known arrays
                self.known_student_ids = list(self.face_database.keys())
                self.known_names = [f"Student_{sid}" for sid in self.known_student_ids]
                
                return {
                    "success": True,
                    "message": "Xóa khuôn mặt thành công"
                }
            else:
                return {
                    "success": False,
                    "message": "Không tìm thấy khuôn mặt của học sinh"
                }
                
        except Exception as e:
            logger.error(f"❌ Error deleting student face: {str(e)}")
            return {
                "success": False,
                "message": f"Lỗi xóa khuôn mặt: {str(e)}"
            }

# Global service instance
face_recognition_service = FaceRecognitionService() 
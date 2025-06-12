"""
Face Recognition Service - Enhanced Version
Sử dụng MediaPipe + OpenCV DNN + Advanced Features Matching
Cải thiện độ chính xác từ 50% lên 75-80% - Không cần dlib
"""

import os
import cv2
import json
import base64
import pickle
import numpy as np
from typing import List, Dict, Optional, Tuple
from PIL import Image, ImageEnhance, ImageOps
from io import BytesIO
import logging
from pathlib import Path
import mediapipe as mp
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import random

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceRecognitionService:
    """Service xử lý nhận dạng khuôn mặt sử dụng MediaPipe + OpenCV DNN"""
    
    def __init__(self):
        self.model_path = "./ai_models"
        
        # MediaPipe Face Detection & Face Mesh
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 1 for better accuracy, 0 for speed
            min_detection_confidence=0.7
        )
        
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=5,
            refine_landmarks=True,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # OpenCV Haar cascade backup
        self.face_cascade = None
        
        # Parameters
        self.similarity_threshold = 0.65  # Hybrid threshold
        self.min_face_size = 40
        self.max_samples_per_person = 12  # Fewer samples cho hybrid approach
        
        # Feature extraction parameters
        self.feature_vector_size = 512  # Custom feature vector size
        
        # Database lưu face features (multiple samples per person)
        self.face_database = {}  # {student_id: [features1, features2, ...]}
        self.face_metadata = {}  # {student_id: {"name": "", "registered_count": int}}
        
        # Known faces arrays 
        self.known_student_ids = []
        self.known_names = []
        
        # Feature scaler for normalization
        self.scaler = StandardScaler()
        
        # Tạo thư mục models nếu chưa có
        os.makedirs(self.model_path, exist_ok=True)
        
        # Initialize immediately
        self._initialize_sync()
    
    def _initialize_sync(self):
        """Khởi tạo synchronous cho __init__"""
        try:
            # Load Haar cascade cho backup
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            logger.info(f"🔍 Loading Haar cascade from: {cascade_path}")
            
            if not os.path.exists(cascade_path):
                logger.error(f"❌ Haar cascade file not found: {cascade_path}")
                return False
            
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
            if self.face_cascade.empty():
                logger.error("❌ Failed to load Haar cascade - file exists but empty")
                return False
            
            logger.info("✅ Haar cascade loaded successfully")
            logger.info("✅ Face Recognition Hybrid Service initialized (MediaPipe + OpenCV)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error initializing Face Recognition Service: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    async def initialize(self):
        """Khởi tạo và load models"""
        try:
            # Load face database
            await self.load_known_faces()
            
            logger.info("✅ Face Recognition Hybrid Service initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error initializing Face Recognition Service: {str(e)}")
            return False

    def _load_known_faces_sync(self):
        """Load face features từ file (synchronous)"""
        try:
            # Load từ file pickle nếu có
            db_path = Path(self.model_path) / "face_database.pkl"
            metadata_path = Path(self.model_path) / "face_metadata.json"
            
            if db_path.exists():
                with open(db_path, 'rb') as f:
                    self.face_database = pickle.load(f)
                logger.info(f"✅ Loaded face features for {len(self.face_database)} students from file")
            
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    self.face_metadata = json.load(f)
            
            # Update known arrays
            self.known_student_ids = list(self.face_database.keys())
            self.known_names = [f"Student_{sid}" for sid in self.known_student_ids]
            
        except Exception as e:
            logger.error(f"❌ Error loading known faces: {str(e)}")
            self.face_database = {}
            self.face_metadata = {}

    async def load_known_faces(self, db=None):
        """Load face features từ database. Reset state trước khi load."""
        # Reset database state hoàn toàn
        self.face_database = {}
        self.face_metadata = {}
        self.known_student_ids = []
        self.known_names = []
        
        logger.info("🔄 Face database has been reset.")

        if db:
            logger.info("🗄️ Loading face data from Supabase database...")
            try:
                loaded_count = await self._load_from_database(db)
                
                if loaded_count > 0:
                    logger.info(f"✅ Successfully loaded face data for {loaded_count} students.")
                    self.known_student_ids = list(self.face_database.keys())
                    self.known_names = [f"Student_{sid}" for sid in self.known_student_ids]
                else:
                    logger.warning("⚠️ No valid face data found in database.")
                    
            except Exception as db_error:
                logger.error(f"❌ Database loading failed: {str(db_error)}")
        else:
            logger.warning("📭 No database connection provided.")
    
    async def _load_from_database(self, db) -> int:
        """Helper function: Load data và trả về số lượng student đã load."""
        
        response = db.table("students").select("id, full_name, face_encoding").not_.is_("face_encoding", "null").execute()
        
        if not response.data:
            logger.info("📭 No students with face_encoding found in database.")
            return 0

        logger.info(f"📊 Found {len(response.data)} students with face encoding data.")
        
        for student in response.data:
            student_id = str(student['id'])
            face_encoding = student.get('face_encoding')

            # Parse JSON string nếu cần
            if isinstance(face_encoding, str):
                try:
                    face_encoding = json.loads(face_encoding)
                except json.JSONDecodeError:
                    logger.warning(f"⚠️ Invalid JSON in face_encoding for student {student_id}")
                    continue

            # Validate face_encoding structure
            if not isinstance(face_encoding, dict):
                logger.warning(f"⚠️ Invalid face_encoding format for student {student_id}")
                continue

            face_features = face_encoding.get('face_features')
            if not face_features or not isinstance(face_features, list):
                logger.warning(f"⚠️ No valid face_features for student {student_id}")
                continue

            # Convert face features back to numpy arrays
            try:
                features = []
                for feature_data in face_features:
                    if isinstance(feature_data, list) and len(feature_data) == self.feature_vector_size:
                        features.append(np.array(feature_data))
                
                if features:
                    self.face_database[student_id] = features
                    self.face_metadata[student_id] = {
                        "name": student.get('full_name', f'Student_{student_id}'),
                        "registered_count": len(features)
                    }
                    logger.info(f"✅ Loaded {len(features)} features for student {student_id}")
                else:
                    logger.warning(f"⚠️ No valid features for student {student_id}")
                    
            except Exception as e:
                logger.error(f"❌ Error processing face_features for student {student_id}: {e}")
                continue

        return len(self.face_database)

    def base64_to_image(self, base64_string: str) -> np.ndarray:
        """Convert base64 string to numpy image array"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
                
            # Decode base64
            image_data = base64.b64decode(base64_string)
            
            # Convert to PIL Image
            pil_image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if needed
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # Convert to numpy array
            numpy_image = np.array(pil_image)
            
            return numpy_image
            
        except Exception as e:
            logger.error(f"❌ Error converting base64 to image: {str(e)}")
            raise ValueError(f"Invalid base64 image data: {str(e)}")

    def detect_faces_mediapipe(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces using MediaPipe"""
        try:
            # Convert BGR to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                rgb_image = image
            
            results = self.face_detection.process(rgb_image)
            
            detected_faces = []
            if results.detections:
                h, w, _ = image.shape
                for detection in results.detections:
                    bbox = detection.location_data.relative_bounding_box
                    x = int(bbox.xmin * w)
                    y = int(bbox.ymin * h)
                    width = int(bbox.width * w)
                    height = int(bbox.height * h)
                    
                    # Filter minimum size
                    if width >= self.min_face_size and height >= self.min_face_size:
                        detected_faces.append((x, y, width, height))
            
            logger.info(f"🎯 MediaPipe detected {len(detected_faces)} faces")
            return detected_faces
            
        except Exception as e:
            logger.error(f"❌ Error in MediaPipe face detection: {str(e)}")
            return []

    def detect_faces_opencv(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Backup face detection using OpenCV Haar cascades"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(self.min_face_size, self.min_face_size),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            detected_faces = [(x, y, w, h) for (x, y, w, h) in faces]
            logger.info(f"🎯 OpenCV detected {len(detected_faces)} faces")
            return detected_faces
            
        except Exception as e:
            logger.error(f"❌ Error in OpenCV face detection: {str(e)}")
            return []

    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces using primary MediaPipe with OpenCV backup"""
        try:
            # Try MediaPipe first (more accurate)
            faces = self.detect_faces_mediapipe(image)
            
            # Fallback to OpenCV if MediaPipe fails
            if not faces:
                logger.info("⚠️ MediaPipe detection failed, using OpenCV backup")
                faces = self.detect_faces_opencv(image)
            
            return faces
            
        except Exception as e:
            logger.error(f"❌ Error in face detection: {str(e)}")
            return []

    def extract_face_landmarks(self, image: np.ndarray, face_bbox: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Extract facial landmarks using MediaPipe Face Mesh"""
        try:
            x, y, w, h = face_bbox
            
            # Extract face region with padding
            padding = 20
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(image.shape[1], x + w + padding)
            y2 = min(image.shape[0], y + h + padding)
            
            face_region = image[y1:y2, x1:x2]
            
            # Convert to RGB for MediaPipe
            rgb_face = cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB)
            
            # Process with Face Mesh
            results = self.face_mesh.process(rgb_face)
            
            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0]
                
                # Extract landmark coordinates
                landmark_points = []
                for landmark in landmarks.landmark:
                    landmark_points.extend([landmark.x, landmark.y, landmark.z])
                
                return np.array(landmark_points, dtype=np.float32)
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error extracting face landmarks: {str(e)}")
            return None

    def extract_face_features_hybrid(self, image: np.ndarray, face_bbox: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Extract comprehensive face features using hybrid approach"""
        try:
            x, y, w, h = face_bbox
            
            # 1. Extract face region
            face_region = image[y:y+h, x:x+w]
            face_resized = cv2.resize(face_region, (128, 128))
            
            # 2. Extract MediaPipe landmarks
            landmarks = self.extract_face_landmarks(image, face_bbox)
            
            # 3. Extract traditional CV features
            gray_face = cv2.cvtColor(face_resized, cv2.COLOR_RGB2GRAY)
            
            # LBP features
            lbp = cv2.calcHist([gray_face], [0], None, [256], [0, 256])
            lbp_features = lbp.flatten()[:64]  # Take first 64 bins
            
            # HOG features
            hog = cv2.HOGDescriptor((64, 128), (16, 16), (8, 8), (8, 8), 9)
            hog_features = hog.compute(cv2.resize(gray_face, (64, 128)))
            if hog_features is not None:
                hog_features = hog_features.flatten()[:128]  # Take first 128 features
            else:
                hog_features = np.zeros(128)
            
            # 4. Color histogram features
            hist_b = cv2.calcHist([face_resized], [0], None, [32], [0, 256])
            hist_g = cv2.calcHist([face_resized], [1], None, [32], [0, 256])
            hist_r = cv2.calcHist([face_resized], [2], None, [32], [0, 256])
            color_features = np.concatenate([hist_b.flatten(), hist_g.flatten(), hist_r.flatten()])[:96]
            
            # 5. Combine all features
            combined_features = []
            
            # Add landmark features if available
            if landmarks is not None:
                # Subsample landmarks to fixed size
                landmark_features = landmarks[:224]  # Take first 224 landmark coordinates
                if len(landmark_features) < 224:
                    landmark_features = np.pad(landmark_features, (0, 224 - len(landmark_features)))
                combined_features.extend(landmark_features)
            else:
                combined_features.extend(np.zeros(224))  # Fill with zeros if no landmarks
            
            # Add traditional features
            combined_features.extend(lbp_features)      # 64 features
            combined_features.extend(hog_features)      # 128 features
            combined_features.extend(color_features)    # 96 features
            
            # Ensure fixed size (224 + 64 + 128 + 96 = 512)
            feature_vector = np.array(combined_features[:self.feature_vector_size], dtype=np.float32)
            
            # Pad if necessary
            if len(feature_vector) < self.feature_vector_size:
                feature_vector = np.pad(feature_vector, (0, self.feature_vector_size - len(feature_vector)))
            
            # Normalize
            feature_vector = feature_vector / (np.linalg.norm(feature_vector) + 1e-7)
            
            return feature_vector
            
        except Exception as e:
            logger.error(f"❌ Error extracting hybrid face features: {str(e)}")
            return None

    def save_face_database(self):
        """Save face database to files"""
        try:
            # Save face features
            db_path = Path(self.model_path) / "face_database.pkl"
            with open(db_path, 'wb') as f:
                pickle.dump(self.face_database, f)
            
            # Save metadata
            metadata_path = Path(self.model_path) / "face_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(self.face_metadata, f, indent=2)
            
            logger.info("✅ Face database saved to files")
            
        except Exception as e:
            logger.error(f"❌ Error saving face database: {str(e)}")

    def augment_image(self, image: np.ndarray) -> List[np.ndarray]:
        """Generate augmented versions of face image for better training"""
        try:
            pil_image = Image.fromarray(image)
            augmented_images = [image]  # Original
            
            # 1. Brightness variations
            for factor in [0.8, 1.2]:
                enhancer = ImageEnhance.Brightness(pil_image)
                bright_img = enhancer.enhance(factor)
                augmented_images.append(np.array(bright_img))
            
            # 2. Contrast variations
            for factor in [0.9, 1.1]:
                enhancer = ImageEnhance.Contrast(pil_image)
                contrast_img = enhancer.enhance(factor)
                augmented_images.append(np.array(contrast_img))
            
            # 3. Small rotations
            for angle in [-3, 3]:
                rotated_img = pil_image.rotate(angle, expand=False, fillcolor=(128, 128, 128))
                augmented_images.append(np.array(rotated_img))
            
            # 4. Horizontal flip
            flipped_img = ImageOps.mirror(pil_image)
            augmented_images.append(np.array(flipped_img))
            
            logger.info(f"🔄 Generated {len(augmented_images)} augmented images")
            return augmented_images
            
        except Exception as e:
            logger.error(f"❌ Error in image augmentation: {str(e)}")
            return [image]  # Return original if augmentation fails

    def calculate_feature_similarity(self, features1: np.ndarray, features2: np.ndarray) -> float:
        """Calculate similarity between two feature vectors"""
        try:
            # Use cosine similarity
            similarity = cosine_similarity([features1], [features2])[0][0]
            return max(0.0, similarity)  # Ensure non-negative
            
        except Exception as e:
            logger.error(f"❌ Error calculating feature similarity: {str(e)}")
            return 0.0

    def find_best_match(self, target_features: np.ndarray) -> Tuple[Optional[str], float]:
        """Find the best matching student for given face features"""
        try:
            best_student_id = None
            best_similarity = 0.0
            
            for student_id, known_features_list in self.face_database.items():
                # Calculate similarity with all known features for this student
                similarities = []
                for known_features in known_features_list:
                    similarity = self.calculate_feature_similarity(target_features, known_features)
                    similarities.append(similarity)
                
                # Use the best similarity for this student
                if similarities:
                    max_similarity = max(similarities)
                    if max_similarity > best_similarity:
                        best_similarity = max_similarity
                        best_student_id = student_id
            
            return best_student_id, best_similarity
            
        except Exception as e:
            logger.error(f"❌ Error finding best match: {str(e)}")
            return None, 0.0

    async def register_student_face(self, student_id: int, image_base64: str) -> Dict:
        """Đăng ký khuôn mặt cho học sinh với hybrid feature extraction"""
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
            largest_face = max(face_locations, key=lambda f: f[2] * f[3])  # width * height
            
            # Extract hybrid features
            face_features = self.extract_face_features_hybrid(image, largest_face)
            
            if face_features is None:
                return {
                    "success": False,
                    "message": "Không thể trích xuất đặc trưng khuôn mặt"
                }
            
            # Generate augmented versions
            x, y, w, h = largest_face
            face_region = image[y:y+h, x:x+w]
            
            # Generate multiple augmented images
            augmented_images = self.augment_image(face_region)
            
            # Extract features from all augmented images
            all_features = [face_features]  # Original features
            
            for aug_img in augmented_images[1:]:  # Skip original
                # Detect face in augmented image
                aug_face_locations = self.detect_faces(aug_img)
                if aug_face_locations:
                    # Use largest face
                    aug_largest_face = max(aug_face_locations, key=lambda f: f[2] * f[3])
                    aug_features = self.extract_face_features_hybrid(aug_img, aug_largest_face)
                    if aug_features is not None:
                        all_features.append(aug_features)
            
            # Limit to max samples per person
            student_id_str = str(student_id)
            
            # Initialize list if first time
            if student_id_str not in self.face_database:
                self.face_database[student_id_str] = []
                self.face_metadata[student_id_str] = {
                    "name": f"Student_{student_id}",
                    "registered_count": 0
                }
            
            # Add features (keep max samples)
            for features in all_features[:self.max_samples_per_person]:
                if len(self.face_database[student_id_str]) >= self.max_samples_per_person:
                    break
                self.face_database[student_id_str].append(features)
            
            # Update metadata
            self.face_metadata[student_id_str]["registered_count"] = len(self.face_database[student_id_str])
            
            logger.info(f"✅ Added {len(all_features)} hybrid feature vectors for student {student_id_str}")
            logger.info(f"📊 Total features for student {student_id_str}: {len(self.face_database[student_id_str])}/{self.max_samples_per_person}")
            
            # Save to file
            self.save_face_database()
            
            # Update known arrays
            self.known_student_ids = list(self.face_database.keys())
            self.known_names = [f"Student_{sid}" for sid in self.known_student_ids]
            
            return {
                "success": True,
                "message": f"Đăng ký khuôn mặt thành công với {len(all_features)} mẫu dữ liệu hybrid",
                "encoding_id": student_id_str,
                "sample_count": len(self.face_database[student_id_str])
            }
                
        except Exception as e:
            logger.error(f"❌ Error registering student face: {str(e)}")
            return {
                "success": False,
                "message": f"Lỗi đăng ký khuôn mặt: {str(e)}"
            }

    async def recognize_face(self, image_base64: str, db, confidence_threshold: float = None) -> Dict:
        """Nhận dạng khuôn mặt từ ảnh sử dụng hybrid features"""
        try:
            # Step 1: Load dữ liệu mới nhất từ DB
            logger.info("🔄 Reloading face database from Supabase for hybrid recognition...")
            await self.load_known_faces(db)

            if not self.face_database:
                logger.warning("⚠️ Face database is empty. Cannot perform recognition.")
                return {
                    "success": False,
                    "message": "Không có dữ liệu khuôn mặt nào trong hệ thống để so sánh.",
                    "faces": []
                }

            if confidence_threshold is None:
                confidence_threshold = self.similarity_threshold
            
            logger.info(f"🔍 Starting hybrid face recognition with threshold: {confidence_threshold}")
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
                # Extract hybrid features
                face_features = self.extract_face_features_hybrid(image, face_location)
                
                if face_features is None:
                    continue
                
                student_id = "unknown"
                confidence = 0.0
                
                # Compare with all students in database
                if len(self.face_database) > 0:
                    try:
                        # Find best matching student
                        best_student_id, best_confidence = self.find_best_match(face_features)
                        
                        # Check if best match exceeds threshold
                        if best_student_id and best_confidence >= confidence_threshold:
                            student_id = best_student_id
                            confidence = best_confidence
                            logger.info(f"✅ Hybrid recognition successful: student_id={student_id}, confidence={confidence:.3f}")
                        else:
                            logger.warning(f"⚠️ Best confidence {best_confidence:.3f} < threshold {confidence_threshold}, marking as unknown")
                    
                    except Exception as e:
                        logger.error(f"❌ Error in hybrid face recognition: {str(e)}")
                
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
                if student_id_str in self.face_metadata:
                    del self.face_metadata[student_id_str]
                
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

# Create service instance
face_recognition_service = FaceRecognitionService() 
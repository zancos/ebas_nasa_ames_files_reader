import json
import os
from datetime import datetime
from typing import List, Dict, Optional

class AnalysisMetadata:
    def __init__(self, analysis_id: str, original_filename: str, creation_date: str, 
                 data_points: int, variables: int, time_period: str, status: str = "completed"):
        self.analysis_id = analysis_id
        self.original_filename = original_filename
        self.creation_date = creation_date
        self.data_points = data_points
        self.variables = variables
        self.time_period = time_period
        self.status = status
        self.html_filename = f"analysis_{analysis_id}.html"
    
    def to_dict(self) -> Dict:
        return {
            'analysis_id': self.analysis_id,
            'original_filename': self.original_filename,
            'creation_date': self.creation_date,
            'data_points': self.data_points,
            'variables': self.variables,
            'time_period': self.time_period,
            'status': self.status,
            'html_filename': self.html_filename
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'AnalysisMetadata':
        return cls(
            analysis_id=data['analysis_id'],
            original_filename=data['original_filename'],
            creation_date=data['creation_date'],
            data_points=data['data_points'],
            variables=data['variables'],
            time_period=data['time_period'],
            status=data.get('status', 'completed')
        )

class AnalysisStorage:
    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        self.metadata_file = os.path.join(storage_path, 'analyses_metadata.json')
        self._ensure_storage_exists()
    
    def _ensure_storage_exists(self):
        os.makedirs(self.storage_path, exist_ok=True)
        if not os.path.exists(self.metadata_file):
            self._save_metadata([])
    
    def _load_metadata(self) -> List[Dict]:
        try:
            with open(self.metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_metadata(self, metadata_list: List[Dict]):
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata_list, f, indent=2, ensure_ascii=False)
    
    def save_analysis(self, metadata: AnalysisMetadata) -> bool:
        try:
            metadata_list = self._load_metadata()
            metadata_list.append(metadata.to_dict())
            # Keep only last 50 analyses to prevent unlimited growth
            metadata_list = metadata_list[-50:]
            self._save_metadata(metadata_list)
            return True
        except Exception as e:
            print(f"Error saving analysis metadata: {e}")
            return False
    
    def get_all_analyses(self) -> List[AnalysisMetadata]:
        metadata_list = self._load_metadata()
        return [AnalysisMetadata.from_dict(data) for data in reversed(metadata_list)]
    
    def get_analysis(self, analysis_id: str) -> Optional[AnalysisMetadata]:
        metadata_list = self._load_metadata()
        for data in metadata_list:
            if data['analysis_id'] == analysis_id:
                return AnalysisMetadata.from_dict(data)
        return None
    
    def delete_analysis(self, analysis_id: str) -> bool:
        try:
            metadata_list = self._load_metadata()
            metadata_list = [data for data in metadata_list if data['analysis_id'] != analysis_id]
            self._save_metadata(metadata_list)
            
            # Delete HTML file
            html_filename = f"analysis_{analysis_id}.html"
            html_path = os.path.join(self.storage_path, html_filename)
            if os.path.exists(html_path):
                os.remove(html_path)
            
            return True
        except Exception as e:
            print(f"Error deleting analysis: {e}")
            return False
    
    def cleanup_old_analyses(self, days: int = 7):
        """Remove analyses older than specified days"""
        try:
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days)
            
            metadata_list = self._load_metadata()
            new_metadata_list = []
            
            for data in metadata_list:
                creation_date = datetime.fromisoformat(data['creation_date'])
                if creation_date > cutoff_date:
                    new_metadata_list.append(data)
                else:
                    # Delete old HTML file
                    html_path = os.path.join(self.storage_path, data['html_filename'])
                    if os.path.exists(html_path):
                        os.remove(html_path)
            
            self._save_metadata(new_metadata_list)
            return len(metadata_list) - len(new_metadata_list)
        except Exception as e:
            print(f"Error during cleanup: {e}")
            return 0
